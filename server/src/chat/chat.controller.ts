import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ChatService } from './chat.service';

interface ChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestDto {
  messages: ChatMessageDto[];
  searchProducts?: boolean;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() body: ChatRequestDto) {
    const result = await this.chatService.chat(
      body.messages,
      body.searchProducts,
    );
    return result;
  }

  @Post('search-products')
  async searchProducts(
    @Body() body: { query: string; maxPrice?: number; minPrice?: number },
  ) {
    const products = await this.chatService.searchProductsByKeyword(
      body.query,
      body.maxPrice,
      body.minPrice,
    );
    return { products };
  }

  @Get('quick-replies')
  async getQuickReplies() {
    const replies = await this.chatService.getQuickReplies();
    return { replies };
  }

  // ========== ახალი API endpoints ==========

  // ყველა კატეგორია
  @Get('categories')
  async getCategories() {
    const categories = await this.chatService.getCategories();
    return { categories };
  }

  // ბლოგ პოსტები
  @Get('blogs')
  async getBlogs(@Query('limit') limit?: string) {
    const blogs = await this.chatService.getBlogPosts(parseInt(limit || '5'));
    return { blogs };
  }

  // მაღაზიის სტატისტიკა
  @Get('stats')
  async getStoreStats() {
    const stats = await this.chatService.getStoreStats();
    return stats;
  }

  // აქტიური ბანერები
  @Get('banners')
  async getBanners() {
    const banners = await this.chatService.getActiveBanners();
    return { banners };
  }

  // კატეგორიით ძებნა
  @Get('products/category')
  async getProductsByCategory(
    @Query('category') category: string,
    @Query('limit') limit?: string,
  ) {
    const products = await this.chatService.searchByCategory(
      category,
      parseInt(limit || '5'),
    );
    return { products };
  }

  // ფასდაკლებული პროდუქტები
  @Get('products/discounted')
  async getDiscountedProducts(@Query('limit') limit?: string) {
    const products = await this.chatService.getDiscountedProducts(
      parseInt(limit || '5'),
    );
    return { products };
  }

  // ახალი პროდუქტები
  @Get('products/new')
  async getNewProducts(@Query('limit') limit?: string) {
    const products = await this.chatService.getNewProducts(
      parseInt(limit || '5'),
    );
    return { products };
  }

  // ქეშის განახლება
  @Post('refresh-cache')
  async refreshCache() {
    await this.chatService.refreshCache();
    return { success: true, message: 'Cache refreshed' };
  }
}
