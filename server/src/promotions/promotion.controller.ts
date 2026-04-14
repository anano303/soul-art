import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';
import { Roles } from '@/decorators/roles.decorator';
import { Role } from '@/types/role.enum';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { User } from '@/users/schemas/user.schema';

@Controller('promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Get('my')
  @Roles(Role.Seller, Role.Admin)
  async findMy(
    @CurrentUser() user: User,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.promotionService.findBySeller(
      (user as any)._id.toString(),
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get()
  @Roles(Role.Admin)
  async findAll(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.promotionService.findAll(
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post(':id/confirm')
  @Roles(Role.Admin)
  async confirm(@Param('id') id: string) {
    return this.promotionService.confirm(id);
  }
}
