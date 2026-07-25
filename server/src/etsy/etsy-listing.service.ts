import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EtsyService } from './etsy.service';
import { PaymentsService } from '../payments/payments.service';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import {
  EtsyListing,
  EtsyListingDocument,
} from './schemas/etsy-listing.schema';
import {
  EtsyFeePayment,
  EtsyFeePaymentDocument,
} from './schemas/etsy-fee-payment.schema';
import {
  Product,
  ProductDocument,
  ProductStatus,
} from '../products/schemas/product.schema';
import { User } from '../users/schemas/user.schema';
import {
  SellerBalance,
  BalanceTransaction,
} from '../users/schemas/seller-balance.schema';

// ============================================
// Product → Etsy listing field mapping
// ============================================
// Etsy createDraftListing REQUIRED fields and where we take them from:
//   title        ← product.nameEn (fallback: name), sanitized, max 140 chars
//   description  ← product.descriptionEn (fallback: description)
//                  + dimensions + materials + SoulArt attribution footer
//   price        ← product.price (GEL) + commission% ON TOP → USD via NBG rate
//   quantity     ← countInStock / Σ variants.stock (capped at 999)
//   who_made     ← 'collective' (SoulArt is a collective shop of Georgian artists)
//   when_made    ← '2020_2025' (recent original works)
//   taxonomy_id  ← resolved from subCategoryEn/mainCategoryEn against Etsy's
//                  seller taxonomy tree; falls back to 'Painting'
// Optional fields we also fill:
//   tags         ← product.hashtags (latin-only, ≤20 chars each) + defaults, max 13
//   materials    ← product.materialsEn, max 13
//   images       ← product.images (Cloudinary URLs), first 10, uploaded after draft
// Activation requirements (auto-picked from the shop, cached in settings doc):
//   shipping_profile_id, return_policy_id
// ============================================

const WHO_MADE = 'collective';
const WHEN_MADE = '2020_2025';
// SoulArt's site commission on every sale (matches balance.service.ts:
// 10% standard; the 15% installment rate can't occur on Etsy sales).
// Shown to sellers so their expected earnings are accurate.
const SOULART_COMMISSION_PERCENT = 10;
const MAX_TAGS = 13;
const MAX_MATERIALS = 13;
const MAX_IMAGES = 10;
const MAX_TITLE_LENGTH = 140;
const DEFAULT_TAGS = [
  'georgian art',
  'handmade',
  'original art',
  'wall art',
  'soulart',
];
const FALLBACK_TAXONOMY_KEYWORD = 'Painting';
const TAXONOMY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// BOG checkout ttl is 10 min — a pending payment older than this cannot
// complete anymore, so it's marked expired and the seller may retry
const PENDING_PAYMENT_TTL_MS = 15 * 60 * 1000;
// Stop uploading further images before serverless/callback timeouts hit
const IMAGE_UPLOAD_BUDGET_MS = 40 * 1000;

interface TaxonomyNode {
  id: number;
  name: string;
  children?: TaxonomyNode[];
}

interface FlatTaxonomyNode {
  id: number;
  name: string;
  path: string;
  depth: number;
}

export interface EtsyListingPreview {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  alreadyListed: {
    listingId: string;
    listingUrl?: string;
    state: string;
    warnings: string[];
  } | null;
  listing: {
    title: string;
    description: string;
    quantity: number;
    tags: string[];
    materials: string[];
    taxonomyId: number | null;
    taxonomyPath: string | null;
    imageCount: number;
    whoMade: string;
    whenMade: string;
  };
  pricing: {
    priceGel: number;
    commissionPercent: number;
    priceWithCommissionGel: number;
    usdRate: number;
    priceUsd: number;
    listingFeeGel: number;
    sellerBalanceGel: number | null;
    canPayFromBalance: boolean;
    soulartCommissionPercent: number;
    sellerEarnsGel: number; // what the seller receives when it sells
  };
  // A live card payment for this product: 'pending' (checkout open —
  // blocks new payments until it expires), 'paid' (publishing underway)
  // or 'publish_failed' (fee captured, publish needs a retry)
  pendingPayment: {
    id: string;
    status: string;
    expiresAt: string;
    secondsLeft: number | null;
    error: string | null;
  } | null;
}

export interface PublishOptions {
  // 'balance' (default): deduct the listing fee from the seller's balance.
  // 'external': fee already paid by card (BOG) — skip balance charging.
  feeSource?: 'balance' | 'external';
}

@Injectable()
export class EtsyListingService {
  private readonly logger = new Logger(EtsyListingService.name);

  // Per-instance cache of Etsy's seller taxonomy (large, rarely changes)
  private taxonomyCache: FlatTaxonomyNode[] | null = null;
  private taxonomyCacheAt = 0;

  // Short-lived caches of the shop's first shipping profile / readiness
  // state (processing profile) ids — Etsy refuses physical listings
  // without both, so previews check them before any payment
  private shippingProfileCache: {
    shopId: string;
    id: number | null;
    at: number;
  } | null = null;
  private readinessStateCache: {
    shopId: string;
    id: number | null;
    at: number;
  } | null = null;

  constructor(
    private readonly etsyService: EtsyService,
    private readonly exchangeRateService: ExchangeRateService,
    @InjectModel(EtsyListing.name)
    private readonly etsyListingModel: Model<EtsyListingDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(SellerBalance.name)
    private readonly sellerBalanceModel: Model<SellerBalance>,
    @InjectModel(BalanceTransaction.name)
    private readonly balanceTransactionModel: Model<BalanceTransaction>,
    @InjectModel(EtsyFeePayment.name)
    private readonly etsyFeePaymentModel: Model<EtsyFeePaymentDocument>,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  // ============================================
  // Preview (mapping + pricing, no side effects)
  // ============================================

  async previewListing(
    productId: string,
    requester: { _id: any; role: string },
  ): Promise<EtsyListingPreview> {
    const product = await this.loadProductForRequester(productId, requester);
    const settings = await this.etsyService.getSettings();
    const status = await this.etsyService.getConnectionStatus();
    const usdRate = await this.exchangeRateService.getLatestRate('USD');

    const blockers: string[] = [];
    const warnings: string[] = [];

    // Single feature flag controls the whole Etsy feature; admins can be
    // separately allowed in for testing while it's off for sellers.
    // Impersonated sessions (admin logged in as a user) count as admin.
    const isAdminContext =
      requester.role === 'admin' ||
      Boolean((requester as any).impersonatedBy);
    const featureEnabled =
      settings.integrationEnabled ||
      (isAdminContext && settings.enabledForAdmins);
    if (!featureEnabled) {
      blockers.push('INTEGRATION_DISABLED');
    }
    if (!status.configured) blockers.push('NOT_CONFIGURED');
    if (!status.connected) blockers.push('SHOP_NOT_CONNECTED');
    else if (!status.shopId) blockers.push('NO_ETSY_SHOP');
    else {
      // Etsy rejects physical listings without a shipping profile and a
      // readiness state (processing profile) — catch this BEFORE any money
      // is taken. 'error' (lookup failed) doesn't block; the publish path
      // re-checks with fresh calls anyway.
      const [shippingProfile, readinessState] = await Promise.all([
        this.lookupShippingProfileId(status.shopId),
        this.lookupReadinessStateId(status.shopId),
      ]);
      if (shippingProfile === null) blockers.push('NO_SHIPPING_PROFILE');
      if (readinessState === null) blockers.push('NO_READINESS_STATE');
    }
    if (product.status !== ProductStatus.APPROVED) {
      blockers.push('PRODUCT_NOT_APPROVED');
    }

    const quantity = this.resolveQuantity(product);
    if (quantity < 1) blockers.push('OUT_OF_STOCK');
    if (!product.images?.length) blockers.push('NO_IMAGES');

    const existing = await this.findActiveListing(productId);

    // Sync our stored state with Etsy's live one — the listing may have
    // been activated (or removed) manually in Etsy's Shop Manager
    if (existing) {
      try {
        const live = await this.etsyService.apiRequest<any>(
          'GET',
          `/application/listings/${existing.listingId}`,
        );
        if (live?.state && live.state !== existing.state) {
          this.logger.log(
            `Etsy listing ${existing.listingId} state synced: ${existing.state} → ${live.state}`,
          );
          existing.state = live.state;
          if (live.url) existing.listingUrl = live.url;
          await existing.save();
        }
      } catch {
        // Keep the stored state when Etsy is unreachable
      }
    }

    const title = this.buildTitle(product, warnings);
    const description = this.buildDescription(product, warnings);
    const tags = this.buildTags(product);
    const materials = this.buildMaterials(product);

    let taxonomyId: number | null = null;
    let taxonomyPath: string | null = null;
    try {
      const node = await this.resolveTaxonomy(product);
      taxonomyId = node.id;
      taxonomyPath = node.path;
    } catch (error: any) {
      // Publish is impossible without a taxonomy — this must block BEFORE
      // any money is taken, so it's a blocker, not a warning
      blockers.push('TAXONOMY_UNRESOLVED');
      warnings.push(`taxonomy: ${error.message}`);
    }

    // Pricing: commission goes ON TOP of the seller's price
    const priceGel = product.price;
    const priceWithCommissionGel =
      priceGel * (1 + settings.commissionPercent / 100);
    const priceUsd = this.roundEtsyPrice(priceWithCommissionGel * usdRate);

    // Seller balance — one of two ways to pay the listing fee (the other
    // is a normal BOG card payment), so low balance is NOT a blocker
    const sellerId = (product.user as any)?._id ?? product.user;
    const balanceDoc = await this.sellerBalanceModel
      .findOne({ seller: sellerId })
      .lean()
      .exec();
    const sellerBalanceGel = balanceDoc
      ? Math.round(balanceDoc.totalBalance * 100) / 100
      : 0;
    const canPayFromBalance =
      settings.listingFeeGel <= 0 || sellerBalanceGel >= settings.listingFeeGel;

    // Lazy-expire abandoned card checkouts, then surface any live payment
    // so the FE can show its status and a countdown
    await this.etsyFeePaymentModel.updateMany(
      {
        product: productId,
        status: 'pending',
        createdAt: { $lt: new Date(Date.now() - PENDING_PAYMENT_TTL_MS) },
      },
      { $set: { status: 'expired' } },
    );
    const livePayment = await this.etsyFeePaymentModel
      .findOne({
        product: productId,
        status: { $in: ['pending', 'paid', 'publish_failed'] },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    let pendingPayment: EtsyListingPreview['pendingPayment'] = null;
    if (livePayment) {
      const expiresAtMs =
        new Date((livePayment as any).createdAt).getTime() +
        PENDING_PAYMENT_TTL_MS;
      pendingPayment = {
        id: String(livePayment._id),
        status: livePayment.status,
        expiresAt: new Date(expiresAtMs).toISOString(),
        secondsLeft:
          livePayment.status === 'pending'
            ? Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000))
            : null,
        error: livePayment.error ?? null,
      };
    }

    return {
      ready: blockers.length === 0 && !existing,
      blockers,
      warnings,
      alreadyListed: existing
        ? {
            listingId: existing.listingId,
            listingUrl: existing.listingUrl,
            state: existing.state,
            warnings: existing.warnings ?? [],
          }
        : null,
      listing: {
        title,
        description,
        quantity,
        tags,
        materials,
        taxonomyId,
        taxonomyPath,
        imageCount: Math.min(product.images?.length ?? 0, MAX_IMAGES),
        whoMade: WHO_MADE,
        whenMade: WHEN_MADE,
      },
      pricing: {
        priceGel,
        commissionPercent: settings.commissionPercent,
        priceWithCommissionGel:
          Math.round(priceWithCommissionGel * 100) / 100,
        usdRate,
        priceUsd,
        listingFeeGel: settings.listingFeeGel,
        sellerBalanceGel,
        canPayFromBalance,
        soulartCommissionPercent: SOULART_COMMISSION_PERCENT,
        sellerEarnsGel:
          Math.round(priceGel * (1 - SOULART_COMMISSION_PERCENT / 100) * 100) /
          100,
      },
      pendingPayment,
    };
  }

  // ============================================
  // Publish
  // ============================================

  async publishProduct(
    productId: string,
    requester: { _id: any; role: string },
    options: PublishOptions = {},
  ) {
    const feeSource = options.feeSource ?? 'balance';
    const preview = await this.previewListing(productId, requester);

    if (preview.alreadyListed) {
      throw new HttpException(
        'Product is already listed on Etsy',
        HttpStatus.CONFLICT,
      );
    }
    // When the fee was already captured by card, the feature flag must not
    // block the publish (admin testing / flag flipped between pay & callback)
    const blockers =
      feeSource === 'external'
        ? preview.blockers.filter((b) => b !== 'INTEGRATION_DISABLED')
        : preview.blockers;
    if (blockers.length > 0) {
      throw new HttpException(
        `Cannot publish to Etsy: ${blockers.join(', ')}`,
        HttpStatus.PRECONDITION_FAILED,
      );
    }
    if (!preview.listing.taxonomyId) {
      throw new HttpException(
        'Could not resolve an Etsy category (taxonomy) for this product',
        HttpStatus.PRECONDITION_FAILED,
      );
    }
    if (
      feeSource === 'balance' &&
      preview.pricing.listingFeeGel > 0 &&
      !preview.pricing.canPayFromBalance
    ) {
      throw new HttpException(
        'Insufficient balance for the Etsy listing fee — pay by card instead',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    // A live card payment exists — don't allow a parallel balance publish
    // (would double-charge: balance now + card when the checkout completes)
    if (feeSource === 'balance' && preview.pendingPayment) {
      throw new HttpException(
        'A card payment for this product is already in progress',
        HttpStatus.CONFLICT,
      );
    }

    const product = await this.loadProductForRequester(productId, requester);
    const settings = await this.etsyService.getSettings();
    const shopId = await this.etsyService.getShopId();
    const sellerId = (product.user as any)?._id ?? product.user;
    const warnings = [...preview.warnings];

    // 1. Create the draft listing
    const payload: Record<string, any> = {
      quantity: preview.listing.quantity,
      title: preview.listing.title,
      description: preview.listing.description,
      price: preview.pricing.priceUsd,
      who_made: WHO_MADE,
      when_made: WHEN_MADE,
      taxonomy_id: preview.listing.taxonomyId,
      type: 'physical',
      should_auto_renew: false,
    };
    if (preview.listing.tags.length) payload.tags = preview.listing.tags;
    if (preview.listing.materials.length) {
      payload.materials = preview.listing.materials;
    }

    // Requirements for physical listings — auto-pick the shop's first
    // shipping profile, readiness state and return policy when available
    const shippingProfileId = await this.pickShippingProfileId(shopId, warnings);
    const readinessStateId = await this.pickReadinessStateId(shopId, warnings);
    const returnPolicyId = await this.pickReturnPolicyId(shopId, warnings);
    if (shippingProfileId) payload.shipping_profile_id = shippingProfileId;
    if (readinessStateId) payload.readiness_state_id = readinessStateId;
    if (returnPolicyId) payload.return_policy_id = returnPolicyId;

    const created = await this.etsyService.apiRequest<any>(
      'POST',
      `/application/shops/${shopId}/listings`,
      payload,
    );
    const listingId = String(created.listing_id);
    this.logger.log(`Etsy draft listing created: ${listingId} (product ${productId})`);

    const record = await this.etsyListingModel.create({
      product: product._id,
      seller: sellerId,
      listingId,
      listingUrl: created.url,
      state: 'draft',
      priceGel: preview.pricing.priceGel,
      priceUsd: preview.pricing.priceUsd,
      commissionPercent: preview.pricing.commissionPercent,
      listingFeeGel: preview.pricing.listingFeeGel,
      // Card fee is captured before publish; balance fee is charged on activation
      feeCharged: feeSource === 'external',
      feePaymentMethod:
        preview.pricing.listingFeeGel > 0
          ? feeSource === 'external'
            ? 'card'
            : 'balance'
          : 'none',
      taxonomyId: preview.listing.taxonomyId,
      warnings,
    });

    // 2. Upload images (best effort — listing exists even if some fail)
    const imagesUploaded = await this.uploadListingImages(
      shopId,
      listingId,
      product.images.slice(0, MAX_IMAGES),
      warnings,
    );
    record.imagesUploaded = imagesUploaded;

    // 3. Activate (this is when Etsy charges its $0.20 listing fee)
    let activated = false;
    if (imagesUploaded > 0 && shippingProfileId && returnPolicyId) {
      try {
        const updated = await this.etsyService.apiRequest<any>(
          'PATCH',
          `/application/shops/${shopId}/listings/${listingId}`,
          { state: 'active' },
        );
        activated = updated?.state === 'active';
        record.state = activated ? 'active' : updated?.state || 'draft';
        if (updated?.url) record.listingUrl = updated.url;
      } catch (error) {
        warnings.push(`ACTIVATION_FAILED: ${error.message}`);
      }
    } else {
      if (imagesUploaded === 0) warnings.push('NO_IMAGES_UPLOADED');
      if (!shippingProfileId) warnings.push('NO_SHIPPING_PROFILE');
      if (!returnPolicyId) warnings.push('NO_RETURN_POLICY');
    }

    // 4. Charge the seller's listing fee only when the listing went live
    // (card payments were already captured via BOG before publish)
    if (
      feeSource === 'balance' &&
      activated &&
      preview.pricing.listingFeeGel > 0
    ) {
      try {
        await this.chargeListingFee(
          sellerId,
          preview.pricing.listingFeeGel,
          product.name,
          listingId,
        );
        record.feeCharged = true;
      } catch (error) {
        // Listing is live but fee failed — keep it, flag for admins
        warnings.push(`FEE_CHARGE_FAILED: ${error.message}`);
        this.logger.error(
          `Etsy listing ${listingId} activated but fee charge failed: ${error.message}`,
        );
      }
    }

    record.warnings = warnings;
    await record.save();

    return {
      success: true,
      listingId,
      listingUrl: record.listingUrl,
      state: record.state,
      priceUsd: preview.pricing.priceUsd,
      feeCharged: record.feeCharged,
      imagesUploaded,
      warnings,
    };
  }

  /**
   * Etsy listings for the requesting seller (for FE state/badges).
   */
  async getMyListings(requester: { _id: any; role: string }) {
    const filter =
      requester.role === 'admin' ? {} : { seller: requester._id };
    return this.etsyListingModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
      .exec();
  }

  // ============================================
  // Field builders
  // ============================================

  private buildTitle(product: ProductDocument, warnings: string[]): string {
    const source = product.nameEn?.trim() || product.name?.trim() || '';
    if (!product.nameEn?.trim()) warnings.push('NO_ENGLISH_TITLE');

    // Strip emojis/control characters Etsy rejects, collapse whitespace
    const cleaned = source
      .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned.slice(0, MAX_TITLE_LENGTH);
  }

  private buildDescription(
    product: ProductDocument,
    warnings: string[],
  ): string {
    const base =
      product.descriptionEn?.trim() || product.description?.trim() || '';
    if (!product.descriptionEn?.trim()) warnings.push('NO_ENGLISH_DESCRIPTION');

    const parts: string[] = [base];

    const dims = product.dimensions;
    if (dims && (dims.width || dims.height || dims.depth)) {
      const dimStr = [
        dims.width ? `Width: ${dims.width} cm` : null,
        dims.height ? `Height: ${dims.height} cm` : null,
        dims.depth ? `Depth: ${dims.depth} cm` : null,
      ]
        .filter(Boolean)
        .join(', ');
      parts.push(`Dimensions: ${dimStr}`);
    }

    const materials = this.buildMaterials(product);
    if (materials.length) {
      parts.push(`Materials: ${materials.join(', ')}`);
    }

    if (product.isOriginal !== false) {
      parts.push('This is an original, one-of-a-kind handmade piece.');
    }

    parts.push(
      'Created by a Georgian artist from the SoulArt community (soulart.ge) — a marketplace of original art and handmade works from Georgia.',
    );

    return parts.join('\n\n');
  }

  private buildTags(product: ProductDocument): string[] {
    const fromHashtags = (product.hashtags || [])
      .map((h) => h.replace(/^#/, '').replace(/[_]+/g, ' ').trim().toLowerCase())
      .filter((t) => /^[a-z0-9][a-z0-9 \-]*$/.test(t) && t.length <= 20);

    const merged = [...fromHashtags, ...DEFAULT_TAGS];
    return [...new Set(merged)].slice(0, MAX_TAGS);
  }

  private buildMaterials(product: ProductDocument): string[] {
    return (product.materialsEn || [])
      .map((m) => m.replace(/[^a-zA-Z0-9 ]/g, '').trim())
      .filter((m) => m.length > 0 && m.length <= 45)
      .slice(0, MAX_MATERIALS);
  }

  private resolveQuantity(product: ProductDocument): number {
    const variantStock = (product.variants || []).reduce(
      (sum, v) => sum + (v.stock || 0),
      0,
    );
    const qty = variantStock > 0 ? variantStock : product.countInStock || 0;
    return Math.min(qty, 999);
  }

  /**
   * Etsy prices look better as .99 — round UP to protect the margin,
   * then subtract a cent-style remainder only when safely above.
   */
  private roundEtsyPrice(usd: number): number {
    const ceiled = Math.ceil(usd);
    return ceiled >= 2 ? ceiled - 0.01 : Math.max(0.2, ceiled);
  }

  // ============================================
  // Taxonomy resolution
  // ============================================

  private async getTaxonomy(): Promise<FlatTaxonomyNode[]> {
    const now = Date.now();
    if (this.taxonomyCache && now - this.taxonomyCacheAt < TAXONOMY_CACHE_TTL_MS) {
      return this.taxonomyCache;
    }

    const data = await this.etsyService.apiRequest<{ results: TaxonomyNode[] }>(
      'GET',
      '/application/seller-taxonomy/nodes',
    );

    const flat: FlatTaxonomyNode[] = [];
    const walk = (nodes: TaxonomyNode[], path: string, depth: number) => {
      for (const node of nodes || []) {
        const nodePath = path ? `${path} > ${node.name}` : node.name;
        flat.push({ id: node.id, name: node.name, path: nodePath, depth });
        if (node.children?.length) walk(node.children, nodePath, depth + 1);
      }
    };
    walk(data.results, '', 0);

    this.taxonomyCache = flat;
    this.taxonomyCacheAt = now;
    this.logger.log(`Etsy taxonomy loaded: ${flat.length} nodes`);
    return flat;
  }

  private async resolveTaxonomy(
    product: ProductDocument,
  ): Promise<FlatTaxonomyNode> {
    const taxonomy = await this.getTaxonomy();

    const keywords = [
      product.subCategoryEn,
      product.categoryStructure?.subEn,
      product.mainCategoryEn,
      FALLBACK_TAXONOMY_KEYWORD,
    ]
      .map((k) => k?.trim().toLowerCase())
      .filter(Boolean) as string[];

    for (const keyword of keywords) {
      // Exact name match first (deepest node wins), then substring match
      const exact = taxonomy
        .filter((n) => n.name.toLowerCase() === keyword)
        .sort((a, b) => b.depth - a.depth)[0];
      if (exact) return exact;

      const partial = taxonomy
        .filter(
          (n) =>
            n.name.toLowerCase().includes(keyword) ||
            keyword.includes(n.name.toLowerCase()),
        )
        .sort((a, b) => b.depth - a.depth)[0];
      if (partial) return partial;
    }

    throw new Error('No matching Etsy taxonomy node found');
  }

  // ============================================
  // Images
  // ============================================

  private async uploadListingImages(
    shopId: string,
    listingId: string,
    imageUrls: string[],
    warnings: string[],
  ): Promise<number> {
    let uploaded = 0;
    let rank = 1;
    const startedAt = Date.now();

    for (const url of imageUrls) {
      // Runs inside HTTP requests (incl. the BOG callback) on serverless —
      // stop before the function times out; the listing survives with the
      // images uploaded so far
      if (Date.now() - startedAt > IMAGE_UPLOAD_BUDGET_MS) {
        warnings.push(
          `IMAGE_UPLOAD_TIME_BUDGET: uploaded ${uploaded}/${imageUrls.length}`,
        );
        break;
      }
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`download failed (${response.status})`);
        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType =
          response.headers.get('content-type') || 'image/jpeg';

        const form = new FormData();
        form.append(
          'image',
          new Blob([buffer], { type: contentType }),
          `image-${rank}.jpg`,
        );
        form.append('rank', String(rank));

        await this.etsyService.apiRequest(
          'POST',
          `/application/shops/${shopId}/listings/${listingId}/images`,
          form,
        );
        uploaded++;
        rank++;
      } catch (error) {
        this.logger.warn(
          `Etsy image upload failed for listing ${listingId}: ${error.message}`,
        );
        warnings.push(`IMAGE_UPLOAD_FAILED: ${url.slice(0, 80)}`);
      }
    }
    return uploaded;
  }

  // ============================================
  // Shipping profile / return policy (activation requirements)
  // ============================================

  /**
   * Cached (60s) shipping-profile lookup for previews. Returns 'error'
   * when Etsy can't be reached — callers must not treat that as "none".
   */
  private async lookupShippingProfileId(
    shopId: string,
  ): Promise<number | null | 'error'> {
    const cache = this.shippingProfileCache;
    if (cache && cache.shopId === shopId && Date.now() - cache.at < 60_000) {
      return cache.id;
    }
    try {
      const data = await this.etsyService.apiRequest<{ results: any[] }>(
        'GET',
        `/application/shops/${shopId}/shipping-profiles`,
      );
      const id = data.results?.[0]?.shipping_profile_id ?? null;
      this.shippingProfileCache = { shopId, id, at: Date.now() };
      return id;
    } catch {
      return 'error';
    }
  }

  /**
   * Cached (60s) readiness-state (processing profile) lookup for previews.
   * Returns 'error' when Etsy can't be reached — not the same as "none".
   */
  private async lookupReadinessStateId(
    shopId: string,
  ): Promise<number | null | 'error'> {
    const cache = this.readinessStateCache;
    if (cache && cache.shopId === shopId && Date.now() - cache.at < 60_000) {
      return cache.id;
    }
    try {
      const data = await this.etsyService.apiRequest<{ results: any[] }>(
        'GET',
        `/application/shops/${shopId}/readiness-state-definitions`,
      );
      const id = data.results?.[0]?.readiness_state_id ?? null;
      this.readinessStateCache = { shopId, id, at: Date.now() };
      return id;
    } catch {
      return 'error';
    }
  }

  private async pickReadinessStateId(
    shopId: string,
    warnings: string[],
  ): Promise<number | null> {
    try {
      const data = await this.etsyService.apiRequest<{ results: any[] }>(
        'GET',
        `/application/shops/${shopId}/readiness-state-definitions`,
      );
      const state = data.results?.[0];
      if (!state) return null;
      return state.readiness_state_id;
    } catch (error: any) {
      warnings.push(`READINESS_STATES_FETCH_FAILED: ${error.message}`);
      return null;
    }
  }

  private async pickShippingProfileId(
    shopId: string,
    warnings: string[],
  ): Promise<number | null> {
    try {
      const data = await this.etsyService.apiRequest<{ results: any[] }>(
        'GET',
        `/application/shops/${shopId}/shipping-profiles`,
      );
      const profile = data.results?.[0];
      if (!profile) return null;
      return profile.shipping_profile_id;
    } catch (error) {
      warnings.push(`SHIPPING_PROFILES_FETCH_FAILED: ${error.message}`);
      return null;
    }
  }

  private async pickReturnPolicyId(
    shopId: string,
    warnings: string[],
  ): Promise<number | null> {
    try {
      const data = await this.etsyService.apiRequest<{ results: any[] }>(
        'GET',
        `/application/shops/${shopId}/policies/return`,
      );
      const policy = data.results?.[0];
      if (!policy) return null;
      return policy.return_policy_id;
    } catch (error) {
      warnings.push(`RETURN_POLICIES_FETCH_FAILED: ${error.message}`);
      return null;
    }
  }

  // ============================================
  // Card (BOG) fee payment
  // ============================================

  /**
   * Validates that a product can be published and returns what the
   * payments service needs to create the BOG order.
   */
  async prepareCardFeePayment(
    productId: string,
    requester: { _id: any; role: string },
  ): Promise<{ feeGel: number; productName: string; sellerId: string }> {
    const preview = await this.previewListing(productId, requester);

    if (preview.alreadyListed) {
      throw new HttpException(
        'Product is already listed on Etsy',
        HttpStatus.CONFLICT,
      );
    }
    if (preview.blockers.length > 0) {
      throw new HttpException(
        `Cannot publish to Etsy: ${preview.blockers.join(', ')}`,
        HttpStatus.PRECONDITION_FAILED,
      );
    }
    if (preview.pricing.listingFeeGel <= 0) {
      throw new HttpException(
        'Listing fee is zero — publish directly, no payment needed',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Guard against double payments: expire abandoned checkouts, then block
    // when a live payment already exists for this product
    await this.etsyFeePaymentModel.updateMany(
      {
        product: productId,
        status: 'pending',
        createdAt: { $lt: new Date(Date.now() - PENDING_PAYMENT_TTL_MS) },
      },
      { $set: { status: 'expired' } },
    );
    const existing = await this.etsyFeePaymentModel
      .findOne({
        product: productId,
        status: { $in: ['pending', 'paid', 'publish_failed'] },
      })
      .lean()
      .exec();
    if (existing) {
      throw new HttpException(
        existing.status === 'pending'
          ? 'A payment for this product is already in progress'
          : 'The listing fee is already paid for this product — no need to pay again, publishing will be retried',
        HttpStatus.CONFLICT,
      );
    }

    const product = await this.loadProductForRequester(productId, requester);
    const sellerId = String((product.user as any)?._id ?? product.user);
    return {
      feeGel: preview.pricing.listingFeeGel,
      productName: product.name,
      sellerId,
    };
  }

  /**
   * Records the BOG payment BEFORE the order is created with BOG, so a
   * paid callback can never arrive for an order we have no record of.
   */
  async recordCardFeePayment(data: {
    externalOrderId: string;
    productId: string;
    sellerId: string;
    amountGel: number;
    payerRole?: string;
  }): Promise<void> {
    await this.etsyFeePaymentModel.create({
      externalOrderId: data.externalOrderId,
      product: data.productId,
      seller: data.sellerId,
      amountGel: data.amountGel,
      payerRole: data.payerRole,
      status: 'pending',
    });
  }

  /**
   * Stores BOG's order id once the order exists (for later reconciliation).
   */
  async attachBogOrderId(
    externalOrderId: string,
    bogOrderId: string,
  ): Promise<void> {
    await this.etsyFeePaymentModel.updateOne(
      { externalOrderId },
      { $set: { bogOrderId } },
    );
  }

  /**
   * BOG order creation failed after the record was written.
   */
  async markCardFeePaymentFailed(
    externalOrderId: string,
    error: string,
  ): Promise<void> {
    await this.etsyFeePaymentModel.updateOne(
      { externalOrderId, status: 'pending' },
      { $set: { status: 'failed', error: error.slice(0, 500) } },
    );
  }

  /**
   * Called from the BOG payment callback when an etsy_* payment completes:
   * marks the fee as paid and publishes the listing on the seller's behalf.
   */
  async handleCardFeePaymentCompleted(
    externalOrderId: string,
  ): Promise<{ success: boolean; message: string }> {
    const payment = await this.etsyFeePaymentModel.findOne({
      externalOrderId,
    });
    if (!payment) {
      this.logger.warn(`Etsy fee payment not found: ${externalOrderId}`);
      return { success: false, message: 'Etsy fee payment record not found' };
    }
    if (payment.status === 'published') {
      return { success: true, message: 'Already published' };
    }
    // 'paid' is retryable: a crash/timeout between 'paid' and 'published'
    // must not strand the payment — BOG callback retries land here again
    if (payment.status !== 'pending' && payment.status !== 'paid') {
      return { success: true, message: `Already processed (${payment.status})` };
    }

    if (payment.status === 'pending') {
      payment.status = 'paid';
      await payment.save();
    }

    return this.publishPaidFeePayment(payment);
  }

  /**
   * Publishes the listing for a captured fee payment. Shared by the BOG
   * callback and the admin retry endpoint.
   */
  private async publishPaidFeePayment(
    payment: EtsyFeePaymentDocument,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.publishProduct(
        String(payment.product),
        { _id: payment.seller, role: payment.payerRole || 'seller' },
        { feeSource: 'external' },
      );
      payment.status = 'published';
      payment.listingId = result.listingId;
      payment.error = undefined;
      await payment.save();
      this.logger.log(
        `Etsy listing published after card payment: ${result.listingId}`,
      );
      return { success: true, message: 'Etsy listing published' };
    } catch (error: any) {
      // Fee captured but publish failed — keep the record for admin follow-up
      payment.status = 'publish_failed';
      payment.error = error.message;
      await payment.save();
      this.logger.error(
        `Etsy publish failed after paid fee ${payment.externalOrderId}: ${error.message}`,
      );
      return {
        success: false,
        message: `Fee paid but publish failed: ${error.message}`,
      };
    }
  }

  /**
   * Retry for a captured payment that never became a listing — allowed for
   * admins and for the payment's own seller (a retry never charges again).
   * 'paid'/'publish_failed' retry the publish directly; 'pending'/'expired'
   * (callback never arrived — e.g. it went to another environment) are
   * first verified against BOG's payment status API.
   */
  async retryFeePayment(
    paymentId: string,
    requester: { _id: any; role: string },
  ): Promise<{ success: boolean; message: string }> {
    const payment = await this.etsyFeePaymentModel.findById(paymentId);
    if (!payment) {
      throw new HttpException('Fee payment not found', HttpStatus.NOT_FOUND);
    }
    const isOwner = String(payment.seller) === String(requester._id);
    if (!isOwner && requester.role !== 'admin') {
      throw new HttpException(
        'You can only retry your own payments',
        HttpStatus.FORBIDDEN,
      );
    }
    if (payment.status === 'published') {
      return { success: true, message: 'Already published' };
    }

    if (payment.status === 'pending' || payment.status === 'expired') {
      if (!payment.bogOrderId) {
        throw new HttpException(
          'Cannot verify payment: no BOG order id recorded',
          HttpStatus.BAD_REQUEST,
        );
      }
      const status = await this.paymentsService.getPaymentStatus(
        payment.bogOrderId,
      );
      const statusKey = status?.order_status?.key?.toLowerCase();
      if (statusKey !== 'completed') {
        throw new HttpException(
          `BOG reports the payment as '${statusKey || 'unknown'}' — not completed, nothing to publish`,
          HttpStatus.BAD_REQUEST,
        );
      }
      payment.status = 'paid';
      await payment.save();
      this.logger.log(
        `Etsy fee payment ${payment.externalOrderId} reconciled as paid via BOG status check`,
      );
    } else if (payment.status !== 'paid' && payment.status !== 'publish_failed') {
      throw new HttpException(
        `Cannot retry a payment in status '${payment.status}'`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // The admin likely just fixed the shop setup (e.g. created a shipping
    // profile) — don't let stale cached lookups block the retry
    this.shippingProfileCache = null;
    this.readinessStateCache = null;

    return this.publishPaidFeePayment(payment);
  }

  // ============================================
  // Fee payment (deducted from seller balance)
  // ============================================

  private async chargeListingFee(
    sellerId: any,
    feeGel: number,
    productName: string,
    listingId: string,
  ): Promise<void> {
    // Atomic: guard and decrement in one operation so concurrent publishes
    // or withdrawals can't race past the balance check
    const updated = await this.sellerBalanceModel.findOneAndUpdate(
      { seller: sellerId, totalBalance: { $gte: feeGel } },
      { $inc: { totalBalance: -feeGel } },
      { new: true },
    );
    if (!updated) {
      throw new Error('Insufficient seller balance for Etsy listing fee');
    }

    await this.userModel.findByIdAndUpdate(sellerId, {
      $inc: { balance: -feeGel },
    });

    await this.balanceTransactionModel.create({
      seller: sellerId,
      amount: -feeGel,
      type: 'etsy_listing_fee',
      description: `Etsy listing fee — ${productName} (listing ${listingId})`,
      finalAmount: -feeGel,
    });

    this.logger.log(
      `Charged ${feeGel} GEL Etsy listing fee from seller ${sellerId}`,
    );
  }

  // ============================================
  // Stats / monitoring (admin page)
  // ============================================

  async getStats() {
    const [stateAgg, feeAgg, problemPayments, recentListings] =
      await Promise.all([
        this.etsyListingModel.aggregate([
          { $group: { _id: '$state', count: { $sum: 1 } } },
        ]),
        this.etsyListingModel.aggregate([
          { $match: { feeCharged: true } },
          {
            $group: {
              _id: '$feePaymentMethod',
              count: { $sum: 1 },
              totalGel: { $sum: '$listingFeeGel' },
            },
          },
        ]),
        // Payments needing attention: money captured but nothing published,
        // plus checkouts whose callback never arrived (stale pending/expired)
        this.etsyFeePaymentModel
          .find({
            $or: [
              { status: { $in: ['paid', 'publish_failed', 'expired'] } },
              {
                status: 'pending',
                createdAt: {
                  $lt: new Date(Date.now() - PENDING_PAYMENT_TTL_MS),
                },
              },
            ],
          })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate('product', 'name images')
          .populate('seller', 'name email')
          .lean()
          .exec(),
        this.etsyListingModel
          .find()
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('product', 'name images')
          .populate('seller', 'name')
          .lean()
          .exec(),
      ]);

    const byState: Record<string, number> = {};
    let total = 0;
    for (const s of stateAgg) {
      byState[s._id ?? 'unknown'] = s.count;
      total += s.count;
    }

    const feesByMethod: Record<string, { count: number; totalGel: number }> =
      {};
    let feesTotalGel = 0;
    for (const f of feeAgg) {
      feesByMethod[f._id ?? 'unknown'] = {
        count: f.count,
        totalGel: Math.round(f.totalGel * 100) / 100,
      };
      feesTotalGel += f.totalGel;
    }

    return {
      listings: {
        total,
        active: byState['active'] ?? 0,
        draft: byState['draft'] ?? 0,
        byState,
      },
      fees: {
        totalGel: Math.round(feesTotalGel * 100) / 100,
        byMethod: feesByMethod,
      },
      problemPayments,
      recentListings,
    };
  }

  // ============================================
  // Helpers
  // ============================================

  private async findActiveListing(
    productId: string,
  ): Promise<EtsyListingDocument | null> {
    return this.etsyListingModel
      .findOne({ product: productId, state: { $in: ['draft', 'active'] } })
      .exec();
  }

  private async loadProductForRequester(
    productId: string,
    requester: { _id: any; role: string },
  ): Promise<ProductDocument> {
    const product = await this.productModel
      .findById(productId)
      .populate('user', '_id name email role')
      .exec();
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    const ownerId = String((product.user as any)?._id ?? product.user);
    const isOwner = ownerId === String(requester._id);
    if (!isOwner && requester.role !== 'admin') {
      throw new HttpException(
        'You can only publish your own products to Etsy',
        HttpStatus.FORBIDDEN,
      );
    }
    return product;
  }
}
