import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { RolesGuard } from '@/guards/roles.guard';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { ProductDto, FindAllProductsDto } from '../dtos/product.dto';
import { ReviewDto } from '../dtos/review.dto';
import { ProductsService } from '../services/products.service';
import { UserDocument } from '@/users/schemas/user.schema';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AppService } from '@/app/services/app.service';
import { ProductExpertAgent } from '@/ai/agents/product-expert.agent';
import { Response } from 'express';
import { ChatRequest } from '@/types/agents';
import { Roles } from '@/decorators/roles.decorator';
import { Role } from '@/types/role.enum';
import { ProductStatus } from '../schemas/product.schema';
import { AgeGroup } from '@/types';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import axios from 'axios';
import { PushNotificationService } from '@/push/services/push-notification.service';
import { FacebookPostingService } from '@/products/services/facebook-posting.service';
import {
  BackgroundUploadFile,
  ProductYoutubeService,
} from '@/products/services/product-youtube.service';
import { memoryStorage, diskStorage } from 'multer';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private appService: AppService,
    private productYoutubeService: ProductYoutubeService,
    private productExpertAgent: ProductExpertAgent,
    private pushNotificationService: PushNotificationService,
    private facebookPostingService: FacebookPostingService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get products with filters' })
  getProducts(
    @Query('keyword') keyword: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('brand') brand: string,
    @Query('mainCategory') mainCategory: string,
    @Query('subCategory') subCategory: string,
    @Query('sortBy') sortBy: string,
    @Query('sortDirection') sortDirection: 'asc' | 'desc',
    @Query('ageGroup') ageGroup: string,
    @Query('size') size: string,
    @Query('color') color: string,
    @Query('discounted') discounted: string,
    @Query('minPrice') minPrice: string,
    @Query('maxPrice') maxPrice: string,
    @Query('includeVariants') includeVariants: string,
    @Query('isOriginal') isOriginal: string,
    @Query('material') material: string,
    @Query('dimension') dimension: string,
    @Query('excludeOutOfStock') excludeOutOfStock: string,
  ) {
    // Parse isOriginal parameter to handle multiple values (comma-separated)
    let parsedIsOriginal: boolean | undefined = undefined;
    if (isOriginal) {
      const values = isOriginal.split(',').map((v) => v.trim());
      // If both "true" and "false" are selected, don't filter
      if (values.includes('true') && values.includes('false')) {
        parsedIsOriginal = undefined;
      } else if (values.includes('true')) {
        parsedIsOriginal = true;
      } else if (values.includes('false')) {
        parsedIsOriginal = false;
      }
    }

    return this.productsService.findMany({
      keyword,
      page,
      limit,
      status: ProductStatus.APPROVED,
      brand,
      mainCategory,
      subCategory,
      sortBy,
      sortDirection,
      ageGroup,
      size,
      color,
      discounted: discounted === 'true',
      minPrice,
      maxPrice,
      includeVariants: includeVariants === 'true',
      isOriginal: parsedIsOriginal,
      material,
      dimension,
      excludeHiddenFromStore: true, // Hide products marked as hidden from store
      excludeOutOfStock: excludeOutOfStock === 'true', // Hide out of stock products
    });
  }

  @Get('user')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Seller)
  getUserProducts(
    @CurrentUser() user: UserDocument,
    @Query('keyword') keyword: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status: string,
    @Query('mainCategory') mainCategory: string,
  ) {
    return this.productsService.findMany({
      keyword,
      page,
      limit,
      status: status as any, // Cast to ProductStatus enum
      mainCategory,
      user: user.role === Role.Admin ? undefined : user,
      // Add this to ensure we get populated category data
      includeVariants: true,
    });
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getPendingProducts() {
    return this.productsService.findByStatus(ProductStatus.PENDING);
  }

  @Get('brands')
  @ApiOperation({ summary: 'Get all available brands' })
  async getBrands() {
    return this.productsService.findAllBrands();
  }

  @Get('topRated')
  async getTopRatedProducts() {
    const products = await this.productsService.findTopRated();
    // Return in a consistent format for the frontend
    return {
      items: products,
      total: products.length,
      page: 1,
      pages: 1,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  getProduct(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Increment view count for a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'View count incremented successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid product ID' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async incrementView(@Param('id') id: string) {
    await this.productsService.incrementViewCount(id);
    return { message: 'View count incremented successfully' };
  }

  @Get(':id/seller')
  @ApiOperation({ summary: 'Get seller information for a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async getProductSellerInfo(@Param('id') id: string) {
    return this.productsService.getProductSellerInfo(id);
  }

  @Get(':id/variants')
  @ApiOperation({ summary: 'Get available sizes and colors for a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns available sizes, colors and variants',
    schema: {
      properties: {
        sizes: { type: 'array', items: { type: 'string' } },
        colors: { type: 'array', items: { type: 'string' } },
        variants: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              size: { type: 'string' },
              color: { type: 'string' },
              stock: { type: 'number' },
              sku: { type: 'string' },
            },
          },
        },
        hasVariants: { type: 'boolean' },
        countInStock: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  getProductVariants(@Param('id') id: string) {
    return this.productsService.getProductVariants(id);
  }

  @Get('find-all')
  async findAll(@Query() query: FindAllProductsDto) {
    return this.productsService.findAll(query);
  }

  @UseGuards(RolesGuard)
  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.productsService.deleteOne(id);
  }

  // ========================================
  // UPLOAD VIDEO TO YOUTUBE IMMEDIATELY
  // ========================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Seller)
  @Post('upload-video')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'video', maxCount: 1 }], {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = './uploads/temp';
          require('fs').mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, 'video-' + uniqueSuffix + '-' + file.originalname);
        },
      }),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB for videos
      },
      fileFilter: (req, file, cb) => {
        const videoMimeTypes = [
          'video/mp4',
          'video/quicktime',
          'video/mpeg',
          'video/x-matroska',
          'video/webm',
          'video/x-msvideo',
          'video/3gpp',
        ];
        if (!videoMimeTypes.includes(file.mimetype.toLowerCase())) {
          return cb(
            new Error(`Unsupported video type: ${file.mimetype}`),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadVideoToYoutube(
    @CurrentUser() user: UserDocument,
    @Body()
    body: {
      productName?: string;
      productDescription?: string;
      price?: string;
      brand?: string;
    },
    @UploadedFiles() files: { video?: Express.Multer.File[] },
  ) {
    const videoFile = files?.video?.[0];

    if (!videoFile) {
      throw new BadRequestException('No video file provided');
    }

    console.log('📹 Immediate YouTube upload request:', {
      userId: user._id,
      userName: user.name,
      videoName: videoFile.originalname,
      videoSize: videoFile.size,
      productName: body.productName,
    });

    try {
      const videoFileData = this.prepareFileForBackground(videoFile);

      if (!videoFileData) {
        throw new BadRequestException('Failed to process video file');
      }

      const tempProductData = {
        name: body.productName || 'Product Video',
        description: body.productDescription || '',
        price: body.price ? Number(body.price) : 0,
        brand: body.brand || user.name || 'SoulArt',
        category: 'Other',
      };

      const youtubeResult = await this.productYoutubeService.uploadVideoSync({
        productData: tempProductData,
        user,
        videoFile: videoFileData,
      });

      if (!youtubeResult) {
        throw new BadRequestException(
          'YouTube upload failed - no result returned',
        );
      }

      console.log('✅ Immediate YouTube upload success:', youtubeResult);

      return {
        success: true,
        videoId: youtubeResult.videoId,
        videoUrl: youtubeResult.videoUrl,
        embedUrl: youtubeResult.embedUrl,
      };
    } catch (error) {
      console.error('❌ Immediate YouTube upload error:', error);
      throw new BadRequestException(`YouTube upload failed: ${error.message}`);
    } finally {
      // Cleanup temp file
      if (videoFile?.path) {
        try {
          require('fs').unlinkSync(videoFile.path);
        } catch (e) {
          console.warn('Failed to cleanup video temp file');
        }
      }
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Seller)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 10 },
        { name: 'brandLogo', maxCount: 1 },
        { name: 'video', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: (req, file, cb) => {
            const uploadDir = './uploads/temp';
            require('fs').mkdirSync(uploadDir, { recursive: true });
            cb(null, uploadDir);
          },
          filename: (req, file, cb) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(
              null,
              file.fieldname + '-' + uniqueSuffix + '-' + file.originalname,
            );
          },
        }),
        limits: {
          fileSize: 500 * 1024 * 1024, // 500MB for videos
          files: 15, // Limit total files
        },
        fileFilter: (req, file, cb) => {
          console.log('📁 File received:', {
            fieldname: file.fieldname,
            mimetype: file.mimetype,
            originalname: file.originalname,
            size: file.size,
          });

          const imageMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/jpg',
            'image/gif',
            'image/webp',
            'image/heic',
            'image/heif',
          ];
          const videoMimeTypes = [
            'video/mp4',
            'video/quicktime',
            'video/mpeg',
            'video/x-matroska',
            'video/webm',
            'video/x-msvideo', // AVI
            'video/3gpp', // 3GP
            'video/x-flv', // FLV
          ];

          const mimetype = file.mimetype.toLowerCase();

          if (file.fieldname === 'video') {
            if (!videoMimeTypes.includes(mimetype)) {
              console.error('❌ Unsupported video type:', file.mimetype);
              return cb(
                new Error(
                  `Unsupported video type: ${file.mimetype}. Supported types: MP4, MOV, MPEG, MKV, WEBM, AVI, 3GP.`,
                ),
                false,
              );
            }
            return cb(null, true);
          }

          // Note: File size validation happens after upload completes
          // The 10MB limit for images is enforced by Cloudinary and shown in frontend validation

          if (!imageMimeTypes.includes(mimetype)) {
            console.error('❌ Unsupported file type:', file.mimetype);
            return cb(
              new Error(
                `Unsupported file type: ${file.mimetype}. Supported types: JPEG, PNG, GIF, WEBP, HEIC.`,
              ),
              false,
            );
          }
          cb(null, true);
        },
      },
    ),
  )
  async createProduct(
    @CurrentUser() user: UserDocument,
    @Body() productData: Omit<ProductDto, 'images'>,
    @UploadedFiles()
    allFiles: {
      images: Express.Multer.File[];
      brandLogo?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
  ) {
    // Log received files for debugging
    console.log('📦 Product upload request:', {
      userId: user?._id,
      userName: user?.name,
      imagesCount: allFiles?.images?.length || 0,
      brandLogoCount: allFiles?.brandLogo?.length || 0,
      videoCount: allFiles?.video?.length || 0,
      imageNames: allFiles?.images?.map((f) => f.originalname) || [],
      productName: productData?.name,
    });

    const files = allFiles.images;
    const { brandLogo } = allFiles;
    const videoFile = allFiles.video?.[0] || null;

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    try {
      // Process images with error handling to prevent server crashes
      const imageUrls = await Promise.all(
        files.map(async (file) => {
          try {
            const fileBuffer = require('fs').readFileSync(file.path);
            const fileWithBuffer = {
              ...file,
              buffer: fileBuffer,
            };
            return await this.appService.uploadImageToCloudinary(
              fileWithBuffer,
            );
          } catch (uploadError) {
            console.error('Failed to upload image to Cloudinary:', uploadError);
            throw new BadRequestException(
              `Failed to upload image: ${file.originalname}`,
            );
          } finally {
            // Clean up temp file
            try {
              require('fs').unlinkSync(file.path);
            } catch (cleanupError) {
              console.warn('Failed to cleanup temp file:', cleanupError);
            }
          }
        }),
      );

      let brandLogoUrl = null;

      if (brandLogo && brandLogo.length > 0) {
        const fileBuffer = require('fs').readFileSync(brandLogo[0].path);
        const fileWithBuffer = {
          ...brandLogo[0],
          buffer: fileBuffer,
        };
        brandLogoUrl =
          await this.appService.uploadImageToCloudinary(fileWithBuffer);
        // Clean up temp file
        try {
          require('fs').unlinkSync(brandLogo[0].path);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp brandLogo file:', cleanupError);
        }
      } else if (productData.brandLogoUrl) {
        brandLogoUrl = productData.brandLogoUrl;
      } else if (user.role === Role.Seller && user.storeLogoPath) {
        // Use seller's store logo if no brand logo is provided
        brandLogoUrl = user.storeLogoPath;
      }

      // Parse JSON arrays for attributes if they're strings
      let ageGroups = productData.ageGroups;
      let sizes = productData.sizes;
      let colors = productData.colors;
      let hashtags = productData.hashtags;
      let dimensions = productData.dimensions;
      let materials = productData.materials;
      let materialsEn = productData.materialsEn;

      if (typeof ageGroups === 'string') {
        try {
          ageGroups = JSON.parse(ageGroups);
        } catch (e) {
          ageGroups = [];
        }
      }

      if (typeof sizes === 'string') {
        try {
          sizes = JSON.parse(sizes);
        } catch (e) {
          sizes = [];
        }
      }

      if (typeof colors === 'string') {
        try {
          colors = JSON.parse(colors);
        } catch (e) {
          colors = [];
        }
      }

      if (typeof hashtags === 'string') {
        try {
          hashtags = JSON.parse(hashtags);
        } catch (e) {
          hashtags = [];
        }
      }

      if (typeof dimensions === 'string') {
        try {
          dimensions = JSON.parse(dimensions);
        } catch (e) {
          dimensions = undefined;
        }
      }

      if (typeof materials === 'string') {
        try {
          materials = JSON.parse(materials);
        } catch (e) {
          materials = [];
        }
      }

      if (typeof materialsEn === 'string') {
        try {
          materialsEn = JSON.parse(materialsEn);
        } catch (e) {
          materialsEn = [];
        }
      }

      // Parse isOriginal boolean
      if (typeof productData.isOriginal === 'string') {
        productData.isOriginal = productData.isOriginal === 'true';
      }

      // Parse campaign discount fields
      const rawReferralDiscountPercent = (productData as any)
        .referralDiscountPercent;
      let referralDiscountPercent: number | undefined;
      if (rawReferralDiscountPercent !== undefined) {
        referralDiscountPercent = Number(rawReferralDiscountPercent);
        if (isNaN(referralDiscountPercent)) {
          referralDiscountPercent = 0;
        }
      }

      const rawUseArtistDefaultDiscount = (productData as any)
        .useArtistDefaultDiscount;
      let useArtistDefaultDiscount: boolean | undefined;
      if (typeof rawUseArtistDefaultDiscount === 'string') {
        useArtistDefaultDiscount = rawUseArtistDefaultDiscount === 'true';
      } else if (typeof rawUseArtistDefaultDiscount === 'boolean') {
        useArtistDefaultDiscount = rawUseArtistDefaultDiscount;
      }

      const rawAddToPortfolio = (productData as any).addToPortfolio;
      let addToPortfolio: boolean | undefined;

      if (typeof rawAddToPortfolio === 'string') {
        const normalized = rawAddToPortfolio.trim().toLowerCase();
        addToPortfolio = !['false', '0', 'off', 'no'].includes(normalized);
      } else if (typeof rawAddToPortfolio === 'boolean') {
        addToPortfolio = rawAddToPortfolio;
      }

      // Ensure materials is always an array
      if (!materials) {
        materials = [];
      }

      if (!materialsEn) {
        materialsEn = [];
      }

      // Extract the main category data
      const {
        mainCategory,
        subCategory,
        videoDescription,
        ...otherProductData
      } = productData;

      // ========================================
      // GET YOUTUBE DATA FROM FORM (uploaded separately via /upload-video)
      // ========================================
      const youtubeVideoId = (productData as any).youtubeVideoId;
      const youtubeVideoUrl = (productData as any).youtubeVideoUrl;
      const youtubeEmbedUrl = (productData as any).youtubeEmbedUrl;

      if (youtubeVideoId) {
        console.log('📹 YouTube data received from form:', {
          youtubeVideoId,
          youtubeVideoUrl,
          youtubeEmbedUrl,
        });
      }

      // If video file was sent with the form (legacy support), cleanup it
      if (videoFile?.path) {
        try {
          require('fs').unlinkSync(videoFile.path);
          console.log(
            '🧹 Cleaned up unused video file (video already uploaded separately)',
          );
        } catch (cleanupError) {
          console.warn('Failed to cleanup video file:', cleanupError);
        }
      }

      // Create the product with proper category references (including YouTube data if available)
      const createdProduct = await this.productsService.create(
        {
          ...otherProductData,
          // Set brand name to seller's store name if not provided
          brand:
            otherProductData.brand ||
            (user.role === Role.Seller ? user.name : undefined),
          // Keep legacy fields for backward compatibility
          category: otherProductData.category || 'Other',
          // New category system
          mainCategory,
          subCategory,
          ageGroups,
          sizes,
          colors,
          hashtags,
          dimensions,
          materials,
          materialsEn,
          user,
          images: imageUrls,
          brandLogo: brandLogoUrl,
          videoDescription,
          // Campaign discount fields
          referralDiscountPercent,
          useArtistDefaultDiscount,
          // YouTube data (from form)
          ...(youtubeVideoId && {
            youtubeVideoId,
            youtubeVideoUrl,
            youtubeEmbedUrl,
          }),
        },
        {
          addToPortfolio: addToPortfolio ?? true,
        },
      );

      // Cleanup image temp files
      files.forEach((file) => {
        try {
          if (file.path && require('fs').existsSync(file.path)) {
            require('fs').unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp image file:', cleanupError);
        }
      });

      // Cleanup brandLogo temp file
      if (brandLogo && brandLogo.length > 0 && brandLogo[0].path) {
        try {
          require('fs').unlinkSync(brandLogo[0].path);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp brandLogo file:', cleanupError);
        }
      }

      return createdProduct;
    } catch (error) {
      console.error('Error creating product:', error);
      throw new InternalServerErrorException(
        'Failed to process images or create product ',
        error.message,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Seller)
  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 10 },
        { name: 'brandLogo', maxCount: 1 },
        { name: 'video', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: (req, file, cb) => {
            const uploadDir = './uploads/temp';
            require('fs').mkdirSync(uploadDir, { recursive: true });
            cb(null, uploadDir);
          },
          filename: (req, file, cb) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(
              null,
              file.fieldname + '-' + uniqueSuffix + '-' + file.originalname,
            );
          },
        }),
        limits: {
          fileSize: 500 * 1024 * 1024, // 500MB for videos
          files: 15, // Limit total files
        },
        fileFilter: (req, file, cb) => {
          console.log('📁 File received (update):', {
            fieldname: file.fieldname,
            mimetype: file.mimetype,
            originalname: file.originalname,
            size: file.size,
          });

          const imageMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/jpg',
            'image/gif',
            'image/webp',
            'image/heic',
            'image/heif',
          ];
          const videoMimeTypes = [
            'video/mp4',
            'video/quicktime',
            'video/mpeg',
            'video/x-matroska',
            'video/webm',
            'video/x-msvideo', // AVI
            'video/3gpp', // 3GP
            'video/x-flv', // FLV
          ];

          const mimetype = file.mimetype.toLowerCase();

          if (file.fieldname === 'video') {
            if (!videoMimeTypes.includes(mimetype)) {
              console.error('❌ Unsupported video type:', file.mimetype);
              return cb(
                new Error(
                  `Unsupported video type: ${file.mimetype}. Supported types: MP4, MOV, MPEG, MKV, WEBM, AVI, 3GP.`,
                ),
                false,
              );
            }
            return cb(null, true);
          }

          // Note: File size validation happens after upload completes
          // The 10MB limit for images is enforced by Cloudinary and shown in frontend validation

          if (!imageMimeTypes.includes(mimetype)) {
            console.error('❌ Unsupported file type:', file.mimetype);
            return cb(
              new Error(
                `Unsupported file type: ${file.mimetype}. Supported types: JPEG, PNG, GIF, WEBP, HEIC.`,
              ),
              false,
            );
          }
          cb(null, true);
        },
      },
    ),
  )
  async updateProduct(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body()
    productData: Omit<ProductDto, 'images'> & { existingImages?: string }, // Modified type to include existingImages
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      brandLogo?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
  ) {
    const product = await this.productsService.findById(id);
    if (
      user.role !== Role.Admin &&
      (product.user as any)._id.toString() !== user._id.toString()
    ) {
      throw new UnauthorizedException('You can only edit your own products');
    }

    try {
      let imageUrls;
      let brandLogoUrl;
      const videoFile = files?.video?.[0] || null;

      if (files?.images?.length) {
        imageUrls = await Promise.all(
          files.images.map(async (file) => {
            try {
              const fileBuffer = require('fs').readFileSync(file.path);
              const fileWithBuffer = {
                ...file,
                buffer: fileBuffer,
              };
              return await this.appService.uploadImageToCloudinary(
                fileWithBuffer,
              );
            } catch (uploadError) {
              console.error(
                'Failed to upload image to Cloudinary:',
                uploadError,
              );
              throw new BadRequestException(
                `Failed to upload image: ${file.originalname}`,
              );
            }
            // Don't cleanup here - will be cleaned up after YouTube processing decision
          }),
        );
      }

      if (files?.brandLogo?.length) {
        const fileBuffer = require('fs').readFileSync(files.brandLogo[0].path);
        const fileWithBuffer = {
          ...files.brandLogo[0],
          buffer: fileBuffer,
        };
        brandLogoUrl =
          await this.appService.uploadImageToCloudinary(fileWithBuffer);
        // Don't cleanup here - will be cleaned up after YouTube processing decision
      } else if (productData.brandLogoUrl) {
        brandLogoUrl = productData.brandLogoUrl;
      } else if (
        user.role === Role.Seller &&
        user.storeLogoPath &&
        !productData.brandLogo
      ) {
        // Use seller's store logo if no brand logo is provided
        brandLogoUrl = user.storeLogoPath;
      }

      // Parse JSON arrays for attributes if they're strings
      let ageGroups = productData.ageGroups;
      let sizes = productData.sizes;
      let colors = productData.colors;
      let hashtags = productData.hashtags;
      let dimensions = productData.dimensions;
      let materials = productData.materials;
      let materialsEn = productData.materialsEn;

      if (typeof ageGroups === 'string') {
        try {
          ageGroups = JSON.parse(ageGroups);
        } catch (e) {
          ageGroups = [];
        }
      }

      if (typeof sizes === 'string') {
        try {
          sizes = JSON.parse(sizes);
        } catch (e) {
          sizes = [];
        }
      }

      if (typeof colors === 'string') {
        try {
          colors = JSON.parse(colors);
        } catch (e) {
          colors = [];
        }
      }

      if (typeof hashtags === 'string') {
        try {
          hashtags = JSON.parse(hashtags);
        } catch (e) {
          hashtags = [];
        }
      }

      if (typeof dimensions === 'string') {
        try {
          dimensions = JSON.parse(dimensions);
        } catch (e) {
          dimensions = undefined;
        }
      }

      if (typeof materials === 'string') {
        try {
          materials = JSON.parse(materials);
        } catch (e) {
          materials = [];
        }
      }

      if (typeof materialsEn === 'string') {
        try {
          materialsEn = JSON.parse(materialsEn);
        } catch (e) {
          materialsEn = [];
        }
      }

      // Parse isOriginal boolean
      if (typeof productData.isOriginal === 'string') {
        productData.isOriginal = productData.isOriginal === 'true';
      }

      // Ensure materials is always an array
      if (!materials) {
        materials = [];
      }

      if (!materialsEn) {
        materialsEn = [];
      }

      // Handle existing images
      let existingImages = [];
      if (productData.existingImages) {
        try {
          existingImages = JSON.parse(productData.existingImages as string);
        } catch (e) {
          console.error('Error parsing existingImages:', e);
        }
      }

      // Combine existing images with new uploads if any
      const finalImages = imageUrls
        ? [...existingImages, ...imageUrls]
        : existingImages.length > 0
          ? existingImages
          : product.images; // Keep original images if no new ones provided

      // Remove user property if it exists in productData to avoid schema conflicts
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {
        user: userFromData,
        existingImages: _,
        ...productDataWithoutUser
      } = productData as any;

      // Explicitly handle mainCategory and subCategory to ensure they are updated properly
      const mainCategory =
        productData.mainCategory !== undefined
          ? productData.mainCategory
          : product.mainCategory;

      const subCategory =
        productData.subCategory !== undefined
          ? productData.subCategory
          : product.subCategory;

      const parseVariants =
        typeof productData.variants === 'string'
          ? JSON.parse(productData.variants)
          : productData.variants;

      // Create update data object
      const updateData = {
        ...productDataWithoutUser,
        // Set brand name to seller's store name if not provided
        brand:
          productDataWithoutUser.brand ||
          (user.role === Role.Seller ? user.name : product.brand),
        mainCategory,
        subCategory,
        images: finalImages,
        ...(brandLogoUrl && { brandLogo: brandLogoUrl }),
        ...(user.role === Role.Seller && { status: ProductStatus.PENDING }),
        ageGroups,
        sizes,
        colors,
        hashtags,
        variants: parseVariants,
        videoDescription: productData.videoDescription,
        // Add discount fields
        discountPercentage: productData.discountPercentage
          ? Number(productData.discountPercentage)
          : undefined,
        discountStartDate: productData.discountStartDate
          ? new Date(productData.discountStartDate)
          : undefined,
        discountEndDate: productData.discountEndDate
          ? new Date(productData.discountEndDate)
          : undefined,
      };

      // Explicitly set the parsed new fields to ensure they override any values from productDataWithoutUser
      updateData.dimensions = dimensions;
      updateData.materials = materials;
      updateData.materialsEn = materialsEn;
      updateData.isOriginal = productData.isOriginal;

      // Parse and set campaign discount fields
      const rawReferralDiscountPercent = (productData as any)
        .referralDiscountPercent;
      console.log(
        '🎯 Campaign discount update - raw value:',
        rawReferralDiscountPercent,
      );
      if (rawReferralDiscountPercent !== undefined) {
        const parsed = Number(rawReferralDiscountPercent);
        updateData.referralDiscountPercent = isNaN(parsed) ? 0 : parsed;
        console.log(
          '🎯 Campaign discount update - parsed value:',
          updateData.referralDiscountPercent,
        );
      }

      const rawUseArtistDefaultDiscount = (productData as any)
        .useArtistDefaultDiscount;
      console.log(
        '🎯 useArtistDefaultDiscount update - raw value:',
        rawUseArtistDefaultDiscount,
      );
      if (rawUseArtistDefaultDiscount !== undefined) {
        updateData.useArtistDefaultDiscount =
          typeof rawUseArtistDefaultDiscount === 'string'
            ? rawUseArtistDefaultDiscount === 'true'
            : rawUseArtistDefaultDiscount;
        console.log(
          '🎯 useArtistDefaultDiscount update - parsed value:',
          updateData.useArtistDefaultDiscount,
        );
      }

      // ========================================
      // GET YOUTUBE DATA FROM FORM (uploaded separately via /upload-video)
      // ========================================
      const youtubeVideoId = (productData as any).youtubeVideoId;
      const youtubeVideoUrl = (productData as any).youtubeVideoUrl;
      const youtubeEmbedUrl = (productData as any).youtubeEmbedUrl;

      if (youtubeVideoId) {
        console.log('📹 YouTube data received from form (update):', {
          youtubeVideoId,
          youtubeVideoUrl,
          youtubeEmbedUrl,
        });
        updateData.youtubeVideoId = youtubeVideoId;
        updateData.youtubeVideoUrl = youtubeVideoUrl;
        updateData.youtubeEmbedUrl = youtubeEmbedUrl;
      } else if (youtubeVideoUrl) {
        // Keep existing YouTube URL if provided
        updateData.youtubeVideoUrl = youtubeVideoUrl;
      }

      // If video file was sent with the form (legacy support), cleanup it
      if (videoFile?.path) {
        try {
          require('fs').unlinkSync(videoFile.path);
          console.log('🧹 Cleaned up unused video file (update)');
        } catch (cleanupError) {
          console.warn('Failed to cleanup video file:', cleanupError);
        }
      }

      const updatedProduct = await this.productsService.update(id, updateData);

      // Cleanup image temp files
      if (files?.images?.length) {
        files.images.forEach((file) => {
          try {
            if (file.path && require('fs').existsSync(file.path)) {
              require('fs').unlinkSync(file.path);
            }
          } catch (cleanupError) {
            console.warn('Failed to cleanup temp image file:', cleanupError);
          }
        });
      }

      // Cleanup brandLogo temp file
      if (files?.brandLogo?.length) {
        try {
          require('fs').unlinkSync(files.brandLogo[0].path);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp brandLogo file:', cleanupError);
        }
      }

      return updatedProduct;
    } catch (error) {
      console.error('Update error:', error);
      throw new InternalServerErrorException(
        'Failed to update product',
        error.message,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/review')
  async createReview(
    @Param('id') id: string,
    @Body() { rating, comment }: ReviewDto,
    @CurrentUser() user: UserDocument,
  ) {
    try {
      return await this.productsService.createReview(id, user, rating, comment);
    } catch (error) {
      console.error('Review error:', error);
      // Re-throw the error to maintain the same behavior for the client
      throw error;
    }
  }

  @Post('agent/chat')
  async chat(@Body() body: ChatRequest, @Res() res: Response) {
    const { messages } = body;

    const result = await this.productExpertAgent.chat(messages);

    return result.pipeDataStreamToResponse(res);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async updateProductStatus(
    @Param('id') id: string,
    @Body()
    {
      status,
      rejectionReason,
    }: { status: ProductStatus; rejectionReason?: string },
  ) {
    const updatedProduct = await this.productsService.updateStatus(
      id,
      status,
      rejectionReason,
    );

    // Send push notifications only in production
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // Send push notification to seller when product status changes
      if (updatedProduct.user) {
        this.sendProductStatusPushNotification(
          updatedProduct,
          status,
          rejectionReason,
        ).catch((error) => {
          console.error(
            'Failed to send product status push notification:',
            error,
          );
        });
      }

      // Send push notification to all users when product is approved
      if (status === ProductStatus.APPROVED) {
        this.sendNewProductPushNotification(updatedProduct).catch((error) => {
          console.error(
            'Failed to send push notification for approved product:',
            error,
          );
        });
      }
    }

    return updatedProduct;
  }

  @Put(':id/visibility')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Toggle product visibility in store (Admin only)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async toggleStoreVisibility(
    @Param('id') id: string,
    @Body() { hideFromStore }: { hideFromStore: boolean },
  ) {
    return this.productsService.updateProductVisibility(id, hideFromStore);
  }

  private prepareFileForBackground(
    file?: Express.Multer.File | null,
  ): BackgroundUploadFile | null {
    if (!file || !file.path) {
      return null;
    }

    try {
      // Check if file exists before trying to read it
      if (!require('fs').existsSync(file.path)) {
        console.warn(
          `Temp file not found for background processing: ${file.path}`,
        );
        return null;
      }

      const buffer = require('fs').readFileSync(file.path);

      return {
        buffer: buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      };
    } catch (error) {
      console.error('Failed to prepare file for background processing:', error);
      return null;
    }
  }

  @Post(':id/post-to-facebook')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({
    summary:
      'Manually post a product to all platforms (Facebook, Instagram, Groups)',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async postProductToFacebook(@Param('id') id: string) {
    // Ensure we populate seller info so author and profile link appear in the caption
    const product = await this.productsService.findByIdWithUser(id);

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Post to all platforms (Page, Groups, Instagram)
    const result = await this.facebookPostingService.postToAllPlatforms(
      product as any,
    );

    if (!result.success) {
      // Attach a friendlier message if common permission issue occurs
      const errors = result.errors || [];
      const firstError = errors[0]?.error;
      const msg = (firstError?.error?.message ||
        firstError?.message ||
        '') as string;

      if (/publish_actions/i.test(msg)) {
        throw new BadRequestException(
          'Facebook rejected the request. Use a Page Access Token with pages_manage_posts in FACEBOOK_POSTS_PAGE_ACCESS_TOKEN and ensure FACEBOOK_POSTS_PAGE_ID is set.',
        );
      }
      throw new BadRequestException(
        firstError || 'Failed to post to social media platforms',
      );
    }

    // Build success response with all platform results
    const platforms: string[] = [];
    if (result.pagePost?.success) platforms.push('Facebook Page');
    if (result.groupPosts?.some((g) => g.success))
      platforms.push('Facebook Groups');
    if (result.instagramPost?.success) platforms.push('Instagram');

    return {
      ok: true,
      platforms,
      pagePost: result.pagePost,
      groupPosts: result.groupPosts,
      instagramPost: result.instagramPost,
    };
  }

  @Get('colors')
  @ApiOperation({ summary: 'Get all unique colors used in products' })
  @ApiResponse({
    status: 200,
    description: 'Returns all unique colors',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  getAllColors() {
    return this.productsService.getAllColors();
  }

  @Get('sizes')
  @ApiOperation({ summary: 'Get all unique sizes used in products' })
  @ApiResponse({
    status: 200,
    description: 'Returns all unique sizes',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  getAllSizes() {
    return this.productsService.getAllSizes();
  }

  @Get('age-groups')
  @ApiOperation({ summary: 'Get all unique age groups used in products' })
  @ApiResponse({
    status: 200,
    description: 'Returns all unique age groups',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  getAllAgeGroups() {
    return this.productsService.getAllAgeGroups();
  }

  @Post('fix-heic-logos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({
    summary: 'Fix HEIC brand logos by converting to JPEG format (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the number of updated products and any errors',
    schema: {
      properties: {
        updated: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async fixHeicBrandLogos() {
    return this.productsService.fixHeicBrandLogos();
  }

  // Private method to send push notification for approved product to all users
  private async sendNewProductPushNotification(product: any) {
    try {
      // Double-check production environment
      if (process.env.NODE_ENV !== 'production') {
        console.log('⏭️  Skipping push notification (not in production)');
        return;
      }

      const pushPayload = {
        title: '🆕 ახალი ნამუშევარი SoulArt-ზე!',
        body: `${product.name || product.nameEn || 'ახალი ნამუშევარი'} - იხილეთ ახალი შემოთავაზება!`,
        icon: product.images?.[0] || '/android-icon-192x192.png',
        badge: '/favicon-96x96.png',
        data: {
          type: 'new_product' as const,
          url: `/products/${product._id}`,
          id: product._id,
        },
        tag: `new-product-${product._id}`,
        requireInteraction: true,
      };

      console.log(
        '📤 Sending push notification for new product:',
        product.name || product.nameEn,
      );

      // Send push notification to all subscribers using the service
      const results = await this.pushNotificationService.sendToAll(pushPayload);

      console.log('✅ Push notification sent successfully:', {
        sent: results.successful,
        failed: results.failed,
      });
    } catch (error) {
      console.error('❌ Failed to send push notification:', error.message);
      // Don't throw error - push notification failure shouldn't break product creation
    }
  }

  // Private method to send push notification for product status change to seller
  private async sendProductStatusPushNotification(
    product: any,
    status: ProductStatus,
    rejectionReason?: string,
  ) {
    try {
      // Double-check production environment
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          '⏭️  Skipping status push notification (not in production)',
        );
        return;
      }

      let title: string;
      let body: string;
      let notificationType: 'product_approved' | 'product_rejected';

      if (status === ProductStatus.APPROVED) {
        title = '🎉 თქვენი ნამუშევარი დამტკიცდა!';
        body = `თქვენი ნამუშევარი "${product.name || product.nameEn}" წარმატებით დამტკიცდა და ახლა ხელმისაწვდომია მაღაზიაში.`;
        notificationType = 'product_approved';
      } else if (status === ProductStatus.REJECTED) {
        title = '❌ თქვენი ნამუშევარი არ დამტკიცდა';
        body = `თქვენი ნამუშევარი "${product.name || product.nameEn}" არ დამტკიცდა.${rejectionReason ? ` მიზეზი: ${rejectionReason}` : ''}`;
        notificationType = 'product_rejected';
      } else {
        // For other status changes, don't send notification
        return;
      }

      const pushPayload = {
        title,
        body,
        icon: product.images?.[0] || '/android-icon-192x192.png',
        badge: '/favicon-96x96.png',
        data: {
          type: notificationType,
          url: `/products/${product._id}`,
          id: product._id,
        },
        tag: `product-status-${product._id}`,
        requireInteraction: true,
      };

      console.log(
        `📤 Sending ${status.toLowerCase()} push notification to seller:`,
        product.user._id,
      );

      // Send push notification to specific user using the service
      const results = await this.pushNotificationService.sendToUser(
        product.user._id.toString(),
        pushPayload,
      );

      console.log(
        `✅ Product ${status.toLowerCase()} push notification sent successfully:`,
        { sent: results.successful, failed: results.failed },
      );
    } catch (error) {
      console.error(
        `❌ Failed to send product ${status.toLowerCase()} push notification:`,
        error.message,
      );
      // Don't throw error - push notification failure shouldn't break product status update
    }
  }
}
