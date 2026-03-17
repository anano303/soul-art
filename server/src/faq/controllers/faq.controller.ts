import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FaqService } from '../services/faq.service';
import { CreateFaqDto } from '../dtos/create-faq.dto';
import { UpdateFaqDto } from '../dtos/update-faq.dto';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';
import { Roles } from '@/decorators/roles.decorator';
import { Role } from '@/types/role.enum';

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  // Public - აქტიური კითხვები
  @Get()
  async getActive() {
    return this.faqService.findActive();
  }

  // Admin - ყველა კითხვა (აქტიური + არააქტიური)
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getAll() {
    return this.faqService.findAll();
  }

  // Admin - ერთი კითხვა
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getOne(@Param('id') id: string) {
    return this.faqService.findById(id);
  }

  // Admin - დამატება
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async create(@Body() dto: CreateFaqDto) {
    return this.faqService.create(dto);
  }

  // Admin - რედაქტირება
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async update(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.faqService.update(id, dto);
  }

  // Admin - წაშლა
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async delete(@Param('id') id: string) {
    await this.faqService.delete(id);
    return { success: true };
  }

  // Admin - თანმიმდევრობის შეცვლა
  @Post('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async reorder(@Body() body: { ids: string[] }) {
    await this.faqService.reorder(body.ids);
    return { success: true };
  }
}
