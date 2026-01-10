import { FilterQuery, Model, Types, isValidObjectId } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';

import { User, UserDocument } from '../schemas/user.schema';
import { Product, ProductStatus } from '../../products/schemas/product.schema';
import {
  PortfolioPost,
  PortfolioPostDocument,
} from '../schemas/portfolio-post.schema';
import { hashPassword } from '@/utils/password';
import { generateUsers } from '@/utils/seed-users';
import { PaginatedResponse } from '@/types';
import { Role } from '@/types/role.enum';
import { SellerRegisterDto } from '../dtos/seller-register.dto';
import { BecomeSellerDto } from '../dtos/become-seller.dto';
import { AdminProfileDto } from '../dtos/admin.profile.dto';
import { UserCloudinaryService } from './user-cloudinary.service';
import { CloudinaryService } from '@/cloudinary/services/cloudinary.service';
import { generateBaseArtistSlug } from '@/utils/slug-generator';
import { BalanceService } from './balance.service';
import { ReferralsService } from '@/referrals/services/referrals.service';
import { OrdersService } from '@/orders/services/orders.service';
import { UpdateArtistProfileDto } from '../dtos/update-artist-profile.dto';
import { ArtistSocialLinks } from '../schemas/user.schema';
import { EmailService } from '@/email/services/email.services';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(PortfolioPost.name)
    private portfolioPostModel: Model<PortfolioPostDocument>,
    private readonly userCloudinaryService: UserCloudinaryService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly balanceService: BalanceService,
    @Optional()
    @Inject(forwardRef(() => ReferralsService))
    private readonly referralsService?: ReferralsService,
    @Optional()
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService?: OrdersService,
    @Optional()
    private readonly emailService?: EmailService,
  ) {}

  private normalizeArtistSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }

  private isCloudinaryUrl(url?: string | null): boolean {
    if (!url) return false;
    return /^https?:\/\/.+cloudinary\.com/.test(url.trim());
  }

  private sanitizeSocialLinks(links?: ArtistSocialLinks) {
    if (!links) return undefined;

    const sanitizedEntries = Object.entries(links);

    return sanitizedEntries.length > 0
      ? sanitizedEntries.reduce((acc, [key, value]) => {
          acc[key as keyof ArtistSocialLinks] = value;
          return acc;
        }, {} as ArtistSocialLinks)
      : {};
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async listPublicArtists(limit: number = 200) {
    const normalizedLimit = Math.min(Math.max(Number(limit) || 50, 1), 1000);

    const artists = await this.userModel
      .find({
        role: Role.Seller,
        artistSlug: { $exists: true, $nin: [null, ''] },
      })
      .sort({ updatedAt: -1 })
      .limit(normalizedLimit)
      .select(['artistSlug', 'storeName', 'name', 'updatedAt', 'createdAt'])
      .lean();

    return artists.map((artist) => ({
      id: artist._id.toString(),
      slug: artist.artistSlug ?? artist._id.toString(),
      name: artist.storeName ?? artist.name,
      updatedAt: artist.updatedAt ?? artist.createdAt ?? new Date(),
      createdAt: artist.createdAt ?? null,
    }));
  }

  async searchPublicArtists(
    keyword: string,
    limit: number = 20,
  ): Promise<any[]> {
    if (!keyword || keyword.trim().length < 2) {
      return [];
    }

    try {
      // Sanitize the keyword to prevent regex injection
      const sanitizedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

      const artists = await this.userModel
        .find({
          role: Role.Seller,
          artistSlug: { $exists: true, $nin: [null, ''] },
          $or: [
            { name: { $regex: sanitizedKeyword, $options: 'i' } },
            { storeName: { $regex: sanitizedKeyword, $options: 'i' } },
            { artistSlug: { $regex: sanitizedKeyword, $options: 'i' } },
          ],
        })
        .sort({ updatedAt: -1 })
        .limit(normalizedLimit)
        .select([
          'artistSlug',
          'storeName',
          'name',
          'updatedAt',
          'createdAt',
          'artistCoverImage',
          'storeLogo',
          'storeLogoPath',
          'profileImagePath',
        ])
        .lean();

      return artists.map((artist) => ({
        id: artist._id.toString(),
        slug: artist.artistSlug ?? artist._id.toString(),
        name: artist.storeName ?? artist.name,
        updatedAt: artist.updatedAt ?? artist.createdAt ?? new Date(),
        createdAt: artist.createdAt ?? null,
        // Image fields - prioritize portfolio image (artistCoverImage), then store logo, then profile image
        artistCoverImage: artist.artistCoverImage,
        storeLogo: artist.storeLogo,
        storeLogoPath: artist.storeLogoPath,
        profileImagePath: artist.profileImagePath,
      }));
    } catch (error) {
      console.error('Error searching artists:', error);
      throw new BadRequestException('Failed to search artists');
    }
  }

  async getSearchRanking(
    keyword: string,
    limit: number = 20,
  ): Promise<{
    recommendedTab: 'artists' | 'products';
    artists: any[];
    products: any[];
    reasoning: string;
  }> {
    if (!keyword || keyword.trim().length < 2) {
      return {
        recommendedTab: 'artists',
        artists: [],
        products: [],
        reasoning: 'Default to artists for empty search',
      };
    }

    try {
      const sanitizedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

      // Search artists and products in parallel
      const [artists, products] = await Promise.all([
        this.searchPublicArtists(keyword.trim(), normalizedLimit),
        this.searchProducts(keyword.trim(), normalizedLimit),
      ]);

      // Determine which tab to show first
      let recommendedTab: 'artists' | 'products' = 'artists';
      let reasoning = 'Default to artists';

      // 1. Check for exact matches (case-insensitive)
      const lowerKeyword = keyword.trim().toLowerCase();

      const exactArtistMatch = artists.some(
        (artist) =>
          artist.name.toLowerCase() === lowerKeyword ||
          artist.slug.toLowerCase() === lowerKeyword,
      );

      const exactProductMatch = products.some(
        (product) =>
          product.name?.toLowerCase() === lowerKeyword ||
          product.nameEn?.toLowerCase() === lowerKeyword,
      );

      if (exactArtistMatch && !exactProductMatch) {
        recommendedTab = 'artists';
        reasoning = 'Exact artist name/slug match found';
      } else if (exactProductMatch && !exactArtistMatch) {
        recommendedTab = 'products';
        reasoning = 'Exact product name match found';
      } else if (exactArtistMatch && exactProductMatch) {
        // Both have exact matches, use count as tiebreaker
        recommendedTab =
          artists.length >= products.length ? 'artists' : 'products';
        reasoning =
          'Both have exact matches, showing category with more results';
      } else {
        // 2. Check availability (no results in one category)
        if (artists.length === 0 && products.length > 0) {
          recommendedTab = 'products';
          reasoning = 'No artists found, showing products';
        } else if (products.length === 0 && artists.length > 0) {
          recommendedTab = 'artists';
          reasoning = 'No products found, showing artists';
        } else if (artists.length === 0 && products.length === 0) {
          recommendedTab = 'artists';
          reasoning = 'No results found, defaulting to artists';
        } else {
          // 3. Use relevance scoring
          const artistScore = this.calculateRelevanceScore(artists, keyword);
          const productScore = this.calculateRelevanceScore(products, keyword);

          if (productScore > artistScore) {
            recommendedTab = 'products';
            reasoning = `Products more relevant (score: ${productScore} vs ${artistScore})`;
          } else {
            recommendedTab = 'artists';
            reasoning = `Artists more relevant (score: ${artistScore} vs ${productScore})`;
          }
        }
      }

      return {
        recommendedTab,
        artists,
        products,
        reasoning,
      };
    } catch (error) {
      console.error('Error in search ranking:', error);
      throw new BadRequestException('Failed to get search ranking');
    }
  }

  private async searchProducts(keyword: string, limit: number): Promise<any[]> {
    try {
      const sanitizedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const products = await this.productModel
        .find({
          status: ProductStatus.APPROVED,
          $or: [
            { name: { $regex: sanitizedKeyword, $options: 'i' } },
            { nameEn: { $regex: sanitizedKeyword, $options: 'i' } },
            { description: { $regex: sanitizedKeyword, $options: 'i' } },
            { brand: { $regex: sanitizedKeyword, $options: 'i' } },
          ],
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select(['name', 'nameEn', 'description', 'price', 'images'])
        .lean();

      return products.map((product) => ({
        id: product._id.toString(),
        name: product.name,
        nameEn: product.nameEn,
        description: product.description,
        price: product.price,
        images: product.images,
      }));
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  private calculateRelevanceScore(results: any[], keyword: string): number {
    if (!results.length) return 0;

    const lowerKeyword = keyword.toLowerCase();
    let score = 0;

    results.forEach((item) => {
      const name = (item.name || '').toLowerCase();
      const nameEn = (item.nameEn || '').toLowerCase();
      const slug = (item.slug || '').toLowerCase();

      // Check all relevant fields for matches
      const searchFields = [name, nameEn, slug].filter((field) => field);

      for (const field of searchFields) {
        // Exact match gets highest score
        if (field === lowerKeyword) {
          score += 10;
          break; // Don't double-count for the same item
        }
        // Starts with keyword gets medium score
        else if (field.startsWith(lowerKeyword)) {
          score += 5;
          break;
        }
        // Contains keyword gets low score
        else if (field.includes(lowerKeyword)) {
          score += 2;
          break;
        }
      }
    });

    return score;
  }

  async isArtistSlugAvailable(slug: string, excludeUserId?: string) {
    const normalized = this.normalizeArtistSlug(slug);

    if (normalized.length === 0) {
      return { available: true, reason: null };
    }

    if (normalized.length < 3 || normalized.length > 40) {
      throw new BadRequestException(
        'Slug length must be between 3 and 40 characters',
      );
    }

    const reservedSlugs = new Set([
      'artists',
      'sellers',
      'admin',
      'profile',
      'store',
      'soulart',
    ]);

    if (reservedSlugs.has(normalized)) {
      return { available: false, reason: 'reserved' };
    }

    const existing = await this.userModel.findOne({
      artistSlug: normalized,
      ...(excludeUserId
        ? { _id: { $ne: new Types.ObjectId(excludeUserId) } }
        : {}),
    });

    return { available: !existing, reason: existing ? 'taken' : null };
  }

  private validateImageFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const validMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
    ];

    if (
      !validMimeTypes.includes(file.mimetype.toLowerCase()) &&
      !file.mimetype.toLowerCase().startsWith('image/')
    ) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Supported types: JPEG, PNG, GIF, WEBP.`,
      );
    }

    const filesSizeInMb = Number((file.size / (1024 * 1024)).toFixed(1));
    if (filesSizeInMb > 10) {
      throw new BadRequestException('The file must be less than 10 MB.');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }
  }

  async uploadArtistCoverImage(userId: string, file: Express.Multer.File) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.Seller) {
      throw new BadRequestException('Only sellers can upload cover images');
    }

    this.validateImageFile(file);

    const coverUrl =
      await this.userCloudinaryService.uploadArtistCoverImage(file);

    await this.userModel.findByIdAndUpdate(userId, {
      artistCoverImage: coverUrl,
    });

    return {
      message: 'Artist cover image updated successfully',
      coverUrl,
    };
  }

  async addArtistGalleryImage(userId: string, file: Express.Multer.File) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.Seller) {
      throw new BadRequestException('Only sellers can upload gallery images');
    }

    this.validateImageFile(file);

    const currentGallery = Array.isArray(user.artistGallery)
      ? [...user.artistGallery]
      : [];

    if (currentGallery.length >= 20) {
      throw new BadRequestException(
        'You can upload up to 20 gallery images. Please remove one before adding a new image.',
      );
    }

    const imageUrl =
      await this.userCloudinaryService.uploadArtistGalleryImage(file);

    if (!this.isCloudinaryUrl(imageUrl)) {
      throw new BadRequestException('Invalid gallery image URL');
    }

    if (currentGallery.includes(imageUrl)) {
      return {
        message: 'Image already exists in gallery',
        imageUrl,
        gallery: currentGallery,
      };
    }

    currentGallery.push(imageUrl);

    await this.userModel.findByIdAndUpdate(userId, {
      artistGallery: currentGallery,
    });

    return {
      message: 'Gallery image added successfully',
      imageUrl,
      gallery: currentGallery,
    };
  }

  async removeArtistGalleryImage(userId: string, imageUrl: string) {
    if (!imageUrl || !this.isCloudinaryUrl(imageUrl)) {
      throw new BadRequestException('Invalid gallery image URL');
    }

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.Seller) {
      throw new BadRequestException('Only sellers can update gallery images');
    }

    const currentGallery = Array.isArray(user.artistGallery)
      ? [...user.artistGallery]
      : [];

    const updatedGallery = currentGallery.filter((url) => url !== imageUrl);

    if (updatedGallery.length === currentGallery.length) {
      throw new NotFoundException('Gallery image not found');
    }

    await this.userModel.findByIdAndUpdate(userId, {
      artistGallery: updatedGallery,
    });

    return {
      message: 'Gallery image removed successfully',
      gallery: updatedGallery,
    };
  }

  async updateArtistProfile(id: string, dto: UpdateArtistProfileDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.Seller) {
      throw new BadRequestException('Only sellers can update artist profile');
    }

    const update: Partial<User> = {};

    if (dto.artistSlug !== undefined) {
      const rawSlug = dto.artistSlug ?? '';
      const normalized =
        typeof rawSlug === 'string' && rawSlug.length > 0
          ? this.normalizeArtistSlug(rawSlug)
          : '';

      if (normalized.length > 0) {
        const slugCheck = await this.isArtistSlugAvailable(normalized, id);
        if (!slugCheck.available) {
          throw new ConflictException(
            slugCheck.reason === 'reserved'
              ? 'This slug is reserved'
              : 'This slug is already in use',
          );
        }
        update.artistSlug = normalized;
      } else {
        update.artistSlug = null;
      }
    }

    if (dto.artistCoverImage !== undefined) {
      const cover = dto.artistCoverImage?.trim();
      if (cover && cover.length > 0) {
        if (!this.isCloudinaryUrl(cover)) {
          throw new BadRequestException(
            'Artist cover image must be a Cloudinary URL',
          );
        }
        update.artistCoverImage = cover;
      } else {
        update.artistCoverImage = null;
      }
    }

    if (dto.artistBio !== undefined) {
      const sanitizedBioEntries = Object.entries(dto.artistBio || {})
        .map(
          ([locale, value]) =>
            [locale.trim(), value?.trim()] as [string, string | undefined],
        )
        .filter(([locale, value]) => locale.length > 0 && !!value);

      update.artistBio = new Map(sanitizedBioEntries as [string, string][]);
    }

    if (dto.artistDisciplines !== undefined) {
      update.artistDisciplines = dto.artistDisciplines
        ?.map((value) => value.trim())
        .filter((value) => value.length > 0);
    }

    if (dto.artistLocation !== undefined) {
      const location = dto.artistLocation?.trim();
      update.artistLocation = location && location.length > 0 ? location : null;
    }

    if (dto.artistOpenForCommissions !== undefined) {
      update.artistOpenForCommissions = dto.artistOpenForCommissions;
    }

    if (dto.artistSocials !== undefined) {
      update.artistSocials = this.sanitizeSocialLinks(dto.artistSocials);
    }

    if (dto.artistHighlights !== undefined) {
      update.artistHighlights = dto.artistHighlights
        ?.map((value) => value.trim())
        .filter((value) => value.length > 0);
    }

    if (dto.artistGallery !== undefined) {
      update.artistGallery = dto.artistGallery
        ?.map((value) => value.trim())
        .filter((value) => value.length > 0 && this.isCloudinaryUrl(value));
    }

    Object.keys(update).forEach((key) => {
      if (update[key] === undefined) {
        delete update[key];
      }
    });

    await this.userModel.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    return this.userModel.findById(id);
  }

  async getArtistProfile(
    identifier: string,
    page: number = 1,
    limit: number = 12,
  ) {
    if (!identifier) {
      throw new BadRequestException('Identifier is required');
    }

    try {
      const query = isValidObjectId(identifier)
        ? { _id: new Types.ObjectId(identifier) }
        : { artistSlug: this.normalizeArtistSlug(identifier) };

      const artist = await this.userModel
        .findOne({ ...query, role: Role.Seller })
        .lean();

      if (!artist) {
        throw new NotFoundException('Artist profile not found');
      }

      const productsFilter = {
        user: artist._id,
        status: ProductStatus.APPROVED,
        // Exclude out-of-stock products from shop view
        $or: [{ countInStock: { $gt: 0 } }, { 'variants.stock': { $gt: 0 } }],
      };

      const skip = (page - 1) * limit;
      const portfolioFilter = {
        artistId: artist._id,
      };

      const [products, totalProducts, portfolioPosts, totalPortfolioPosts] =
        await Promise.all([
          this.productModel
            .find(productsFilter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select([
              'name',
              'price',
              'images',
              'brand',
              'brandLogo',
              'rating',
              'numReviews',
              'description',
              'discountPercentage',
              'discountStartDate',
              'discountEndDate',
              'countInStock',
              'variants',
              'deliveryType',
              'minDeliveryDays',
              'maxDeliveryDays',
              'createdAt',
            ])
            .lean(),
          this.productModel.countDocuments(productsFilter),
          this.portfolioPostModel
            .find(portfolioFilter)
            .populate({
              path: 'productId',
              select: 'status countInStock variants',
            })
            .sort({
              isFeatured: -1,
              // For featured items, sort by updatedAt (when they were marked as featured)
              // For non-featured items, this doesn't matter as publishedAt takes precedence
              updatedAt: -1,
              // publishedAt maintains original chronological order for non-featured items
              publishedAt: -1,
              createdAt: -1,
              _id: -1,
            })
            .limit(60)
            .select([
              'productId',
              'images',
              'caption',
              'tags',
              'likesCount',
              'commentsCount',
              'isFeatured',
              'updatedAt',
              'publishedAt',
              'createdAt',
            ])
            .lean()
            .then((posts) => {
              // Post-process to apply conditional sorting:
              // Featured items: sort by updatedAt
              // Non-featured items: sort by publishedAt only
              const featured = posts
                .filter((p) => (p as any).isFeatured)
                .sort((a, b) => {
                  const aTime = new Date(
                    (a as any).updatedAt || (a as any).createdAt,
                  ).getTime();
                  const bTime = new Date(
                    (b as any).updatedAt || (b as any).createdAt,
                  ).getTime();
                  return bTime - aTime;
                });

              const nonFeatured = posts
                .filter((p) => !(p as any).isFeatured)
                .sort((a, b) => {
                  const aTime = new Date(
                    (a as any).publishedAt || (a as any).createdAt,
                  ).getTime();
                  const bTime = new Date(
                    (b as any).publishedAt || (b as any).createdAt,
                  ).getTime();
                  return bTime - aTime;
                });

              return [...featured, ...nonFeatured];
            }),
          this.portfolioPostModel.countDocuments(portfolioFilter),
        ]);

      const storeLogo = artist.storeLogoPath ?? artist.storeLogo ?? null;

      const biography =
        artist.artistBio instanceof Map
          ? Object.fromEntries(artist.artistBio)
          : typeof artist.artistBio === 'object' && artist.artistBio !== null
            ? { ...artist.artistBio }
            : {};

      const formattedPortfolioPosts = (portfolioPosts as any[]).map((post) => {
        return {
          id: (post._id as Types.ObjectId).toString(),
          productId: post.productId || null,
          caption: post.caption || null,
          tags: Array.isArray(post.tags) ? post.tags : [],
          images: Array.isArray(post.images) ? post.images : [],
          likesCount: post.likesCount || 0,
          commentsCount: post.commentsCount || 0,
          isFeatured: post.isFeatured || false,
          publishedAt: post.publishedAt || post.createdAt || null,
        };
      });

      const derivedGalleryUrls = formattedPortfolioPosts.flatMap((post) =>
        post.images
          .map((image) => image.url)
          .filter(
            (url) => typeof url === 'string' && this.isCloudinaryUrl(url),
          ),
      );

      const uniqueGalleryUrls: string[] = [];
      const seenGalleryUrls = new Set<string>();
      derivedGalleryUrls.forEach((url) => {
        if (!seenGalleryUrls.has(url)) {
          seenGalleryUrls.add(url);
          uniqueGalleryUrls.push(url);
        }
      });

      const legacyGallery = (artist.artistGallery ?? []).filter((url: string) =>
        this.isCloudinaryUrl(url),
      );

      const galleryUrls = uniqueGalleryUrls.length
        ? uniqueGalleryUrls
        : legacyGallery;

      return {
        artist: {
          id: artist._id.toString(),
          name: artist.name,
          storeName: artist.storeName ?? artist.name,
          artistSlug: artist.artistSlug ?? null,
          artistBio: biography,
          artistCoverImage: artist.artistCoverImage,
          artistDisciplines: artist.artistDisciplines ?? [],
          artistLocation: artist.artistLocation ?? null,
          artistOpenForCommissions: artist.artistOpenForCommissions ?? false,
          artistSocials: artist.artistSocials ?? {},
          followersCount: artist.followersCount ?? 0,
          followingCount: artist.followingCount ?? 0,
          artistHighlights: artist.artistHighlights ?? [],
          artistGallery: galleryUrls,
          storeLogo,
          artistRating: artist.artistRating ?? 0,
          artistReviewsCount: artist.artistReviewsCount ?? 0,
          artistDirectRating: artist.artistDirectRating ?? 0,
          artistDirectReviewsCount: artist.artistDirectReviewsCount ?? 0,
        },
        products: {
          total: totalProducts,
          page,
          limit,
          totalPages: Math.ceil(totalProducts / limit),
          hasMore: page * limit < totalProducts,
          items: products.map((product) => ({
            id: product._id.toString(),
            name: product.name,
            price: product.price,
            images: product.images,
            brand: product.brand,
            brandLogo: product.brandLogo ?? storeLogo,
            rating: product.rating,
            numReviews: product.numReviews,
            description: product.description,
            discountPercentage: product.discountPercentage,
            discountStartDate: product.discountStartDate ?? null,
            discountEndDate: product.discountEndDate ?? null,
            countInStock: product.countInStock,
            deliveryType: product.deliveryType,
            minDeliveryDays: product.minDeliveryDays,
            maxDeliveryDays: product.maxDeliveryDays,
            createdAt: (product as any).createdAt ?? null,
          })),
        },
        portfolio: {
          total: totalPortfolioPosts,
          posts: formattedPortfolioPosts,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to load artist profile for identifier "${identifier}": ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async getArtistProducts(
    identifier: string,
    page: number = 1,
    limit: number = 12,
    includeOwner: boolean = false,
  ) {
    if (!identifier) {
      throw new BadRequestException('Identifier is required');
    }

    try {
      const query = isValidObjectId(identifier)
        ? { _id: new Types.ObjectId(identifier) }
        : { artistSlug: this.normalizeArtistSlug(identifier) };

      const artist = await this.userModel
        .findOne({ ...query, role: Role.Seller })
        .lean();

      if (!artist) {
        throw new NotFoundException('Artist not found');
      }

      // If includeOwner is true, include all products (pending, approved, rejected)
      // Otherwise only show approved products that are in stock
      const productsFilter: any = {
        user: artist._id,
      };

      if (includeOwner) {
        // Owner can see all their products
        productsFilter.status = {
          $in: [
            ProductStatus.APPROVED,
            ProductStatus.PENDING,
            ProductStatus.REJECTED,
          ],
        };
      } else {
        productsFilter.status = ProductStatus.APPROVED;
        // Exclude out-of-stock products from shop view for non-owners
        productsFilter.$or = [
          { countInStock: { $gt: 0 } },
          { 'variants.stock': { $gt: 0 } },
        ];
      }

      const skip = (page - 1) * limit;
      const storeLogo = artist.storeLogoPath ?? artist.storeLogo ?? null;

      const selectFields = [
        'name',
        'price',
        'images',
        'brand',
        'brandLogo',
        'rating',
        'numReviews',
        'description',
        'discountPercentage',
        'discountStartDate',
        'discountEndDate',
        'countInStock',
        'variants',
        'deliveryType',
        'minDeliveryDays',
        'maxDeliveryDays',
        'createdAt',
      ];

      // Include status and rejectionReason for owner
      if (includeOwner) {
        selectFields.push('status', 'rejectionReason');
      }

      const [products, totalProducts] = await Promise.all([
        this.productModel
          .find(productsFilter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select(selectFields)
          .lean(),
        this.productModel.countDocuments(productsFilter),
      ]);

      return {
        total: totalProducts,
        page,
        limit,
        totalPages: Math.ceil(totalProducts / limit),
        hasMore: page * limit < totalProducts,
        items: products.map((product) => ({
          id: product._id.toString(),
          name: product.name,
          price: product.price,
          images: product.images,
          brand: product.brand,
          brandLogo: product.brandLogo ?? storeLogo,
          rating: product.rating,
          numReviews: product.numReviews,
          description: product.description,
          discountPercentage: product.discountPercentage,
          discountStartDate: product.discountStartDate ?? null,
          discountEndDate: product.discountEndDate ?? null,
          countInStock: product.countInStock,
          deliveryType: product.deliveryType,
          minDeliveryDays: product.minDeliveryDays,
          maxDeliveryDays: product.maxDeliveryDays,
          createdAt: (product as any).createdAt ?? null,
          ...(includeOwner && {
            status: product.status,
            rejectionReason: (product as any).rejectionReason ?? null,
          }),
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to load artist products for identifier "${identifier}": ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findByEmail(email: string) {
    // Convert to lowercase to ensure case-insensitive matching
    const lowercaseEmail = email.toLowerCase();
    return this.userModel.findOne({ email: lowercaseEmail }).exec();
  }

  async create(
    user: Partial<User> & { invitationCode?: string },
  ): Promise<UserDocument> {
    try {
      const existingUser = await this.findByEmail(
        user.email?.toLowerCase() ?? '',
      );

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      const hashedPassword = await hashPassword(user.password ?? '');

      // Store email in lowercase
      const newUser = await this.userModel.create({
        ...user,
        email: user.email?.toLowerCase(),
        password: hashedPassword,
        role: user.role ?? Role.User,
      });

      // რეფერალური კოდით რეგისტრაცია
      if (user.invitationCode && this.referralsService) {
        this.logger.log(
          `მუშაობს რეფერალური კოდით: ${user.invitationCode} მომხმარებლისთვის: ${newUser.email}`,
        );
        try {
          await this.referralsService.registerWithReferralCode(
            newUser._id.toString(),
            user.invitationCode,
          );
          this.logger.log(
            `რეფერალური კოდი წარმატებით დამუშავდა: ${user.invitationCode}`,
          );
        } catch (error) {
          this.logger.error(
            `რეფერალური კოდის დამუშავების შეცდომა: ${error.message}`,
            error.stack,
          );
          // არ ვაჩერებთ რეგისტრაციას რეფერალური კოდის შეცდომის გამო
        }
      }

      // Link any guest orders with this email to the new user account
      if (newUser.email && this.ordersService) {
        try {
          const result = await this.ordersService.linkGuestOrdersByEmail(
            newUser.email,
            newUser._id.toString(),
          );
          if (result.linkedCount > 0) {
            this.logger.log(
              `Linked ${result.linkedCount} guest order(s) to newly registered user: ${newUser.email}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to link guest orders for user ${newUser.email}: ${error.message}`,
            error.stack,
          );
          // Don't fail registration if order linking fails
        }
      }

      return newUser;
    } catch (error: any) {
      this.logger.error(`Failed to create user: ${error.message}`);

      if (error.code === 11000) {
        throw new BadRequestException('Email already exists');
      }

      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }

      throw new BadRequestException('Failed to create user');
    }
  }

  async createMany(users: Partial<User>[]): Promise<UserDocument[]> {
    try {
      const usersWithLowercaseEmails = users.map((user) => ({
        ...user,
        email: user.email?.toLowerCase(),
      }));
      return (await this.userModel.insertMany(
        usersWithLowercaseEmails,
      )) as unknown as UserDocument[];
    } catch (error: any) {
      this.logger.error(`Failed to create users: ${error.message}`);
      throw new BadRequestException('Failed to create users');
    }
  }

  async findOne(email: string): Promise<UserDocument | null> {
    return this.findByEmail(email);
  }

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findUsersByKeyword(keyword: string): Promise<UserDocument[]> {
    if (!keyword || keyword.trim() === '') {
      return [];
    }

    const users = await this.userModel
      .find({
        $or: [
          { email: { $regex: keyword, $options: 'i' } },
          { name: { $regex: keyword, $options: 'i' } },
          { storeName: { $regex: keyword, $options: 'i' } },
          { phoneNumber: { $regex: keyword, $options: 'i' } },
        ],
      })
      .select('_id')
      .limit(100) // Limit to avoid performance issues
      .exec();

    return users;
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: string,
  ): Promise<
    PaginatedResponse<UserDocument> & {
      summary: {
        totalUsers: number;
        roleCounts: Record<Role, number>;
      };
    }
  > {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit =
      Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;
    const normalizedLimit = Math.min(safeLimit, 100);
    const skip = (safePage - 1) * normalizedLimit;

    const filters: FilterQuery<User> = {};

    const normalizedRole = role?.toLowerCase();
    if (
      normalizedRole &&
      Object.values(Role).includes(normalizedRole as Role)
    ) {
      filters.role = normalizedRole as Role;
    }

    const trimmedSearch = search?.trim();
    if (trimmedSearch && trimmedSearch.length > 0) {
      const escapedKeyword = this.escapeRegex(trimmedSearch);
      filters.$or = [
        { email: { $regex: escapedKeyword, $options: 'i' } },
        { name: { $regex: escapedKeyword, $options: 'i' } },
        { storeName: { $regex: escapedKeyword, $options: 'i' } },
        { phoneNumber: { $regex: escapedKeyword, $options: 'i' } },
      ];
    }

    const [users, filteredTotal, overallTotal, roleAggregation] =
      await Promise.all([
        this.userModel
          .find(filters)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(normalizedLimit)
          .exec(),
        this.userModel.countDocuments(filters),
        this.userModel.countDocuments({}),
        this.userModel.aggregate<{ _id: Role; count: number }>([
          {
            $group: {
              _id: '$role',
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    const roleCounts: Record<Role, number> = {
      [Role.Admin]: 0,
      [Role.Seller]: 0,
      [Role.User]: 0,
      [Role.Blogger]: 0,
      [Role.SalesManager]: 0,
    };

    roleAggregation.forEach(({ _id, count }) => {
      if (_id && Object.values(Role).includes(_id)) {
        roleCounts[_id] = count;
      }
    });

    const totalPages = Math.max(Math.ceil(filteredTotal / normalizedLimit), 1);

    return {
      items: users,
      total: filteredTotal,
      page: safePage,
      pages: totalPages,
      summary: {
        totalUsers: overallTotal,
        roleCounts,
      },
    };
  }

  async deleteOne(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const result = await this.userModel.findOneAndDelete({ _id: id });
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async update(
    id: string,
    attrs: Partial<User>,
    adminRole = false,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Only validate email if it's being updated
    if (attrs.email && attrs.email !== user.email) {
      attrs.email = attrs.email.toLowerCase();

      const existingUser = await this.findByEmail(attrs.email);
      if (existingUser && existingUser._id.toString() !== id) {
        throw new BadRequestException('Email is already in use');
      }
    }

    // Handle password update if provided
    if (attrs.password && !adminRole) {
      const passwordMatch = await bcrypt.compare(attrs.password, user.password);
      if (passwordMatch) {
        throw new BadRequestException(
          'New password must be different from the current password',
        );
      }
      attrs.password = await hashPassword(attrs.password);
    }

    // Prepare update data, filter out undefined values
    const updateData = { ...attrs };

    // Prevent role changes unless admin
    if (!adminRole) delete updateData.role;

    // Filter out undefined values to ensure only provided fields are updated
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true },
      );

      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // If storeLogoPath was updated for a seller, also update their products
      if (updateData.storeLogoPath && user.role === Role.Seller) {
        try {
          const updateResult = await this.productModel.updateMany(
            {
              user: id,
              brand: user.name, // Only update products where brand matches seller name
            },
            {
              brandLogo: updateData.storeLogoPath,
            },
          );

          this.logger.log(
            `Updated ${updateResult.modifiedCount} products with new logo for seller ${user.name}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to update products with new logo for seller ${user.name}:`,
            error.message,
          );
          // Don't throw error here - user update was successful, product update is secondary
        }
      }

      this.logger.log(`User ${id} updated successfully`);
      return updatedUser;
    } catch (error: any) {
      this.logger.error(`Failed to update user ${id}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to update user');
    }
  }

  async adminUpdate(id: string, updateDto: AdminProfileDto) {
    try {
      const user = await this.userModel.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Convert email to lowercase if provided
      if (updateDto.email) {
        updateDto.email = updateDto.email.toLowerCase();

        // Check if the email is already in use by another user
        const existingUser = await this.findByEmail(updateDto.email);
        if (existingUser && existingUser._id.toString() !== id) {
          throw new ConflictException('Email already exists');
        }
      }

      const updateData: Partial<User> = {};

      if (updateDto.name) {
        updateData.name = updateDto.name;
      }

      if (updateDto.email) {
        updateData.email = updateDto.email;
      }

      if (updateDto.role) {
        updateData.role = updateDto.role;
      }

      if (updateDto.password && updateDto.password.trim() !== '') {
        this.logger.log('Updating password for user', id);
        updateData.password = await hashPassword(updateDto.password);
      }

      // სელერის ველების განახლება
      if (updateDto.storeName !== undefined) {
        updateData.storeName = updateDto.storeName;
      }

      if (updateDto.ownerFirstName !== undefined) {
        updateData.ownerFirstName = updateDto.ownerFirstName;
      }

      if (updateDto.ownerLastName !== undefined) {
        updateData.ownerLastName = updateDto.ownerLastName;
      }

      if (updateDto.phoneNumber !== undefined) {
        updateData.phoneNumber = updateDto.phoneNumber;
      }

      if (updateDto.identificationNumber !== undefined) {
        updateData.identificationNumber = updateDto.identificationNumber;
      }

      if (updateDto.accountNumber !== undefined) {
        updateData.accountNumber = updateDto.accountNumber;
      }

      // Sales Manager საკომისიო პროცენტის განახლება
      if (updateDto.salesCommissionRate !== undefined) {
        updateData.salesCommissionRate = updateDto.salesCommissionRate;
      }

      if (Object.keys(updateData).length === 0) {
        return user;
      }

      const updatedUser = await this.userModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true, context: 'query' },
      );

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      return updatedUser;
    } catch (error) {
      this.logger.error(`Failed to update user: ${error.message}`);
      throw error;
    }
  }

  async deleteMany(): Promise<void> {
    try {
      await this.userModel.deleteMany({});
      this.logger.log('All users deleted successfully');
    } catch (error: any) {
      this.logger.error(`Failed to delete users: ${error.message}`);
      throw new BadRequestException('Failed to delete users');
    }
  }

  async generateUsers(count: number): Promise<UserDocument[]> {
    const generatedUsers = await generateUsers(count);
    return this.createMany(generatedUsers);
  }

  /**
   * Generate a unique artist slug for a new seller
   */
  private async generateUniqueArtistSlug(
    storeName?: string,
    email?: string,
    name?: string,
  ): Promise<string> {
    // Generate base slug
    const baseSlug = generateBaseArtistSlug(storeName, email, name);

    // If base slug is empty or too short, use a default
    let slug = baseSlug || 'artist';
    if (slug.length < 3) {
      slug = 'artist';
    }

    // Check if slug already exists
    let counter = 1;
    let uniqueSlug = slug;

    while (true) {
      const existingUser = await this.userModel
        .findOne({
          artistSlug: uniqueSlug,
        })
        .lean();

      if (!existingUser) {
        // Slug is unique, we can use it
        break;
      }

      // Slug exists, try with counter
      uniqueSlug = `${slug}${counter}`;
      counter++;

      // Safety check to prevent infinite loop
      if (counter > 9999) {
        uniqueSlug = `${slug}${Date.now()}`;
        break;
      }
    }

    this.logger.log(
      `Generated unique artist slug: ${uniqueSlug} (base: ${baseSlug})`,
    );
    return uniqueSlug;
  }

  async createSeller(dto: SellerRegisterDto): Promise<UserDocument> {
    try {
      const existingUser = await this.findByEmail(dto.email.toLowerCase());
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      let resolvedArtistSlug: string;

      if (dto.artistSlug) {
        const normalizedSlug = this.normalizeArtistSlug(dto.artistSlug);
        const slugCheck = await this.isArtistSlugAvailable(normalizedSlug);

        if (!slugCheck.available) {
          throw new ConflictException(
            slugCheck.reason === 'reserved'
              ? 'This artist slug is reserved'
              : 'This artist slug is already taken',
          );
        }

        resolvedArtistSlug = normalizedSlug;
      } else {
        resolvedArtistSlug = await this.generateUniqueArtistSlug(
          dto.storeName,
          dto.email,
          dto.storeName,
        );
      }

      const sellerData = {
        ...dto,
        name: dto.storeName,
        email: dto.email.toLowerCase(),
        role: Role.Seller,
        password: dto.password,
        artistSlug: resolvedArtistSlug,
      };

      return await this.create(sellerData);
    } catch (error: any) {
      this.logger.error(`Failed to create seller: ${error.message}`);

      if (error.code === 11000) {
        throw new ConflictException('User with this email already exists');
      }

      throw error;
    }
  }

  async createSellerWithLogo(
    dto: SellerRegisterDto,
    logoFile?: Express.Multer.File,
  ): Promise<UserDocument> {
    try {
      const existingUser = await this.findByEmail(dto.email.toLowerCase());
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      let resolvedArtistSlug: string;

      if (dto.artistSlug) {
        const normalizedSlug = this.normalizeArtistSlug(dto.artistSlug);
        const slugCheck = await this.isArtistSlugAvailable(normalizedSlug);

        if (!slugCheck.available) {
          throw new ConflictException(
            slugCheck.reason === 'reserved'
              ? 'This artist slug is reserved'
              : 'This artist slug is already taken',
          );
        }

        resolvedArtistSlug = normalizedSlug;
      } else {
        resolvedArtistSlug = await this.generateUniqueArtistSlug(
          dto.storeName,
          dto.email,
          dto.ownerFirstName + ' ' + dto.ownerLastName,
        );
      }

      // Create the seller account first
      const sellerData = {
        ...dto,
        name: dto.storeName,
        email: dto.email.toLowerCase(),
        role: Role.Seller,
        password: dto.password,
        artistSlug: resolvedArtistSlug,
      };

      const seller = await this.create(sellerData);

      // If logo file is provided, upload it to S3
      if (logoFile) {
        try {
          const timestamp = Date.now();
          const filePath = `seller-logos/${timestamp}-${logoFile.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

          // Upload logo to Cloudinary instead of S3
          const logoUrl =
            await this.userCloudinaryService.uploadSellerLogo(logoFile);

          // Update the seller record with the logo URL
          await this.userModel.findByIdAndUpdate(seller._id, {
            storeLogoPath: logoUrl,
          });

          this.logger.log(`Logo uploaded for seller ${seller._id}`);
        } catch (error) {
          this.logger.error(`Failed to upload seller logo: ${error.message}`);
          // Continue even if logo upload fails - the account has been created
        }
      }

      return seller;
    } catch (error: any) {
      this.logger.error(`Failed to create seller: ${error.message}`);

      if (error.code === 11000) {
        throw new ConflictException('User with this email already exists');
      }

      throw error;
    }
  }

  async updateProfileImage(
    userId: string,
    filePath: string,
    fileBuffer: Buffer,
  ) {
    try {
      const user = await this.userModel.findById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Create a multer file object from buffer for Cloudinary service
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: filePath.split('/').pop() || 'profile-image.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg', // Default, will be detected by Cloudinary
        buffer: fileBuffer,
        size: fileBuffer.length,
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      // Upload to Cloudinary
      const imageUrl =
        await this.userCloudinaryService.uploadProfileImage(file);

      // Store the full Cloudinary URL
      await this.userModel.findByIdAndUpdate(userId, {
        profileImagePath: imageUrl,
      });

      return {
        message: 'Profile image updated successfully',
        profileImage: imageUrl,
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to update profile image: ' + error.message,
      );
    }
  }

  async updateSellerLogo(userId: string, filePath: string, fileBuffer: Buffer) {
    try {
      const user = await this.userModel.findById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.role !== Role.Seller) {
        throw new BadRequestException('Only sellers can update store logos');
      }

      // Create a multer file object from buffer for Cloudinary service
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: filePath.split('/').pop() || 'store-logo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg', // Default, will be detected by Cloudinary
        buffer: fileBuffer,
        size: fileBuffer.length,
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      // Upload to Cloudinary
      const logoUrl = await this.userCloudinaryService.uploadSellerLogo(file);

      // Store the full Cloudinary URL for both logo and profile image
      // For sellers, logo = profile image (unified)
      await this.userModel.findByIdAndUpdate(userId, {
        storeLogoPath: logoUrl,
        storeLogo: logoUrl,
        profileImagePath: logoUrl, // Seller's logo is also their profile image
      });

      // Update all products of this seller to use the new logo
      try {
        const updateResult = await this.productModel.updateMany(
          {
            user: userId,
            brand: user.name, // Only update products where brand matches seller name
          },
          {
            brandLogo: logoUrl,
          },
        );

        this.logger.log(
          `Updated ${updateResult.modifiedCount} products with new logo for seller ${user.name}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to update products with new logo for seller ${user.name}:`,
          error.message,
        );
        // Don't throw error here - seller logo update was successful, product update is secondary
      }

      return {
        message: 'Store logo updated successfully',
        logoUrl: logoUrl,
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to update store logo: ' + error.message,
      );
    }
  }

  async uploadImage(filePath: string, fileBuffer: Buffer): Promise<string> {
    try {
      // Use CloudinaryService directly for buffer uploads
      const result = await this.cloudinaryService.uploadBuffer(
        fileBuffer,
        undefined, // Let Cloudinary generate public ID
        'artists/profiles', // Folder for user profile images
        'image',
      );
      return result.secure_url;
    } catch (error) {
      this.logger.error(`Failed to upload image: ${error.message}`);
      throw new BadRequestException('Failed to upload image: ' + error.message);
    }
  }

  async getProfileData(userId: string) {
    const user = await this.userModel.findById(userId, { password: 0 });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get profile image URL if it exists
    let profileImage = null;
    if (user.profileImagePath) {
      // All images should now be Cloudinary URLs
      if (user.profileImagePath.startsWith('http')) {
        profileImage = user.profileImagePath;
      }
      // If not an HTTP URL, skip (shouldn't happen after migration)
    } else if (user.role === Role.Seller && user.storeLogoPath) {
      // If user is a seller and has no profile image but has a store logo,
      // use the store logo as the profile image
      if (user.storeLogoPath.startsWith('http')) {
        profileImage = user.storeLogoPath;
      }
      // If not an HTTP URL, skip (shouldn't happen after migration)
    }

    // If user is a seller, get store logo URL
    let storeLogo = null;
    if (user.role === Role.Seller && user.storeLogoPath) {
      // All images should now be Cloudinary URLs
      if (user.storeLogoPath.startsWith('http')) {
        storeLogo = user.storeLogoPath;
      }
      // If not an HTTP URL, skip (shouldn't happen after migration)
    }

    return {
      ...user.toObject(),
      profileImage,
      storeLogo,
      balance:
        user.role === Role.Seller
          ? await this.getSellerBalanceInfo(userId)
          : null,
    };
  }

  async getSellerBalanceInfo(sellerId: string) {
    try {
      const balance = await this.balanceService.getSellerBalance(sellerId);
      return (
        balance || {
          totalBalance: 0,
          totalEarnings: 0,
          pendingWithdrawals: 0,
          totalWithdrawn: 0,
        }
      );
    } catch (error) {
      this.logger.error(`Failed to get seller balance: ${error.message}`);
      return {
        totalBalance: 0,
        totalEarnings: 0,
        pendingWithdrawals: 0,
        totalWithdrawn: 0,
      };
    }
  }

  async getProfileImageUrl(profileImagePath: string): Promise<string | null> {
    if (!profileImagePath) return null;

    // All images should now be Cloudinary URLs
    if (profileImagePath.startsWith('http')) {
      return profileImagePath;
    }

    // If not an HTTP URL, return null (shouldn't happen after migration)
    return null;
  }

  async remove(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove user's profile image if exists
    if (user.profileImagePath) {
      try {
        // Extract public ID from Cloudinary URL and delete
        const publicId = this.extractPublicIdFromUrl(
          user.profileImagePath as string,
        );
        if (publicId) {
          await this.cloudinaryService.deleteResource(publicId, 'image');
        }
      } catch (error) {
        console.error('Failed to delete profile image', error);
        // Continue even if image deletion fails
      }
    }

    await this.userModel.findByIdAndDelete(id);
    return { message: 'User deleted successfully' };
  }

  // Helper method to extract Cloudinary public ID from URL
  private extractPublicIdFromUrl(url: string): string | null {
    if (!url) return null;

    // Extract public ID from Cloudinary URL
    // Example: https://res.cloudinary.com/<cloud>/image/upload/v123456/folder/filename.jpg
    const matches = url.match(/\/([^\/]+\/[^\/]+)\.(jpg|jpeg|png|gif|webp)$/i);
    return matches ? matches[1] : null;
  }

  // Migration helper methods
  async findSellersWithS3Logos() {
    return this.userModel
      .find({
        role: Role.Seller,
        storeLogoPath: { $regex: 's3', $options: 'i' },
      })
      .exec();
  }

  async updateSellerLogoPath(userId: string, newLogoPath: string) {
    return this.userModel.findByIdAndUpdate(userId, {
      storeLogoPath: newLogoPath,
    });
  }

  async upgradeToSeller(
    userId: string,
    becomeSellerDto: BecomeSellerDto,
    logoFile?: Express.Multer.File,
  ): Promise<UserDocument> {
    try {
      const user = await this.findById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.role === Role.Seller) {
        throw new ConflictException('User is already a seller');
      }

      // Prepare update data with existing user data
      const updateData: Partial<User> = {
        role: Role.Seller,
        storeName: becomeSellerDto.storeName,
        identificationNumber: becomeSellerDto.identificationNumber,
        accountNumber: becomeSellerDto.accountNumber,
        beneficiaryBankCode: becomeSellerDto.beneficiaryBankCode,
      };

      // Auto-populate owner first and last name from existing user name
      if (user.name) {
        const nameParts = user.name.trim().split(/\s+/);
        updateData.ownerFirstName = nameParts[0] || '';
        updateData.ownerLastName = nameParts.slice(1).join(' ') || '';

        this.logger.log(
          `Auto-populated owner names: ${updateData.ownerFirstName} ${updateData.ownerLastName}`,
        );
      }

      // Only update phone number if provided and different from existing
      if (
        becomeSellerDto.phoneNumber &&
        becomeSellerDto.phoneNumber !== user.phoneNumber
      ) {
        updateData.phoneNumber = becomeSellerDto.phoneNumber;
      }

      // Handle logo upload if provided
      if (logoFile) {
        // Validate file type and size (same as existing logic)
        const validMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/heic',
          'image/heif',
        ];

        if (!validMimeTypes.includes(logoFile.mimetype.toLowerCase())) {
          throw new BadRequestException(
            `Unsupported file type: ${logoFile.mimetype}. Supported types: JPEG, PNG, GIF, WEBP.`,
          );
        }

        const filesSizeInMb = Number(
          (logoFile.size / (1024 * 1024)).toFixed(1),
        );
        if (filesSizeInMb > 5) {
          throw new BadRequestException('The file must be less than 5 MB.');
        }

        const timestamp = Date.now();
        const filePath = `seller-logos/${timestamp}-${logoFile.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        try {
          // Upload logo to cloud storage
          const logoUrl = await this.uploadImage(filePath, logoFile.buffer);
          updateData.storeLogoPath = filePath;
          updateData.storeLogo = logoUrl;
        } catch (uploadError) {
          this.logger.error('Failed to upload seller logo:', uploadError);
          throw new BadRequestException('Failed to upload store logo');
        }
      } else if (becomeSellerDto.storeLogo) {
        // If logo URL is provided instead of file
        updateData.storeLogo = becomeSellerDto.storeLogo;
      }

      // Handle referral code if provided (simplified)
      if (becomeSellerDto.invitationCode && this.referralsService) {
        try {
          // TODO: Add referral code processing logic here if needed
          this.logger.log(
            `Referral code provided: ${becomeSellerDto.invitationCode}`,
          );
        } catch (referralError) {
          this.logger.warn(
            `Referral code processing failed: ${referralError.message}`,
          );
        }
      }

      // Resolve artist slug either from user input or auto-generated suggestion
      const requestedSlug = becomeSellerDto.artistSlug?.trim();
      let resolvedArtistSlug: string;

      if (requestedSlug) {
        const normalizedSlug = this.normalizeArtistSlug(requestedSlug);
        const slugCheck = await this.isArtistSlugAvailable(
          normalizedSlug,
          userId,
        );

        if (!slugCheck.available) {
          throw new ConflictException(
            slugCheck.reason === 'reserved'
              ? 'This artist slug is reserved'
              : 'This artist slug is already taken',
          );
        }

        resolvedArtistSlug = normalizedSlug;
      } else {
        resolvedArtistSlug = await this.generateUniqueArtistSlug(
          becomeSellerDto.storeName,
          user.email ?? undefined,
          user.name ?? becomeSellerDto.storeName,
        );
      }

      updateData.artistSlug = resolvedArtistSlug;

      // Update user in database
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        updateData,
        { new: true },
      );

      if (!updatedUser) {
        throw new NotFoundException('User not found during update');
      }

      // Create balance account for new seller (if balance service is available)
      if (this.balanceService) {
        try {
          // TODO: Implement balance creation logic if needed
          this.logger.log(
            `Balance account creation pending for new seller: ${userId}`,
          );
        } catch (balanceError) {
          this.logger.warn(
            `Balance setup note for seller ${userId}:`,
            balanceError,
          );
        }
      }

      this.logger.log(`User ${userId} successfully upgraded to seller`);
      return updatedUser;
    } catch (error: any) {
      this.logger.error(`Failed to upgrade user ${userId} to seller:`, error);

      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to upgrade to seller: ${error.message}`,
      );
    }
  }

  // ============================================
  // FOLLOWER SYSTEM METHODS
  // ============================================

  /**
   * Follow an artist/seller
   */
  async followUser(followerId: string, targetUserId: string): Promise<void> {
    if (followerId === targetUserId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    // Check if users exist
    const [follower, target] = await Promise.all([
      this.findById(followerId),
      this.findById(targetUserId),
    ]);

    if (!follower || !target) {
      throw new NotFoundException('User not found');
    }

    // Only allow following sellers (artists)
    if (target.role !== Role.Seller) {
      throw new BadRequestException('You can only follow artists');
    }

    // Check if already following
    if (follower.following?.includes(targetUserId)) {
      throw new BadRequestException('You are already following this artist');
    }

    // Update both users atomically
    const session = await this.userModel.db.startSession();

    try {
      await session.withTransaction(async () => {
        // Add to follower's following list
        await this.userModel.updateOne(
          { _id: followerId },
          {
            $addToSet: { following: targetUserId },
            $inc: { followingCount: 1 },
          },
          { session },
        );

        // Add to target's followers list
        await this.userModel.updateOne(
          { _id: targetUserId },
          {
            $addToSet: { followers: followerId },
            $inc: { followersCount: 1 },
          },
          { session },
        );
      });

      this.logger.log(`User ${followerId} followed artist ${targetUserId}`);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Unfollow an artist/seller
   */
  async unfollowUser(followerId: string, targetUserId: string): Promise<void> {
    if (followerId === targetUserId) {
      throw new BadRequestException('Invalid operation');
    }

    // Check if users exist
    const [follower, target] = await Promise.all([
      this.findById(followerId),
      this.findById(targetUserId),
    ]);

    if (!follower || !target) {
      throw new NotFoundException('User not found');
    }

    // Check if currently following
    if (!follower.following?.includes(targetUserId)) {
      throw new BadRequestException('You are not following this artist');
    }

    // Update both users atomically
    const session = await this.userModel.db.startSession();

    try {
      await session.withTransaction(async () => {
        // Remove from follower's following list
        await this.userModel.updateOne(
          { _id: followerId },
          {
            $pull: { following: targetUserId },
            $inc: { followingCount: -1 },
          },
          { session },
        );

        // Remove from target's followers list
        await this.userModel.updateOne(
          { _id: targetUserId },
          {
            $pull: { followers: followerId },
            $inc: { followersCount: -1 },
          },
          { session },
        );
      });

      this.logger.log(`User ${followerId} unfollowed artist ${targetUserId}`);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(
    followerId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const follower = await this.userModel
      .findById(followerId)
      .select('following')
      .lean();
    return follower?.following?.includes(targetUserId) || false;
  }

  /**
   * Get followers list for an artist
   */
  async getFollowers(
    artistId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<any>> {
    const artist = await this.findById(artistId);
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    if (artist.role !== Role.Seller) {
      throw new BadRequestException('Only artists have followers');
    }

    console.log('Artist found:', {
      id: artist._id,
      name: artist.name,
      followersArray: artist.followers,
      followersCount: artist.followersCount,
    });

    const skip = (page - 1) * limit;

    const followers = await this.userModel.aggregate([
      { $match: { _id: new Types.ObjectId(artistId) } },
      { $unwind: { path: '$followers', preserveNullAndEmptyArrays: false } },
      { $skip: skip },
      { $limit: limit },
      {
        $addFields: {
          followerObjectId: { $toObjectId: '$followers' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'followerObjectId',
          foreignField: '_id',
          as: 'followerDetails',
        },
      },
      { $unwind: '$followerDetails' },
      {
        $project: {
          _id: '$followerDetails._id',
          name: '$followerDetails.name',
          email: '$followerDetails.email',
          profileImagePath: '$followerDetails.profileImagePath',
          role: '$followerDetails.role',
          storeName: '$followerDetails.storeName',
          artistSlug: '$followerDetails.artistSlug',
        },
      },
    ]);

    console.log('Aggregation result:', {
      followersFound: followers.length,
      followers: followers,
    });

    const total = artist.followersCount || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      items: followers,
      total,
      page,
      pages: totalPages,
    };
  }

  /**
   * Get following list for a user
   */
  async getFollowing(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<any>> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const skip = (page - 1) * limit;

    const following = await this.userModel.aggregate([
      { $match: { _id: new Types.ObjectId(userId) } },
      { $unwind: { path: '$following', preserveNullAndEmptyArrays: false } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'following',
          foreignField: '_id',
          as: 'followingDetails',
        },
      },
      { $unwind: '$followingDetails' },
      {
        $project: {
          _id: '$followingDetails._id',
          name: '$followingDetails.name',
          storeName: '$followingDetails.storeName',
          artistSlug: '$followingDetails.artistSlug',
          profileImagePath: '$followingDetails.profileImagePath',
          storeLogo: '$followingDetails.storeLogo',
          artistCoverImage: '$followingDetails.artistCoverImage',
        },
      },
    ]);

    const total = user.followingCount || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      items: following,
      total,
      page,
      pages: totalPages,
    };
  }

  // ============ Shipping Address Management ============

  async getShippingAddresses(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.shippingAddresses || [];
  }

  async addShippingAddress(userId: string, addressData: any) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newAddress = {
      _id: new Types.ObjectId().toString(),
      label: addressData.label || 'Home',
      address: addressData.address,
      city: addressData.city,
      postalCode: addressData.postalCode,
      country: addressData.country,
      phoneNumber: addressData.phoneNumber,
      isDefault: addressData.isDefault || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // If this is set as default, unset all other defaults
    if (newAddress.isDefault && user.shippingAddresses) {
      user.shippingAddresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // If this is the first address, make it default
    if (!user.shippingAddresses || user.shippingAddresses.length === 0) {
      newAddress.isDefault = true;
    }

    if (!user.shippingAddresses) {
      user.shippingAddresses = [];
    }

    user.shippingAddresses.push(newAddress);
    await user.save();

    return newAddress;
  }

  async updateShippingAddress(
    userId: string,
    addressId: string,
    addressData: any,
  ) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.shippingAddresses) {
      throw new NotFoundException('No addresses found');
    }

    const addressIndex = user.shippingAddresses.findIndex(
      (addr) => addr._id.toString() === addressId,
    );

    if (addressIndex === -1) {
      throw new NotFoundException('Address not found');
    }

    // If setting as default, unset all other defaults
    if (addressData.isDefault) {
      user.shippingAddresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // Update the address properties directly (don't use spread to preserve _id)
    const address = user.shippingAddresses[addressIndex];
    if (addressData.label !== undefined) address.label = addressData.label;
    if (addressData.address !== undefined)
      address.address = addressData.address;
    if (addressData.city !== undefined) address.city = addressData.city;
    if (addressData.postalCode !== undefined)
      address.postalCode = addressData.postalCode;
    if (addressData.country !== undefined)
      address.country = addressData.country;
    if (addressData.phoneNumber !== undefined)
      address.phoneNumber = addressData.phoneNumber;
    if (addressData.isDefault !== undefined)
      address.isDefault = addressData.isDefault;
    address.updatedAt = new Date();

    await user.save();

    return address;
  }

  async deleteShippingAddress(userId: string, addressId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.shippingAddresses) {
      throw new NotFoundException('No addresses found');
    }

    const initialLength = user.shippingAddresses.length;
    user.shippingAddresses = user.shippingAddresses.filter(
      (addr) => addr._id.toString() !== addressId,
    );

    if (user.shippingAddresses.length === initialLength) {
      throw new NotFoundException('Address not found');
    }

    // If we deleted the default address, make the first remaining address default
    const hadDefault = user.shippingAddresses.some((addr) => addr.isDefault);
    if (!hadDefault && user.shippingAddresses.length > 0) {
      user.shippingAddresses[0].isDefault = true;
    }

    await user.save();

    return { message: 'Address deleted successfully' };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.shippingAddresses) {
      throw new NotFoundException('No addresses found');
    }

    const address = user.shippingAddresses.find(
      (addr) => addr._id.toString() === addressId,
    );
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Unset all defaults
    user.shippingAddresses.forEach((addr) => {
      addr.isDefault = false;
    });

    // Set the new default
    address.isDefault = true;
    await user.save();

    return address;
  }

  /**
   * Submit a direct review for an artist (seller)
   */
  async submitArtistReview(
    userId: string,
    artistId: string,
    rating: number,
    comment?: string,
  ) {
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Prevent self-review
    if (userId === artistId) {
      throw new BadRequestException('You cannot review yourself');
    }

    // Find the artist
    const artist = await this.userModel.findById(artistId).exec();
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    if (artist.role !== Role.Seller) {
      throw new BadRequestException('User is not an artist/seller');
    }

    // Check if user already reviewed this artist
    const existingReviewIndex = artist.artistDirectReviews?.findIndex(
      (review) => review.userId.toString() === userId,
    );

    if (existingReviewIndex !== undefined && existingReviewIndex >= 0) {
      // Update existing review
      artist.artistDirectReviews![existingReviewIndex] = {
        userId,
        rating,
        comment,
        createdAt: new Date(),
      };
    } else {
      // Add new review
      if (!artist.artistDirectReviews) {
        artist.artistDirectReviews = [];
      }
      artist.artistDirectReviews.push({
        userId,
        rating,
        comment,
        createdAt: new Date(),
      });
    }

    // Recalculate direct rating
    const totalRating = artist.artistDirectReviews.reduce(
      (sum, review) => sum + review.rating,
      0,
    );
    artist.artistDirectRating =
      artist.artistDirectReviews.length > 0
        ? totalRating / artist.artistDirectReviews.length
        : 0;
    artist.artistDirectReviewsCount = artist.artistDirectReviews.length;

    await artist.save();

    this.logger.log(
      `User ${userId} reviewed artist ${artistId} with rating ${rating}`,
    );

    return {
      message: 'Review submitted successfully',
      artistDirectRating: artist.artistDirectRating,
      artistDirectReviewsCount: artist.artistDirectReviewsCount,
    };
  }

  /**
   * Get all direct reviews for an artist
   */
  async getArtistReviews(artistId: string) {
    const artist = await this.userModel
      .findById(artistId)
      .populate('artistDirectReviews.userId', 'name email')
      .exec();

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    return {
      artistDirectRating: artist.artistDirectRating ?? 0,
      artistDirectReviewsCount: artist.artistDirectReviewsCount ?? 0,
      reviews: artist.artistDirectReviews ?? [],
    };
  }

  /**
   * მიიღე ყველა სელერი მეილისთვის
   */
  async getSellersForBulkEmail(): Promise<
    Array<{ _id: string; name: string; email: string; brandName?: string }>
  > {
    const sellers = await this.userModel
      .find({ role: Role.Seller })
      .select('_id name email storeName')
      .lean();

    return sellers.map((s) => ({
      _id: s._id.toString(),
      name: s.name,
      email: s.email,
      brandName: s.storeName,
    }));
  }

  /**
   * გაუგზავნე მეილი არჩეულ სელერებს ინდივიდუალურად (ფონური პროცესი)
   */
  async sendBulkEmailToSellers(
    subject: string,
    message: string,
    sellerIds?: string[],
  ): Promise<{
    success: boolean;
    totalQueued: number;
    message: string;
  }> {
    if (!this.emailService) {
      throw new BadRequestException('Email service is not available');
    }

    // თუ sellerIds მითითებულია, მხოლოდ არჩეულ სელერებს ვუგზავნით
    const query: any = { role: Role.Seller };
    if (sellerIds && sellerIds.length > 0) {
      query._id = { $in: sellerIds };
    }

    const sellers = await this.userModel
      .find(query)
      .select('name email storeName artistSlug')
      .lean();

    if (sellers.length === 0) {
      return {
        success: true,
        totalQueued: 0,
        message: 'სელერები ვერ მოიძებნა',
      };
    }

    // დაუყოვნებლივ ვაბრუნებთ response-ს
    const totalQueued = sellers.length;
    this.logger.log(`Starting background email send to ${totalQueued} sellers`);

    // ფონურ პროცესში ვგზავნით მეილებს batch-ებად
    this.sendEmailsInBackground(sellers, subject, message).catch((error) => {
      this.logger.error(`Background email sending failed: ${error.message}`);
    });

    return {
      success: true,
      totalQueued,
      message: `${totalQueued} სელერისთვის მეილის გაგზავნა დაიწყო ფონურ რეჟიმში`,
    };
  }

  /**
   * ფონურად გაგზავნა batch-ებად
   */
  private async sendEmailsInBackground(
    sellers: Array<{
      email: string;
      storeName?: string;
      name: string;
      artistSlug?: string;
    }>,
    subject: string,
    message: string,
  ): Promise<void> {
    const BATCH_SIZE = 10; // თითო batch-ში 10 მეილი
    const DELAY_BETWEEN_BATCHES = 2000; // 2 წამი batch-ებს შორის
    const DELAY_BETWEEN_EMAILS = 200; // 200ms მეილებს შორის

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < sellers.length; i += BATCH_SIZE) {
      const batch = sellers.slice(i, i + BATCH_SIZE);

      for (const seller of batch) {
        try {
          await this.emailService.sendBulkMessageToSeller(
            seller.email,
            seller.storeName || seller.name,
            subject,
            message,
            seller.artistSlug,
          );
          sent++;
          this.logger.log(
            `Email sent to seller: ${seller.email} (${sent}/${sellers.length})`,
          );
        } catch (error) {
          failed++;
          this.logger.error(
            `Failed to send to ${seller.email}: ${error.message}`,
          );
        }

        // დაყოვნება მეილებს შორის
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_EMAILS),
        );
      }

      // დაყოვნება batch-ებს შორის (თუ კიდევ არის batch-ები)
      if (i + BATCH_SIZE < sellers.length) {
        this.logger.log(
          `Batch completed. Waiting before next batch... (${sent}/${sellers.length} sent)`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_BATCHES),
        );
      }
    }

    this.logger.log(
      `Background email sending completed: ${sent} sent, ${failed} failed`,
    );
  }

  /**
   * მიიღე ყველა მომხმარებელი (კლიენტი) მეილისთვის
   */
  async getCustomersForBulkEmail(): Promise<
    Array<{ _id: string; name: string; email: string }>
  > {
    const customers = await this.userModel
      .find({ role: Role.User })
      .select('_id name email')
      .lean();

    return customers.map((c) => ({
      _id: c._id.toString(),
      name: c.name,
      email: c.email,
    }));
  }

  /**
   * გაუგზავნე მეილი არჩეულ მომხმარებლებს ინდივიდუალურად (ფონური პროცესი)
   */
  async sendBulkEmailToCustomers(
    subject: string,
    message: string,
    customerIds?: string[],
  ): Promise<{
    success: boolean;
    totalQueued: number;
    message: string;
  }> {
    if (!this.emailService) {
      throw new BadRequestException('Email service is not available');
    }

    // თუ customerIds მითითებულია, მხოლოდ არჩეულ მომხმარებლებს ვუგზავნით
    const query: any = { role: Role.User };
    if (customerIds && customerIds.length > 0) {
      query._id = { $in: customerIds };
    }

    const customers = await this.userModel
      .find(query)
      .select('name email')
      .lean();

    if (customers.length === 0) {
      return {
        success: true,
        totalQueued: 0,
        message: 'მომხმარებლები ვერ მოიძებნა',
      };
    }

    // დაუყოვნებლივ ვაბრუნებთ response-ს
    const totalQueued = customers.length;
    this.logger.log(
      `Starting background email send to ${totalQueued} customers`,
    );

    // ფონურ პროცესში ვგზავნით მეილებს batch-ებად
    this.sendCustomerEmailsInBackground(customers, subject, message).catch(
      (error) => {
        this.logger.error(
          `Background customer email sending failed: ${error.message}`,
        );
      },
    );

    return {
      success: true,
      totalQueued,
      message: `${totalQueued} მომხმარებლისთვის მეილის გაგზავნა დაიწყო ფონურ რეჟიმში`,
    };
  }

  /**
   * ფონურად გაგზავნა მომხმარებლებისთვის batch-ებად
   */
  private async sendCustomerEmailsInBackground(
    customers: Array<{ email: string; name: string }>,
    subject: string,
    message: string,
  ): Promise<void> {
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 2000;
    const DELAY_BETWEEN_EMAILS = 200;

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE);

      for (const customer of batch) {
        try {
          await this.emailService.sendBulkMessageToSeller(
            customer.email,
            customer.name,
            subject,
            message,
          );
          sent++;
          this.logger.log(
            `Email sent to customer: ${customer.email} (${sent}/${customers.length})`,
          );
        } catch (error) {
          failed++;
          this.logger.error(
            `Failed to send to ${customer.email}: ${error.message}`,
          );
        }

        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_EMAILS),
        );
      }

      if (i + BATCH_SIZE < customers.length) {
        this.logger.log(
          `Customer batch completed. Waiting... (${sent}/${customers.length} sent)`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_BATCHES),
        );
      }
    }

    this.logger.log(
      `Background customer email sending completed: ${sent} sent, ${failed} failed`,
    );
  }

  /**
   * მიიღე კვირის პოპულარული ხელოვანები გაყიდვებითა და ნახვებით
   */
  async getPopularArtistsOfWeek(limit: number = 8): Promise<{
    bySales: Array<{
      id: string;
      name: string;
      artistSlug: string;
      storeName: string;
      coverImage: string;
      avatarImage: string;
      rating: number;
      reviewsCount: number;
      followersCount: number;
      weeklySalesCount: number;
      weeklyViewsCount: number;
    }>;
    byViews: Array<{
      id: string;
      name: string;
      artistSlug: string;
      storeName: string;
      coverImage: string;
      avatarImage: string;
      rating: number;
      reviewsCount: number;
      followersCount: number;
      weeklyViewsCount: number;
    }>;
    byFollowers: Array<{
      id: string;
      name: string;
      artistSlug: string;
      storeName: string;
      coverImage: string;
      avatarImage: string;
      rating: number;
      reviewsCount: number;
      followersCount: number;
      weeklyViewsCount: number;
    }>;
    byRating: Array<{
      id: string;
      name: string;
      artistSlug: string;
      storeName: string;
      coverImage: string;
      avatarImage: string;
      rating: number;
      reviewsCount: number;
      followersCount: number;
      weeklyViewsCount: number;
    }>;
  }> {
    // კვირის დასაწყისი (7 დღის წინ)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // 1. გაყიდვებით პოპულარული ხელოვანები
    // იღებთ ყველა გადახდილ შეკვეთას ბოლო კვირიდან და ითვლით სელერის მიხედვით
    const salesAggregation = await this.productModel.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'orderItems.productId',
          as: 'orders',
        },
      },
      {
        $unwind: '$orders',
      },
      {
        $match: {
          'orders.isPaid': true,
          'orders.createdAt': { $gte: weekAgo },
        },
      },
      {
        $group: {
          _id: '$user',
          salesCount: { $sum: 1 },
        },
      },
      {
        $sort: { salesCount: -1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'seller',
        },
      },
      {
        $unwind: '$seller',
      },
      {
        $match: {
          'seller.role': Role.Seller,
          'seller.artistSlug': { $exists: true, $nin: [null, ''] },
        },
      },
      {
        $project: {
          id: '$seller._id',
          name: '$seller.name',
          artistSlug: '$seller.artistSlug',
          storeName: '$seller.storeName',
          coverImage: { $ifNull: ['$seller.artistCoverImage', ''] },
          avatarImage: {
            $ifNull: [
              '$seller.storeLogo',
              {
                $ifNull: [
                  '$seller.storeLogoPath',
                  {
                    $ifNull: [
                      '$seller.profileImagePath',
                      { $ifNull: ['$seller.artistCoverImage', ''] },
                    ],
                  },
                ],
              },
            ],
          },
          rating: {
            $ifNull: [
              '$seller.artistDirectRating',
              { $ifNull: ['$seller.artistRating', 0] },
            ],
          },
          reviewsCount: {
            $ifNull: [
              '$seller.artistDirectReviewsCount',
              { $ifNull: ['$seller.artistReviewsCount', 0] },
            ],
          },
          followersCount: { $ifNull: ['$seller.followersCount', 0] },
          weeklySalesCount: '$salesCount',
        },
      },
    ]);

    // 2. ნახვებით პოპულარული ხელოვანები
    // ვიყენებთ პროდუქტების viewCount-ის ჯამს + profileViews (პროფილის ნახვები)
    const viewsAggregation = await this.productModel.aggregate([
      {
        $match: {
          status: 'APPROVED',
        },
      },
      {
        $group: {
          _id: '$user',
          productViews: { $sum: { $ifNull: ['$viewCount', 0] } },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'seller',
        },
      },
      {
        $unwind: '$seller',
      },
      {
        $match: {
          'seller.role': Role.Seller,
          'seller.artistSlug': { $exists: true, $nin: [null, ''] },
        },
      },
      {
        $project: {
          id: '$seller._id',
          name: '$seller.name',
          artistSlug: '$seller.artistSlug',
          storeName: '$seller.storeName',
          coverImage: { $ifNull: ['$seller.artistCoverImage', ''] },
          avatarImage: {
            $ifNull: [
              '$seller.storeLogo',
              {
                $ifNull: [
                  '$seller.storeLogoPath',
                  {
                    $ifNull: [
                      '$seller.profileImagePath',
                      { $ifNull: ['$seller.artistCoverImage', ''] },
                    ],
                  },
                ],
              },
            ],
          },
          rating: {
            $ifNull: [
              '$seller.artistDirectRating',
              { $ifNull: ['$seller.artistRating', 0] },
            ],
          },
          reviewsCount: {
            $ifNull: [
              '$seller.artistDirectReviewsCount',
              { $ifNull: ['$seller.artistReviewsCount', 0] },
            ],
          },
          followersCount: { $ifNull: ['$seller.followersCount', 0] },
          // პროდუქტების ნახვები + პროფილის ნახვები
          weeklyViewsCount: {
            $add: ['$productViews', { $ifNull: ['$seller.profileViews', 0] }],
          },
        },
      },
      {
        $match: {
          weeklyViewsCount: { $gt: 0 },
        },
      },
      {
        $sort: { weeklyViewsCount: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    // შევქმნათ ნახვების lookup map ყველა ხელოვანისთვის
    const allViewsAggregation = await this.productModel.aggregate([
      {
        $match: {
          status: 'APPROVED',
        },
      },
      {
        $group: {
          _id: '$user',
          productViews: { $sum: { $ifNull: ['$viewCount', 0] } },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'seller',
        },
      },
      {
        $unwind: '$seller',
      },
      {
        $match: {
          'seller.role': Role.Seller,
        },
      },
      {
        $project: {
          id: '$seller._id',
          totalViews: {
            $add: ['$productViews', { $ifNull: ['$seller.profileViews', 0] }],
          },
        },
      },
    ]);

    // შევქმნათ map სწრაფი წვდომისთვის
    const viewsMap = new Map<string, number>();
    for (const item of allViewsAggregation) {
      viewsMap.set(item.id.toString(), item.totalViews || 0);
    }

    // 3. გამომწერებით პოპულარული ხელოვანები
    const byFollowers = await this.userModel
      .find({
        role: Role.Seller,
        artistSlug: { $exists: true, $nin: [null, ''] },
        followersCount: { $gt: 0 },
      })
      .sort({ followersCount: -1 })
      .limit(limit)
      .select(
        'name artistSlug storeName artistCoverImage storeLogo storeLogoPath profileImagePath artistRating artistReviewsCount artistDirectRating artistDirectReviewsCount followersCount',
      )
      .lean();

    // 4. შეფასებებით პოპულარული ხელოვანები (პირდაპირი შეფასებები)
    const byRating = await this.userModel
      .find({
        role: Role.Seller,
        artistSlug: { $exists: true, $nin: [null, ''] },
        $or: [{ artistDirectRating: { $gt: 0 } }, { artistRating: { $gt: 0 } }],
      })
      .sort({ artistDirectRating: -1, artistDirectReviewsCount: -1 })
      .limit(limit)
      .select(
        'name artistSlug storeName artistCoverImage storeLogo storeLogoPath profileImagePath artistRating artistReviewsCount artistDirectRating artistDirectReviewsCount followersCount',
      )
      .lean();

    const mapArtist = (a: any) => ({
      id: a._id.toString(),
      name: a.name,
      artistSlug: a.artistSlug,
      storeName: a.storeName,
      // coverImage - ქოვერ ფოტო ბექგრაუნდისთვის
      coverImage: a.artistCoverImage || '',
      // avatarImage - ავატარი/ლოგო პროფილის ფოტოსთვის
      avatarImage:
        a.storeLogo ||
        a.storeLogoPath ||
        a.profileImagePath ||
        a.artistCoverImage ||
        '',
      // პრიორიტეტით: პირდაპირი შეფასებები > პროდუქტის შეფასებები
      rating: a.artistDirectRating || a.artistRating || 0,
      reviewsCount: a.artistDirectReviewsCount || a.artistReviewsCount || 0,
      followersCount: a.followersCount || 0,
      weeklyViewsCount: viewsMap.get(a._id.toString()) || 0,
    });

    return {
      bySales: salesAggregation.map((a) => ({
        id: a.id.toString(),
        name: a.name,
        artistSlug: a.artistSlug,
        storeName: a.storeName,
        coverImage: a.coverImage || '',
        avatarImage: a.avatarImage || '',
        rating: a.rating,
        reviewsCount: a.reviewsCount,
        followersCount: a.followersCount || 0,
        weeklySalesCount: a.weeklySalesCount,
        weeklyViewsCount: viewsMap.get(a.id.toString()) || 0,
      })),
      byViews: viewsAggregation.map((a) => ({
        id: a.id.toString(),
        name: a.name,
        artistSlug: a.artistSlug,
        storeName: a.storeName,
        coverImage: a.coverImage || '',
        avatarImage: a.avatarImage || '',
        rating: a.rating,
        reviewsCount: a.reviewsCount,
        followersCount: a.followersCount || 0,
        weeklyViewsCount: a.weeklyViewsCount,
      })),
      byFollowers: byFollowers.map(mapArtist),
      byRating: byRating.map(mapArtist),
    };
  }

  /**
   * ხელოვანის პროფილის ნახვის დამატება
   */
  async incrementArtistProfileView(identifier: string): Promise<void> {
    if (!identifier) return;

    const query = isValidObjectId(identifier)
      ? { _id: new Types.ObjectId(identifier) }
      : { artistSlug: this.normalizeArtistSlug(identifier) };

    await this.userModel.updateOne(
      { ...query, role: Role.Seller },
      { $inc: { profileViews: 1 } },
    );
  }
}
