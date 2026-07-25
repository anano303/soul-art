import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EtsyService } from './etsy.service';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import {
  EtsyListing,
  EtsyListingDocument,
} from './schemas/etsy-listing.schema';
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
  };
}

@Injectable()
export class EtsyListingService {
  private readonly logger = new Logger(EtsyListingService.name);

  // Per-instance cache of Etsy's seller taxonomy (large, rarely changes)
  private taxonomyCache: FlatTaxonomyNode[] | null = null;
  private taxonomyCacheAt = 0;

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
    // separately allowed in for testing while it's off for sellers
    const isAdmin = requester.role === 'admin';
    const featureEnabled =
      settings.integrationEnabled || (isAdmin && settings.enabledForAdmins);
    if (!featureEnabled) {
      blockers.push('INTEGRATION_DISABLED');
    }
    if (!status.configured) blockers.push('NOT_CONFIGURED');
    if (!status.connected) blockers.push('SHOP_NOT_CONNECTED');
    else if (!status.shopId) blockers.push('NO_ETSY_SHOP');
    if (product.status !== ProductStatus.APPROVED) {
      blockers.push('PRODUCT_NOT_APPROVED');
    }

    const quantity = this.resolveQuantity(product);
    if (quantity < 1) blockers.push('OUT_OF_STOCK');
    if (!product.images?.length) blockers.push('NO_IMAGES');

    const existing = await this.findActiveListing(productId);

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
    } catch (error) {
      warnings.push(`TAXONOMY_UNRESOLVED: ${error.message}`);
    }

    // Pricing: commission goes ON TOP of the seller's price
    const priceGel = product.price;
    const priceWithCommissionGel =
      priceGel * (1 + settings.commissionPercent / 100);
    const priceUsd = this.roundEtsyPrice(priceWithCommissionGel * usdRate);

    // Seller balance (the listing fee is charged from it)
    const sellerId = (product.user as any)?._id ?? product.user;
    const balanceDoc = await this.sellerBalanceModel
      .findOne({ seller: sellerId })
      .lean()
      .exec();
    const sellerBalanceGel = balanceDoc ? balanceDoc.totalBalance : 0;
    if (
      settings.listingFeeGel > 0 &&
      sellerBalanceGel < settings.listingFeeGel
    ) {
      blockers.push('INSUFFICIENT_BALANCE');
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
      },
    };
  }

  // ============================================
  // Publish
  // ============================================

  async publishProduct(
    productId: string,
    requester: { _id: any; role: string },
  ) {
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
    if (!preview.listing.taxonomyId) {
      throw new HttpException(
        'Could not resolve an Etsy category (taxonomy) for this product',
        HttpStatus.PRECONDITION_FAILED,
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

    // Activation requirements — auto-pick the shop's first shipping profile
    // and return policy when available
    const shippingProfileId = await this.pickShippingProfileId(shopId, warnings);
    const returnPolicyId = await this.pickReturnPolicyId(shopId, warnings);
    if (shippingProfileId) payload.shipping_profile_id = shippingProfileId;
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
    if (activated && preview.pricing.listingFeeGel > 0) {
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

    for (const url of imageUrls) {
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
  // Fee payment (deducted from seller balance)
  // ============================================

  private async chargeListingFee(
    sellerId: any,
    feeGel: number,
    productName: string,
    listingId: string,
  ): Promise<void> {
    const balance = await this.sellerBalanceModel.findOne({
      seller: sellerId,
    });
    if (!balance || balance.totalBalance < feeGel) {
      throw new Error('Insufficient seller balance for Etsy listing fee');
    }

    balance.totalBalance -= feeGel;
    await balance.save();

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
