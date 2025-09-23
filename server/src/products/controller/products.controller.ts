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
  UploadedFile,
  UploadedFiles,
  Res,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { RolesGuard } from '@/guards/roles.guard';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { ProductDto } from '../dtos/product.dto';
import { ReviewDto } from '../dtos/review.dto';
import { ProductsService } from '../services/products.service';
import { UserDocument } from '@/users/schemas/user.schema';
import { CurrentUser } from '@/decorators/current-user.decorator';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { AppService } from '@/app/services/app.service';
import { ProductExpertAgent } from '@/ai/agents/product-expert.agent';
import { Response } from 'express';
import { ChatRequest } from '@/types/agents';
import { Roles } from '@/decorators/roles.decorator';
import { Role } from '@/types/role.enum';
import { ProductStatus } from '../schemas/product.schema';
import { MainCategory } from '@/types';

@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private appService: AppService,
    private productExpertAgent: ProductExpertAgent,
  ) {}

  @Get()
  getProducts(
    @Query('keyword') keyword: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('brand') brand: string,
    @Query('mainCategory') mainCategory: string,
    @Query('subCategory') subCategory: string,
    @Query('sortBy') sortBy: string,
    @Query('sortDirection') sortDirection: 'asc' | 'desc',
  ) {
    console.log('Getting products with mainCategory:', mainCategory);
    return this.productsService.findMany(
      keyword,
      page,
      limit,
      undefined,
      ProductStatus.APPROVED,
      brand,
      mainCategory,
      subCategory,
      sortBy,
      sortDirection,
    );
  }

  @Get('user')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Seller)
  getUserProducts(
    @CurrentUser() user: UserDocument,
    @Query('keyword') keyword: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.productsService.findMany(
      keyword,
      page,
      limit,
      user.role === Role.Admin ? undefined : user,
    );
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getPendingProducts() {
    console.log('Getting pending products');
    return this.productsService.findByStatus(ProductStatus.PENDING);
  }

  @Get('topRated')
  getTopRatedProducts() {
    return this.productsService.findTopRated();
  }

  @Get(':id')
  getProduct(@Param('id') id: string) {
    return this.productsService.findById(id);
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
        {
          name: 'images',
          maxCount: 10,
        },
        {
          name: 'brandLogo',
          maxCount: 1,
        },
      ],
      {
        fileFilter: (req, file, cb) => {
          const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/jpg',
            'image/gif',
          ];
          if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Only image files are allowed!'), false);
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
    console.log('Received files:', files);
    console.log('Received brand logo:', brandLogo);
    console.log('Received product data:', productData);

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    try {
      const imageUrls = await Promise.all(
        files.map((file) => this.appService.uploadImageToCloudinary(file)),
      );

      let brandLogoUrl = null;

      if (brandLogo && brandLogo.length > 0) {
        console.log('Processing brand logo file upload');
        brandLogoUrl = await this.appService.uploadImageToCloudinary(
          brandLogo[0],
        );
      } else if (productData.brandLogoUrl) {
        console.log('Using provided brand logo URL:', productData.brandLogoUrl);
        brandLogoUrl = productData.brandLogoUrl;
      }

      console.log('Final brand logo URL:', brandLogoUrl);
      console.log('Creating product with data:', {
        ...productData,
        user,
        images: imageUrls,
        brandLogo: brandLogoUrl,
      });

      return this.productsService.create({
        ...productData,
        categoryStructure:
          typeof productData.categoryStructure === 'string'
            ? JSON.parse(productData.categoryStructure)
            : productData.categoryStructure,
        user,
        images: imageUrls,
        brandLogo: brandLogoUrl,
      });
    } catch (error: any) {
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
    @Body() productData: Omit<ProductDto, 'images'>,
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      brandLogo?: Express.Multer.File[];
    },
  ) {
    console.log('Update request received:', { id, productData, files });

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
      }

      // Handle category structure if it exists in the request
      let categoryStructure;
      if (productData.categoryStructure) {
        try {
          // If it's a string (from form data), parse it
          if (typeof productData.categoryStructure === 'string') {
            categoryStructure = JSON.parse(productData.categoryStructure);
          } else {
            categoryStructure = productData.categoryStructure;
          }
        } catch (error) {
          console.error('Error parsing category structure:', error);
        }
      }

      const updateData = {
        ...productData,
        ...(imageUrls && { images: imageUrls }),
        ...(brandLogoUrl && { brandLogo: brandLogoUrl }),
        ...(categoryStructure && { categoryStructure }),
        ...(user.role === Role.Seller && { status: ProductStatus.PENDING }),
      };

      console.log('Updating product with data:', updateData);
      const updatedProduct = await this.productsService.update(id, updateData);

      console.log('Product updated successfully:', updatedProduct);
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
  createReview(
    @Param('id') id: string,
    @Body() { rating, comment }: ReviewDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.productsService.createReview(id, user, rating, comment);
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
    return this.productsService.updateStatus(id, status, rejectionReason);
  }
}
