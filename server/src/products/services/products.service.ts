import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDocument } from 'src/users/schemas/user.schema';
import { UsersService } from 'src/users/services/users.service';
import {
  Product,
  ProductDocument,
  ProductStatus,
  MainCategory,
  AgeGroup,
  CategoryStructure,
} from '../schemas/product.schema';
import { PaginatedResponse } from '@/types';
import { Order } from '../../orders/schemas/order.schema';
import { sampleProduct } from '@/utils/data/product';
import { Role } from '@/types/role.enum';
import {
  HANDMADE_CATEGORIES,
  PAINTING_CATEGORIES,
  CLOTHING_CATEGORIES,
  ACCESSORIES_CATEGORIES,
  FOOTWEAR_CATEGORIES,
  SWIMWEAR_CATEGORIES,
  CATEGORY_MAPPING,
} from '@/utils/subcategories';
import { ProductDto, FindAllProductsDto } from '../dtos/product.dto';
import { FacebookPostingService } from '@/products/services/facebook-posting.service';
import { YoutubeVideoResult } from './product-youtube.service';
import { updateArtistRating } from '@/utils/artist-rating.util';
import { User } from '@/users/schemas/user.schema';
import {
  PortfolioPost,
  PortfolioPostDocument,
} from '@/users/schemas/portfolio-post.schema';

interface FindManyParams {
  keyword?: string;
  page?: string;
  limit?: string;
  user?: UserDocument;
  status?: ProductStatus;
  brand?: string;
  mainCategory?: string;
  subCategory?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  ageGroup?: string;
  size?: string;
  color?: string;
  discounted?: boolean;
  minPrice?: string;
  maxPrice?: string;
  includeVariants?: boolean;
  isOriginal?: boolean;
  material?: string;
  dimension?: string;
  excludeHiddenFromStore?: boolean; // If true, exclude products with hideFromStore=true
  excludeOutOfStock?: boolean; // If true, exclude products with no stock
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(PortfolioPost.name)
    private portfolioPostModel: Model<PortfolioPostDocument>,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    @Optional()
    @Inject(forwardRef(() => 'ReferralsService'))
    private referralsService?: any, // ტიპი ასე დავტოვოთ circular dependency-ის გამო
    @Optional()
    private facebookPostingService?: FacebookPostingService,
  ) {}

  private resolveArtistId(product: ProductDocument): Types.ObjectId | null {
    const rawUser = product.user as any;

    if (!rawUser) {
      return null;
    }

    if (rawUser instanceof Types.ObjectId) {
      return rawUser;
    }

    if (typeof rawUser === 'string') {
      return Types.ObjectId.isValid(rawUser)
        ? new Types.ObjectId(rawUser)
        : null;
    }

    const candidate = rawUser._id ?? rawUser.id;

    if (!candidate) {
      return null;
    }

    if (candidate instanceof Types.ObjectId) {
      return candidate;
    }

    if (typeof candidate === 'string' && Types.ObjectId.isValid(candidate)) {
      return new Types.ObjectId(candidate);
    }

    return null;
  }

  private async buildProductCaption(
    product: ProductDocument,
  ): Promise<string | null> {
    const parts: string[] = [];
    const description =
      typeof product.description === 'string' ? product.description.trim() : '';

    if (description) {
      parts.push(description);
    }

    const details: string[] = [];

    // Determine category text - need to handle ObjectId references
    let categoryText = '';

    if (product.categoryStructure?.main || product.categoryStructure?.sub) {
      // If categoryStructure exists, use it
      const main = product.categoryStructure?.main ?? '';
      const sub = product.categoryStructure?.sub ?? '';
      categoryText = sub ? `${main} / ${sub}` : main;
    } else if (product.subCategory || product.mainCategory) {
      // If we have category references, populate them to get the names
      try {
        const populatedProduct = await this.productModel
          .findById(product._id)
          .populate('mainCategory')
          .populate('subCategory')
          .lean();

        if (populatedProduct) {
          const mainCat = populatedProduct.mainCategory as any;
          const subCat = populatedProduct.subCategory as any;

          if (subCat?.name) {
            categoryText = mainCat?.name
              ? `${mainCat.name} / ${subCat.name}`
              : subCat.name;
          } else if (mainCat?.name) {
            categoryText = mainCat.name;
          }
        }
      } catch (error) {
        console.error('Error populating categories for caption:', error);
      }
    }

    // Fall back to legacy category field if nothing else worked
    if (!categoryText && product.category) {
      categoryText = product.category;
    }

    if (categoryText) {
      details.push(`Category: ${categoryText}`);
    }

    if (Array.isArray(product.materials) && product.materials.length) {
      details.push(`Materials: ${product.materials.join(', ')}`);
    }

    if (product.dimensions) {
      const dimensionsText = this.formatDimensions(product.dimensions);
      if (dimensionsText) {
        details.push(`Dimensions: ${dimensionsText}`);
      }
    }

    if (Array.isArray(product.sizes) && product.sizes.length) {
      details.push(`Sizes: ${product.sizes.join(', ')}`);
    }

    if (Array.isArray(product.colors) && product.colors.length) {
      details.push(`Colors: ${product.colors.join(', ')}`);
    }

    if (Array.isArray(product.ageGroups) && product.ageGroups.length) {
      details.push(`Age groups: ${product.ageGroups.join(', ')}`);
    }

    if (details.length) {
      if (parts.length) {
        parts.push('');
      }
      parts.push('Listing Details:');
      details.forEach((detail) => parts.push(`- ${detail}`));
    }

    if (!parts.length) {
      return null;
    }

    let caption = parts.join('\n');
    if (caption.length > 4000) {
      caption = `${caption.slice(0, 3997)}...`;
    }

    return caption;
  }

  private formatDimensions(dimensions: {
    width?: number;
    height?: number;
    depth?: number;
  }): string | null {
    const { width, height, depth } = dimensions;
    const numeric = [width, height, depth].filter(
      (value) => typeof value === 'number' && !Number.isNaN(value),
    );

    if (!numeric.length) {
      return null;
    }

    if (
      typeof width === 'number' &&
      typeof height === 'number' &&
      typeof depth === 'number'
    ) {
      return `${width} x ${height} x ${depth} cm`;
    }

    if (typeof width === 'number' && typeof height === 'number') {
      return `${width} x ${height} cm`;
    }

    if (typeof height === 'number') {
      return `${height} cm (height)`;
    }

    if (typeof width === 'number') {
      return `${width} cm (width)`;
    }

    if (typeof depth === 'number') {
      return `${depth} cm (depth)`;
    }

    return null;
  }

  private async ensurePortfolioPostForProduct(
    product: ProductDocument,
  ): Promise<void> {
    if (!this.portfolioPostModel) return;

    const artistId = this.resolveArtistId(product);
    if (!artistId) {
      console.warn(
        `Unable to resolve artistId for product ${product._id.toString()} when creating portfolio post`,
      );
      return;
    }

    const existing = await this.portfolioPostModel
      .findOne({ productId: product._id })
      .lean();

    if (existing) {
      return;
    }

    const rawImages = Array.isArray(product.images) ? product.images : [];
    const images = rawImages
      .filter((url) => typeof url === 'string' && url.trim())
      .map((url, index) => ({
        url: url.trim(),
        order: index,
        metadata: {
          source: 'product-image',
          productId: product._id.toString(),
        },
      }));

    if (!images.length) {
      return;
    }

    const caption = await this.buildProductCaption(product);

    const rawCreatedAt = (product as any)?.createdAt;
    const publishedAt = rawCreatedAt ? new Date(rawCreatedAt) : new Date();

    try {
      await this.portfolioPostModel.create({
        artistId,
        productId: product._id,
        images,
        caption,
        tags: Array.isArray(product.hashtags)
          ? product.hashtags.slice(0, 20)
          : [],
        isFeatured: false,
        likesCount: 0,
        commentsCount: 0,
        publishedAt,
      });
    } catch (error) {
      if (
        (error as any)?.code === 11000 ||
        (error as any)?.message?.includes('duplicate key')
      ) {
        // Portfolio post already exists, ignore race condition.
        return;
      }

      console.error(
        `Failed to create portfolio post for product ${product._id.toString()}:`,
        error,
      );
    }
  }

  async findTopRated(): Promise<ProductDocument[]> {
    const products = await this.productModel
      .find({})
      .sort({ rating: -1 })
      .limit(3);

    return products;
  }

  async findMany(params: FindManyParams): Promise<PaginatedResponse<Product>> {
    const {
      keyword,
      page = '1',
      limit = '10',
      user,
      status,
      brand,
      mainCategory,
      subCategory,
      sortBy = 'createdAt',
      sortDirection = 'desc',
      ageGroup,
      size,
      color,
      discounted,
      minPrice,
      maxPrice,
      includeVariants = false,
      isOriginal,
      material,
      dimension,
      excludeHiddenFromStore = false,
      excludeOutOfStock = false,
    } = params;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const filter: any = {};

    // Use $and array for all conditions to avoid $or conflicts
    const andConditions: any[] = [];

    // Exclude hidden products from store/home pages (but not from artist profiles)
    if (excludeHiddenFromStore) {
      andConditions.push({
        $or: [{ hideFromStore: { $exists: false } }, { hideFromStore: false }],
      });
    }

    // Exclude out of stock products from shop/store pages
    if (excludeOutOfStock) {
      // A product is in stock if:
      // 1. countInStock > 0, OR
      // 2. At least one variant has stock > 0
      andConditions.push({
        $or: [{ countInStock: { $gt: 0 } }, { 'variants.stock': { $gt: 0 } }],
      });
    }

    if (keyword) {
      // First, find users matching the keyword (by email, name, or store name)
      const matchingUsers = await this.usersService.findUsersByKeyword(keyword);
      const userIds = matchingUsers.map((u) => u._id);

      andConditions.push({
        $or: [
          { name: { $regex: keyword, $options: 'i' } },
          { nameEn: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
          { descriptionEn: { $regex: keyword, $options: 'i' } },
          { brand: { $regex: keyword, $options: 'i' } },
          { hashtags: { $in: [new RegExp(keyword, 'i')] } },
          // Search by seller information
          ...(userIds.length > 0 ? [{ user: { $in: userIds } }] : []),
        ],
      });
    }

    if (user) {
      filter.user = user._id;
    }

    if (status) {
      filter.status = status;
    }

    if (brand) {
      // Use case-insensitive regex for partial matching with special character handling
      // First normalize the brand string and escape special regex characters
      const normalizedBrand = brand.trim();

      // Try to decode if it looks like it might be URL encoded
      let decodedBrand = normalizedBrand;
      try {
        // Check if it contains URL encoding patterns
        if (normalizedBrand.includes('%')) {
          decodedBrand = decodeURIComponent(normalizedBrand);
        }
      } catch (error) {
        console.warn('Could not decode brand parameter:', error);
        decodedBrand = normalizedBrand; // Use original if decoding fails
      }

      const escapedBrand = decodedBrand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      console.log(
        'Brand filter - Original:',
        brand,
        'Normalized:',
        normalizedBrand,
        'Decoded:',
        decodedBrand,
        'Escaped:',
        escapedBrand,
      );
      filter.brand = { $regex: escapedBrand, $options: 'i' };
    }

    // Handle category filtering with the new structure
    if (mainCategory) {
      // Try to convert to ObjectId if it's a valid ID
      try {
        filter.mainCategory = new Types.ObjectId(mainCategory);
      } catch (error) {
        // If it's not a valid ObjectId, use as is
        filter.mainCategory = mainCategory;
      }
    }

    if (subCategory) {
      // Support comma-separated multiple subcategories
      const subCategoryIds = subCategory.split(',').map((id) => id.trim());

      if (subCategoryIds.length > 1) {
        // Multiple subcategories - use $in operator
        try {
          filter.subCategory = {
            $in: subCategoryIds.map((id) => new Types.ObjectId(id)),
          };
        } catch (error) {
          filter.subCategory = { $in: subCategoryIds };
        }
      } else {
        // Single subcategory - use direct match
        try {
          filter.subCategory = new Types.ObjectId(subCategory);
        } catch (error) {
          filter.subCategory = subCategory;
        }
      }
    }

    // Filter by attributes
    if (ageGroup) {
      filter.ageGroups = ageGroup;
    }

    if (size) {
      filter.sizes = size;
    }

    if (color) {
      filter.colors = color;
    }

    // Filter by original/copy status - treat missing values as original for legacy data
    if (isOriginal !== undefined) {
      if (isOriginal === true) {
        andConditions.push({
          $or: [{ isOriginal: true }, { isOriginal: { $exists: false } }],
        });
      } else {
        filter.isOriginal = false;
      }
    }

    // Filter by material - support Georgian and English values
    if (material) {
      const materialsList = material
        .split(',')
        .map((m) => m.trim())
        .filter((m) => m.length > 0);

      if (materialsList.length > 0) {
        const escapeRegex = (value: string) =>
          value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const regexValues = materialsList.map(
          (value) => new RegExp(`^${escapeRegex(value)}$`, 'i'),
        );

        const materialCondition = {
          $or: [
            { materials: { $in: regexValues } },
            { materialsEn: { $in: regexValues } },
          ],
        };

        if (filter.$and) {
          if (!Array.isArray(filter.$and)) {
            filter.$and = [filter.$and];
          }
          filter.$and.push(materialCondition);
        } else {
          filter.$and = [materialCondition];
        }
      }
    }

    // Filter by dimension - support multiple dimensions
    if (dimension) {
      const dimensions = dimension.split(',').map((d) => d.trim());

      if (dimensions.length > 1) {
        // Multiple dimensions - create OR conditions
        const dimensionConditions = dimensions
          .map((dim) => {
            const [width, height, depth] = dim.split('x').map(Number);
            if (width && height) {
              const condition: any = {
                'dimensions.width': width,
                'dimensions.height': height,
              };
              if (depth) {
                condition['dimensions.depth'] = depth;
              }
              return condition;
            }
            return null;
          })
          .filter(Boolean);

        if (dimensionConditions.length > 0) {
          filter.$or = dimensionConditions;
        }
      } else {
        // Single dimension
        const [width, height, depth] = dimensions[0].split('x').map(Number);
        if (width && height) {
          filter['dimensions.width'] = width;
          filter['dimensions.height'] = height;
          if (depth) {
            filter['dimensions.depth'] = depth;
          }
        }
      }
    }

    // Filter by discount status
    if (discounted === true) {
      const now = new Date();
      andConditions.push({ discountPercentage: { $exists: true, $gt: 0 } });
      andConditions.push({
        $or: [
          { discountStartDate: { $exists: false } },
          { discountStartDate: null },
          { discountStartDate: { $lte: now } },
        ],
      });
      andConditions.push({
        $or: [
          { discountEndDate: { $exists: false } },
          { discountEndDate: null },
          { discountEndDate: { $gte: now } },
        ],
      });
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      const priceFilter: any = {};

      if (minPrice) {
        const minPriceNum = parseFloat(minPrice);
        if (!isNaN(minPriceNum)) {
          priceFilter.$gte = minPriceNum;
        }
      }

      if (maxPrice) {
        const maxPriceNum = parseFloat(maxPrice);
        if (!isNaN(maxPriceNum)) {
          priceFilter.$lte = maxPriceNum;
        }
      }

      if (Object.keys(priceFilter).length > 0) {
        filter.price = priceFilter;
      }
    }

    // Apply all $and conditions to the filter
    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const sort: any = {};
    sort[sortBy] = sortDirection === 'asc' ? 1 : -1;

    const count = await this.productModel.countDocuments(filter);
    const productQuery = this.productModel
      .find(filter)
      .sort(sort)
      .populate(
        'user',
        'name email phoneNumber storeName artistSlug artistDirectRating artistDirectReviewsCount',
      )
      // Ensure we populate all fields from category objects
      .populate('mainCategory')
      .populate('subCategory')
      .skip(skip)
      .limit(limitNumber);

    // Only include variants if explicitly requested to keep response size down
    if (!includeVariants) {
      productQuery.select('-variants');
    }

    const products = await productQuery.exec();

    // Return in consistent format that matches PaginatedResponse
    return {
      items: products,
      total: count,
      page: pageNumber,
      pages: Math.ceil(count / limitNumber),
    };
  }

  async findAllBrands(): Promise<string[]> {
    try {
      const brands = await this.productModel.distinct('brand', {
        status: ProductStatus.APPROVED,
        brand: { $exists: true, $ne: null, $nin: ['', undefined] },
      });
      return brands.sort();
    } catch (error) {
      console.error('Error fetching brands:', error);
      return [];
    }
  }

  async findById(id: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product ID.');

    const product = await this.productModel
      .findById(id)
      .populate(
        'user',
        'storeName name artistSlug artistDirectRating artistDirectReviewsCount',
      )
      .populate('mainCategory')
      .populate('subCategory');

    if (!product) throw new NotFoundException('No product with given ID.');

    // Check if categoryStructure exists
    if (!product.categoryStructure) {
      let mainCat = MainCategory.CLOTHING; // Default to CLOTHING

      if (CLOTHING_CATEGORIES.includes(product.category)) {
        mainCat = MainCategory.CLOTHING;
      } else if (ACCESSORIES_CATEGORIES.includes(product.category)) {
        mainCat = MainCategory.ACCESSORIES;
      } else if (FOOTWEAR_CATEGORIES.includes(product.category)) {
        mainCat = MainCategory.FOOTWEAR;
      } else if (SWIMWEAR_CATEGORIES.includes(product.category)) {
        mainCat = MainCategory.SWIMWEAR;
      } else {
        // Handle legacy categories
        const mappedCategory = CATEGORY_MAPPING[product.category];
        if (mappedCategory) {
          if (CLOTHING_CATEGORIES.includes(mappedCategory)) {
            mainCat = MainCategory.CLOTHING;
          } else if (ACCESSORIES_CATEGORIES.includes(mappedCategory)) {
            mainCat = MainCategory.ACCESSORIES;
          } else if (FOOTWEAR_CATEGORIES.includes(mappedCategory)) {
            mainCat = MainCategory.FOOTWEAR;
          } else if (SWIMWEAR_CATEGORIES.includes(mappedCategory)) {
            mainCat = MainCategory.SWIMWEAR;
          }
          product.category = mappedCategory;
        }
      }

      // Create a categoryStructure object
      product.categoryStructure = {
        main: mainCat,
        sub: product.category,
      };
    }

    return product;
  }

  async findByIdWithUser(id: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product ID.');

    const product = await this.productModel
      .findById(id)
      .populate(
        'user',
        'storeName name artistSlug artistDirectRating artistDirectReviewsCount',
      )
      .populate('mainCategory')
      .populate('subCategory');

    if (!product) throw new NotFoundException('No product with given ID.');

    return product;
  }

  async incrementViewCount(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product ID.');

    await this.productModel.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true },
    );
  }

  findByIds(productIds: string[]): Promise<ProductDocument[]> {
    if (!productIds || productIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.productModel
      .find({ _id: { $in: productIds } })
      .populate('mainCategory')
      .populate('subCategory')
      .exec();
  }

  async createMany(products: Partial<Product>[]): Promise<ProductDocument[]> {
    const createdProducts = await this.productModel.insertMany(products);

    return createdProducts as unknown as ProductDocument[];
  }

  async createSample(): Promise<ProductDocument> {
    const createdProduct = await this.productModel.create(sampleProduct);

    return createdProduct;
  }

  async update(id: string, attrs: Partial<Product>): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product ID.');

    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('No product with given ID.');

    // Convert string IDs to ObjectIds for category references
    const data = { ...attrs };

    // Handle mainCategory properly - ensure it's converted to ObjectId if it's a valid ID
    if (data.mainCategory !== undefined) {
      if (
        typeof data.mainCategory === 'string' &&
        data.mainCategory &&
        Types.ObjectId.isValid(data.mainCategory)
      ) {
        try {
          data.mainCategory = new Types.ObjectId(data.mainCategory);
        } catch (error) {
          console.warn('Invalid mainCategory ID format', data.mainCategory);
        }
      } else if (data.mainCategory === null) {
        // If explicitly set to null, keep it null
        data.mainCategory = null;
      } else if (
        typeof data.mainCategory === 'object' &&
        data.mainCategory !== null
      ) {
        // If it's already an object (like from MongoDB), keep it
      }
    }

    // Handle subCategory properly - ensure it's converted to ObjectId if it's a valid ID
    if (data.subCategory !== undefined) {
      if (
        typeof data.subCategory === 'string' &&
        data.subCategory &&
        Types.ObjectId.isValid(data.subCategory)
      ) {
        try {
          data.subCategory = new Types.ObjectId(data.subCategory);
        } catch (error) {
          console.warn('Invalid subCategory ID format', data.subCategory);
        }
      } else if (data.subCategory === null) {
        // If explicitly set to null, keep it null
        data.subCategory = null;
      } else if (
        typeof data.subCategory === 'object' &&
        data.subCategory !== null
      ) {
        // If it's already an object (like from MongoDB), keep it
      }
    }

    // Create updateFields object with the processed data
    const updateFields: any = {};

    // Copy all the fields that need to be updated
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.nameEn !== undefined) updateFields.nameEn = data.nameEn;
    if (data.price !== undefined) updateFields.price = data.price;
    if (data.description !== undefined)
      updateFields.description = data.description;
    if (data.descriptionEn !== undefined)
      updateFields.descriptionEn = data.descriptionEn;
    if (data.videoDescription !== undefined)
      updateFields.videoDescription = data.videoDescription;
    if (data.images) updateFields.images = data.images;
    if (data.brandLogo) updateFields.brandLogo = data.brandLogo;
    if (data.brand) updateFields.brand = data.brand;
    if (data.countInStock !== undefined)
      updateFields.countInStock = data.countInStock;
    if (data.status) updateFields.status = data.status;
    if (data.deliveryType) updateFields.deliveryType = data.deliveryType;
    if (data.minDeliveryDays !== undefined)
      updateFields.minDeliveryDays = data.minDeliveryDays;
    if (data.maxDeliveryDays !== undefined)
      updateFields.maxDeliveryDays = data.maxDeliveryDays;
    if (data.dimensions) updateFields.dimensions = data.dimensions;
    if (data.isOriginal !== undefined)
      updateFields.isOriginal = data.isOriginal;
    if (data.materials !== undefined) updateFields.materials = data.materials;
    if (data.materialsEn !== undefined)
      updateFields.materialsEn = data.materialsEn;
    if (data.categoryStructure)
      updateFields.categoryStructure = data.categoryStructure;

    // Add discount fields
    if (data.discountPercentage !== undefined)
      updateFields.discountPercentage = data.discountPercentage;
    if (data.discountStartDate !== undefined)
      updateFields.discountStartDate = data.discountStartDate;
    if (data.discountEndDate !== undefined)
      updateFields.discountEndDate = data.discountEndDate;

    // Always update category fields separately to ensure they're set correctly
    if (data.category) updateFields.category = data.category;
    if (data.mainCategory !== undefined) {
      updateFields.mainCategory = data.mainCategory;
    }
    if (data.subCategory !== undefined) {
      updateFields.subCategory = data.subCategory;
    }

    // Handle arrays properly
    if (data.ageGroups)
      updateFields.ageGroups = Array.isArray(data.ageGroups)
        ? data.ageGroups
        : [];
    if (data.sizes)
      updateFields.sizes = Array.isArray(data.sizes) ? data.sizes : [];
    if (data.colors)
      updateFields.colors = Array.isArray(data.colors) ? data.colors : [];
    if (data.hashtags !== undefined)
      updateFields.hashtags = Array.isArray(data.hashtags) ? data.hashtags : [];

    console.log('Updating product with hashtags:', updateFields.hashtags);

    if (data.variants) {
      // Parse variants if it's a string (same as create method)
      if (typeof data.variants === 'string') {
        try {
          data.variants = JSON.parse(data.variants);
        } catch (error) {
          console.error('Error parsing variants string to JSON:', error);
          throw new BadRequestException(
            'Invalid variants format. Expected a valid JSON array.',
          );
        }
      }

      // Ensure variants is an array
      if (Array.isArray(data.variants)) {
        // Validate each variant object
        updateFields.variants = data.variants;
      } else {
        throw new BadRequestException('Variants must be an array');
      }
    }

    // Make sure we have proper population options
    const populateOptions = [{ path: 'mainCategory' }, { path: 'subCategory' }];

    // Use findByIdAndUpdate to completely replace the document with our new values
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true, runValidators: true },
      )
      .populate(populateOptions);

    return updatedProduct;
  }

  async updateStatus(
    id: string,
    status: ProductStatus,
    rejectionReason?: string,
  ): Promise<ProductDocument> {
    const product = await this.productModel
      .findById(id)
      .populate(
        'user',
        'name email storeName artistSlug artistDirectRating artistDirectReviewsCount',
      );
    if (!product) {
      throw new NotFoundException('პროდუქტი ვერ მოიძებნა');
    }

    const oldStatus = product.status;
    const wasApprovedBefore =
      oldStatus === ProductStatus.APPROVED || !!product.firstApprovedAt;

    product.status = status;
    if (rejectionReason) {
      product.rejectionReason = rejectionReason;
    }

    // თუ პროდუქტი პირველად დასტურდება, შევინახოთ თარიღი
    if (status === ProductStatus.APPROVED && !product.firstApprovedAt) {
      product.firstApprovedAt = new Date();
    }

    const updatedProduct = await product.save();

    // თუ პროდუქტი დამტკიცდა და სელერისაა — ყოველი approve-ზე ვცდილობთ ტრიგერს (იდემპოტენტურია)
    if (
      status === ProductStatus.APPROVED &&
      product.user &&
      (product.user as any).role === 'seller' &&
      this.referralsService
    ) {
      try {
        // შევამოწმოთ და გადავცეთ რეფერალური ბონუსი
        await this.referralsService.approveSellerAndPayBonus(
          (product.user as any)._id.toString(),
        );
      } catch (error) {
        console.warn(
          `რეფერალური ბონუსის დამუშავების შეცდომა: ${error.message}`,
        );
        // არ ვაჩერებთ პროდუქტის დამტკიცებას რეფერალური ბონუსის შეცდომის გამო
      }
    }

    // Auto-post to Facebook Page, Groups and Instagram on approval (best-effort, non-blocking)
    // Only enabled in production environment
    // თუ პროდუქტი პირველად დასტურდება (არა რეედიტირება)
    if (status === ProductStatus.APPROVED && !wasApprovedBefore) {
      const isProduction = process.env.NODE_ENV === 'production';
      const haveService = this.facebookPostingService;
      const havePageId = Boolean(
        process.env.FACEBOOK_POSTS_PAGE_ID || process.env.FACEBOOK_PAGE_ID,
      );
      const haveToken = Boolean(
        process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
          process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
      );
      const autoPostEnabled =
        (process.env.FACEBOOK_AUTO_POST || 'true').toLowerCase() !== 'false';

      if (
        isProduction &&
        haveService &&
        havePageId &&
        haveToken &&
        autoPostEnabled
      ) {
        try {
          // Use postToAllPlatforms to post to Page, Groups, and Instagram
          // best-effort, don't await to not block response
          this.facebookPostingService
            .postToAllPlatforms(updatedProduct)
            .then((res) => {
              if (res?.success) {
                const platforms: string[] = [];
                if (res.pagePost?.success) platforms.push('FB Page');
                if (res.groupPosts?.some((g) => g.success))
                  platforms.push('FB Groups');
                if (res.instagramPost?.success) platforms.push('Instagram');

                console.log(
                  `[Social Media] Posted new product ${updatedProduct._id?.toString?.()} to: ${platforms.join(', ')}`,
                );
              } else {
                console.warn('[Social Media] Some posts failed', res?.errors);
              }
            })
            .catch((err) =>
              console.warn('[Social Media] Post error', err?.message || err),
            );
        } catch (err) {
          console.warn(
            '[Social Media] Unexpected post error',
            (err as any)?.message || err,
          );
        }
      } else {
        console.log('[Social Media] Auto-post skipped', {
          isProduction,
          haveService,
          havePageId,
          haveToken,
          autoPostEnabled,
        });
      }
    } else if (status === ProductStatus.APPROVED && wasApprovedBefore) {
      console.log(
        '[FB] Auto-post skipped - product was already approved before (edited product)',
      );
    }

    return updatedProduct;
  }

  /**
   * Update product visibility in store/home pages
   * Product will still be visible on artist's profile page
   */
  async updateProductVisibility(
    id: string,
    hideFromStore: boolean,
  ): Promise<ProductDocument> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException('პროდუქტი ვერ მოიძებნა');
    }

    product.hideFromStore = hideFromStore;
    const updatedProduct = await product.save();

    console.log(
      `[Visibility] Product ${id} hideFromStore set to: ${hideFromStore}`,
    );

    return updatedProduct;
  }

  async findByStatus(status: ProductStatus): Promise<Product[]> {
    return this.productModel
      .find({ status })
      .populate(
        'user',
        'name email phoneNumber storeName artistSlug artistDirectRating artistDirectReviewsCount',
      )
      .populate('mainCategory', 'name')
      .populate('subCategory', 'name ageGroups sizes colors')
      .sort({ createdAt: -1 })
      .exec();
  }

  async createReview(
    id: string,
    user: UserDocument,
    rating: number,
    comment: string,
  ): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product ID.');

    const product = await this.productModel.findById(id);

    if (!product) throw new NotFoundException('No product with given ID.');

    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === user._id.toString(),
    );

    if (alreadyReviewed)
      throw new BadRequestException('Product already reviewed!');

    const hasPurchased = await this.orderModel.findOne({
      user: user._id,
      'orderItems.productId': id,
      status: 'delivered',
    });

    if (!hasPurchased)
      throw new BadRequestException({
        message: 'You can only review products you have purchased',
        code: 'PRODUCT_NOT_PURCHASED',
        statusCode: 400,
      });

    const review = {
      name: user.name,
      rating,
      comment,
      user,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    product.reviews.push(review);

    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    product.numReviews = product.reviews.length;

    const updatedProduct = await product.save();

    // Update artist rating after product review
    try {
      const artistId = product.user?.toString();
      if (artistId) {
        await updateArtistRating(artistId, this.productModel, this.userModel);
      }
    } catch (error) {
      // Log but don't fail the review creation if rating update fails
      console.error('Failed to update artist rating:', error);
    }

    return updatedProduct;
  }

  async deleteOne(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product ID.');

    const product = await this.productModel.findById(id);

    if (!product) throw new NotFoundException('No product with given ID.');

    await product.deleteOne();
  }

  async deleteMany(): Promise<void> {
    await this.productModel.deleteMany({});
  }

  async create(
    productData: Partial<Product>,
    options?: { addToPortfolio?: boolean },
  ): Promise<ProductDocument> {
    try {
      // Convert string IDs to ObjectIds for category references
      const data = { ...productData };

      const status =
        productData.user.role === Role.Admin
          ? ProductStatus.APPROVED
          : ProductStatus.PENDING;

      // Handle category references properly
      if (typeof data.mainCategory === 'string' && data.mainCategory) {
        try {
          data.mainCategory = new Types.ObjectId(data.mainCategory);
        } catch (error) {
          console.warn('Invalid mainCategory ID format', data.mainCategory);
        }
      }

      if (typeof data.subCategory === 'string' && data.subCategory) {
        try {
          data.subCategory = new Types.ObjectId(data.subCategory);
        } catch (error) {
          console.warn('Invalid subCategory ID format', data.subCategory);
        }
      }

      // Ensure arrays are properly initialized
      data.ageGroups = Array.isArray(data.ageGroups) ? data.ageGroups : [];
      data.sizes = Array.isArray(data.sizes) ? data.sizes : [];
      data.colors = Array.isArray(data.colors) ? data.colors : [];
      data.hashtags = Array.isArray(data.hashtags) ? data.hashtags : [];
      data.materials = Array.isArray(data.materials) ? data.materials : [];
      data.materialsEn = Array.isArray(data.materialsEn)
        ? data.materialsEn
        : [];

      console.log('Creating product with hashtags:', data.hashtags);

      // Parse variants if it's a string
      if (data.variants && typeof data.variants === 'string') {
        try {
          data.variants = JSON.parse(data.variants);
        } catch (error) {
          console.error('Error parsing variants string to JSON:', error);
          throw new BadRequestException(
            'Invalid variants format. Expected a valid JSON array.',
          );
        }
      }

      // Ensure variants is an array
      if (data.variants && !Array.isArray(data.variants)) {
        throw new BadRequestException('Variants must be an array');
      }

      // Create the product without any indexes that could cause the parallel array issue
      const product = new this.productModel({
        ...data,
        status,
        rating: 0,
        numReviews: 0,
        reviews: [],
      });

      // Save the product
      await product.save();

      const shouldCreatePortfolio =
        options?.addToPortfolio === undefined ? true : options.addToPortfolio;

      if (shouldCreatePortfolio) {
        await this.ensurePortfolioPostForProduct(product);
      }

      return product;
    } catch (error) {
      console.error('Error creating product:', error);

      // Check for MongoDB error code 171 (cannot index parallel arrays)
      if (
        error.code === 171 ||
        error.message?.includes('cannot index parallel arrays')
      ) {
        throw new BadRequestException(
          'Database error: Cannot create product with multiple array attributes. This is a MongoDB limitation. Please contact the administrator.',
        );
      }

      // Rethrow any other errors
      throw error;
    }
  }

  async attachYoutubeVideo(
    productId: string,
    videoPayload: YoutubeVideoResult,
  ): Promise<ProductDocument | null> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID.');
    }

    return this.productModel
      .findByIdAndUpdate(
        productId,
        {
          youtubeVideoId: videoPayload.videoId,
          youtubeVideoUrl: videoPayload.videoUrl,
          youtubeEmbedUrl: videoPayload.embedUrl,
        },
        { new: true },
      )
      .exec();
  }

  async findAll(options: FindAllProductsDto): Promise<any> {
    return this.findMany({
      keyword: options.keyword,
      page: options.page,
      limit: options.limit,
      brand: options.brand,
      mainCategory: options.mainCategory,
      subCategory: options.subCategory,
      sortBy: options.sortBy,
      sortDirection: options.sortOrder === 'asc' ? 'asc' : 'desc',
      ageGroup: options.ageGroup,
      size: options.size,
      color: options.color,
      includeVariants: options.includeVariants === 'true',
      isOriginal: options.isOriginal,
      material: options.material,
      status: ProductStatus.APPROVED, // Default to approved for public API
      excludeOutOfStock: options.excludeOutOfStock === 'true', // Hide out of stock products
    });
  }

  // Add a method to check stock availability by size and color
  async checkStockAvailability(
    productId: string,
    quantity: number = 1,
    size?: string,
    color?: string,
    ageGroup?: string,
  ): Promise<boolean> {
    const product = await this.productModel.findById(productId).exec();

    if (!product) {
      return false;
    }

    // If the product has variants
    if (product.variants && product.variants.length > 0) {
      const variant = product.variants.find(
        (v) => v.size === size && v.color === color && v.ageGroup === ageGroup,
      );
      if (!variant) {
        return false;
      }
      return variant.stock >= quantity;
    }

    // Fall back to legacy countInStock if no variants
    return product.countInStock >= quantity;
  }

  // Update inventory after a purchase
  async updateInventory(
    productId: string,
    size?: string,
    color?: string,
    selectedAgeGroup?: string,
    quantity: number = 1,
  ): Promise<void> {
    const product = await this.productModel.findById(productId).exec();

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // If the product has variants
    if (product.variants && product.variants.length > 0) {
      const variantIndex = product.variants.findIndex(
        (v) =>
          v.size === size &&
          v.color === color &&
          v.ageGroup === selectedAgeGroup,
      );
      if (variantIndex === -1) {
        throw new NotFoundException(
          `Variant with size ${size} and color ${color} not found`,
        );
      }

      if (product.variants[variantIndex].stock < quantity) {
        throw new BadRequestException(
          `Not enough stock for size ${size} and color ${color}`,
        );
      }

      // Update the specific variant's stock
      product.variants[variantIndex].stock -= quantity;
      await product.save();
    } else {
      // Fall back to legacy countInStock if no variants
      if (product.countInStock < quantity) {
        throw new BadRequestException('Not enough stock');
      }

      product.countInStock -= quantity;
      await product.save();
    }
  }

  /**
   * Get available variants (sizes and colors) for a product
   */
  async getProductVariants(productId: string) {
    const product = await this.productModel.findById(productId).exec();

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // If the product has variants defined
    if (product.variants && product.variants.length > 0) {
      // Extract unique sizes and colors
      const sizes = [...new Set(product.variants.map((v) => v.size))];
      const colors = [...new Set(product.variants.map((v) => v.color))];

      // Map variants to include stock information
      const variantsWithStock = product.variants.map((v) => ({
        size: v.size,
        color: v.color,
        stock: v.stock,
        sku: v.sku,
      }));

      return {
        sizes,
        colors,
        variants: variantsWithStock,
        hasVariants: true,
      };
    }

    // For products without explicit variants, use the general attributes
    return {
      sizes: product.sizes || [],
      colors: product.colors || [],
      variants: [],
      hasVariants: false,
      countInStock: product.countInStock,
    };
  }

  /**
   * Get all unique colors used in products
   */
  async getAllColors(): Promise<string[]> {
    // Find colors from both direct fields and variants
    const productsWithColors = await this.productModel
      .find({
        $or: [
          { colors: { $exists: true, $ne: [] } },
          { 'variants.color': { $exists: true } },
        ],
      })
      .exec();

    const colors = new Set<string>();

    // Add colors from direct fields
    productsWithColors.forEach((product) => {
      if (product.colors && product.colors.length > 0) {
        product.colors.forEach((color) => colors.add(color));
      }

      // Add colors from variants
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((variant) => {
          if (variant.color) {
            colors.add(variant.color);
          }
        });
      }
    });

    return Array.from(colors).sort();
  }

  /**
   * Get all unique sizes used in products
   */
  async getAllSizes(): Promise<string[]> {
    // Find sizes from both direct fields and variants
    const productsWithSizes = await this.productModel
      .find({
        $or: [
          { sizes: { $exists: true, $ne: [] } },
          { 'variants.size': { $exists: true } },
        ],
      })
      .exec();

    const sizes = new Set<string>();

    // Add sizes from direct fields
    productsWithSizes.forEach((product) => {
      if (product.sizes && product.sizes.length > 0) {
        product.sizes.forEach((size) => sizes.add(size));
      }

      // Add sizes from variants
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((variant) => {
          if (variant.size) {
            sizes.add(variant.size);
          }
        });
      }
    });

    return Array.from(sizes).sort();
  }

  /**
   * Get all unique age groups used in products
   */
  async getAllAgeGroups(): Promise<string[]> {
    // Find all products with age groups
    const productsWithAgeGroups = await this.productModel
      .find({
        ageGroups: { $exists: true, $ne: [] },
      })
      .exec();

    const ageGroups = new Set<string>();

    productsWithAgeGroups.forEach((product) => {
      if (product.ageGroups && product.ageGroups.length > 0) {
        product.ageGroups.forEach((ageGroup) => ageGroups.add(ageGroup));
      }
    });

    return Array.from(ageGroups).sort();
  }

  /**
   * Get seller information for a specific product
   * This retrieves the seller/user registration details for a product
   */
  async getProductSellerInfo(productId: string): Promise<any> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID');
    }

    const product = await this.productModel
      .findById(productId)
      .populate({
        path: 'user',
        select:
          'name email storeName ownerFirstName ownerLastName phoneNumber identificationNumber accountNumber role profileImagePath storeLogoPath',
      })
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.user) {
      throw new NotFoundException(
        'Seller information not found for this product',
      );
    }

    // Get full user data with properly formatted image URLs using UsersService
    try {
      const fullUserData = await this.usersService.getProfileData(
        (product.user as any)._id.toString(),
      );

      // Include brand information from the product
      return {
        ...fullUserData,
        brand: product.brand,
        brandLogo: product.brandLogo,
      };
    } catch (error) {
      // If getProfileData fails, return basic user info without images
      const sellerInfo = (product.user as any).toObject();
      return {
        ...sellerInfo,
        profileImage: null,
        storeLogo: null,
        brand: product.brand,
        brandLogo: product.brandLogo,
      };
    }
  }

  /**
   * Update product stock when an order is paid
   * @param productId - The ID of the product
   * @param qty - The quantity to subtract from stock
   * @param size - Optional size for variant
   * @param color - Optional color for variant
   * @param ageGroup - Optional age group for variant
   */
  async updateStockAfterPayment(
    productId: string,
    qty: number,
    size?: string,
    color?: string,
    ageGroup?: string,
  ): Promise<void> {
    const product = await this.productModel.findById(productId);

    if (!product) {
      console.warn(
        `Product with ID ${productId} not found when updating stock after payment`,
      );
      return;
    }

    // Check if the product has variants
    if (product.variants && product.variants.length > 0) {
      const hasVariantAttributes = size || color || ageGroup;

      if (hasVariantAttributes) {
        // Find the specific variant by attributes
        const variantIndex = product.variants.findIndex(
          (v) =>
            v.size === size && v.color === color && v.ageGroup === ageGroup,
        );

        if (variantIndex >= 0) {
          // Update the variant stock
          product.variants[variantIndex].stock = Math.max(
            0,
            product.variants[variantIndex].stock - qty,
          );
          console.log(
            `Updated variant stock for product ${product.name}, variant: ${size}/${color}/${ageGroup}, new stock: ${product.variants[variantIndex].stock}`,
          );
        } else {
          // If variant not found but attributes were specified, log a warning
          console.warn(
            `Variant not found for product ${product.name} with attributes: size=${size}, color=${color}, ageGroup=${ageGroup}`,
          );
          // Fall back to updating general stock
          product.countInStock = Math.max(0, product.countInStock - qty);
        }
      } else {
        // Product has variants but no attributes specified - update first variant
        product.variants[0].stock = Math.max(
          0,
          product.variants[0].stock - qty,
        );
        console.log(
          `Updated first variant stock for product ${product.name}, new stock: ${product.variants[0].stock}`,
        );
      }

      // Sync countInStock with total variant stock
      const totalVariantStock = product.variants.reduce(
        (sum, v) => sum + (v.stock || 0),
        0,
      );
      product.countInStock = totalVariantStock;
      console.log(
        `Synced countInStock for product ${product.name}, new countInStock: ${product.countInStock}`,
      );
    } else {
      // Update general product stock if no variants
      product.countInStock = Math.max(0, product.countInStock - qty);
      console.log(
        `Updated general stock for product ${product.name}, new stock: ${product.countInStock}`,
      );
    }

    await product.save();
  }

  // რეფერალების სისტემისთვის - მომხმარებლის პროდუქტების რაოდენობის დათვლა
  async countUserProducts(
    userId: string,
    status?: ProductStatus,
  ): Promise<number> {
    const filter: any = { user: userId };
    if (status) {
      filter.status = status;
    }
    return await this.productModel.countDocuments(filter);
  }

  /**
   * Utility method to fix HEIC brand logos by converting them to JPEG format
   */
  async fixHeicBrandLogos(): Promise<{ updated: number; errors: string[] }> {
    const updated: number[] = [];
    const errors: string[] = [];

    try {
      // Find all products with HEIC brand logos
      const productsWithHeicLogos = await this.productModel.find({
        brandLogo: { $regex: /\.heic$/i },
      });

      console.log(
        `Found ${productsWithHeicLogos.length} products with HEIC brand logos`,
      );

      for (const product of productsWithHeicLogos) {
        try {
          if (product.brandLogo && product.brandLogo.includes('.heic')) {
            // Convert HEIC URL to JPEG format
            const jpegUrl = product.brandLogo
              .replace(/\.heic$/i, '.jpg')
              .replace('/upload/', '/upload/f_jpg,q_auto/');

            await this.productModel.updateOne(
              { _id: product._id },
              { $set: { brandLogo: jpegUrl } },
            );

            updated.push(1);
            console.log(
              `Updated product ${product._id}: ${product.brandLogo} -> ${jpegUrl}`,
            );
          }
        } catch (error) {
          console.error(`Error updating product ${product._id}:`, error);
          errors.push(`Product ${product._id}: ${error.message}`);
        }
      }

      return { updated: updated.length, errors };
    } catch (error) {
      console.error('Error in fixHeicBrandLogos:', error);
      return { updated: 0, errors: [error.message] };
    }
  }
}
