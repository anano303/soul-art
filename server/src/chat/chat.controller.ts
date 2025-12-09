import { Controller, Post, Body, Get, Query, Req, Ip, Delete } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Request } from 'express';

interface ChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestDto {
  messages: ChatMessageDto[];
  searchProducts?: boolean;
  sessionId?: string;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(
    @Body() body: ChatRequestDto,
    @Req() req: Request,
    @Ip() ip: string,
  ) {
    const userAgent = req.headers['user-agent'];
    const realIp = req.headers['x-forwarded-for']?.toString() || ip;
    
    const result = await this.chatService.chat(
      body.messages,
      body.searchProducts,
      {
        sessionId: body.sessionId,
        userIp: realIp,
        userAgent,
      },
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

  // ========== ADMIN: ჩატის ლოგები ==========

  // ჩატის ლოგები (ყველა მესიჯი)
  @Get('admin/logs')
  async getChatLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sessionId') sessionId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const logs = await this.chatService.getChatLogs({
      page: parseInt(page || '1'),
      limit: parseInt(limit || '50'),
      sessionId,
      search,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    return logs;
  }

  // ჩატის სესიები (დაჯგუფებული)
  @Get('admin/sessions')
  async getChatSessions(@Query('days') days?: string) {
    const sessions = await this.chatService.getChatSessions(
      parseInt(days || '7'),
    );
    return { sessions };
  }

  // ჩატის სტატისტიკა
  @Get('admin/stats')
  async getChatStats(@Query('days') days?: string) {
    const stats = await this.chatService.getChatStats(parseInt(days || '7'));
    return stats;
  }

  // ჩატის ლოგების წაშლა
  @Delete('admin/logs')
  async clearChatLogs(
    @Query('sessionId') sessionId?: string,
    @Query('beforeDate') beforeDate?: string,
  ) {
    const result = await this.chatService.clearChatLogs({
      sessionId,
      beforeDate: beforeDate ? new Date(beforeDate) : undefined,
    });
    return result;
  }

  // ჩატის ლოგების ემაილზე გაგზავნა
  @Post('admin/logs/email')
  async emailChatLogs(
    @Body() body: { email: string; days?: number; sessionId?: string },
  ) {
    const result = await this.chatService.emailChatLogs(
      body.email,
      body.days || 7,
      body.sessionId,
    );
    return result;
  }
}
