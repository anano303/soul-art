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

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private appService: AppService,
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
  ) {
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Seller)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 10 },
        { name: 'brandLogo', maxCount: 1 },
      ],
      {
        fileFilter: (req, file, cb) => {
          const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/jpg',
            'image/gif',
            'image/webp',
            'image/heic',
            'image/heif',
          ];
          if (!allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
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
    },
  ) {
    const files = allFiles.images;
    const { brandLogo } = allFiles;

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    try {
      const imageUrls = await Promise.all(
        files.map((file) => this.appService.uploadImageToCloudinary(file)),
      );

      let brandLogoUrl = null;

      if (brandLogo && brandLogo.length > 0) {
        brandLogoUrl = await this.appService.uploadImageToCloudinary(
          brandLogo[0],
        );
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

      // Extract the main category data
      const {
        mainCategory,
        subCategory,
        videoDescription,
        ...otherProductData
      } = productData;

      // Create the product with proper category references
      const createdProduct = await this.productsService.create({
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
        user,
        images: imageUrls,
        brandLogo: brandLogoUrl,
        videoDescription,
      });

      // Send push notification for new product (don't await to avoid blocking response)
      this.sendNewProductPushNotification(createdProduct).catch((error) => {
        console.error(
          'Failed to send push notification for new product:',
          error,
        );
      });

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
    FileFieldsInterceptor([
      { name: 'images', maxCount: 10 },
      { name: 'brandLogo', maxCount: 1 },
    ]),
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
    },
  ) {
    const product = await this.productsService.findById(id);
    if (
      user.role !== Role.Admin &&
      product.user.toString() !== user._id.toString()
    ) {
      throw new UnauthorizedException('You can only edit your own products');
    }

    try {
      let imageUrls;
      let brandLogoUrl;

      if (files?.images?.length) {
        imageUrls = await Promise.all(
          files.images.map((file) =>
            this.appService.uploadImageToCloudinary(file),
          ),
        );
      }

      if (files?.brandLogo?.length) {
        brandLogoUrl = await this.appService.uploadImageToCloudinary(
          files.brandLogo[0],
        );
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

      const updatedProduct = await this.productsService.update(id, updateData);

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

    return updatedProduct;
  }

  @Post(':id/post-to-facebook')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Manually post a product to Facebook Page (Admin)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async postProductToFacebook(@Param('id') id: string) {
    // Ensure we populate seller info so author and profile link appear in the caption
    const product = await this.productsService.findByIdWithUser(id);

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Best-effort call, return the result
    const result = await this.facebookPostingService.postApprovedProduct(
      product as any,
    );

    if (!result.success) {
      // Attach a friendlier message if common permission issue occurs
      const msg = (result.error?.error?.message ||
        result.error?.message ||
        '') as string;
      if (/publish_actions/i.test(msg)) {
        throw new BadRequestException(
          'Facebook rejected the request. Use a Page Access Token with pages_manage_posts in FACEBOOK_POSTS_PAGE_ACCESS_TOKEN and ensure FACEBOOK_POSTS_PAGE_ID is set.',
        );
      }
      throw new BadRequestException(
        result.error || 'Failed to post to Facebook',
      );
    }

    return {
      ok: true,
      postId: result.postId,
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

  // Private method to send push notification for new product
  private async sendNewProductPushNotification(product: any) {
    try {
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
