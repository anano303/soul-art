import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CampaignsService } from '../services/campaigns.service';
import { CreateCampaignDto } from '../dtos/create-campaign.dto';
import { UpdateCampaignDto } from '../dtos/update-campaign.dto';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';
import { Roles } from '@/decorators/roles.decorator';
import { Role } from '@/types/role.enum';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { UserDocument } from '@/users/schemas/user.schema';
import { CampaignStatus } from '../schemas/campaign.schema';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  /**
   * Public endpoint - Get active campaign for referral pricing
   * No authentication required
   */
  @Get('active')
  async getActive() {
    const campaign = await this.campaignsService.getActiveCampaign();
    return { campaign };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async create(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.campaignsService.create(dto, user._id.toString());
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async findAll(@Query('status') status?: CampaignStatus) {
    return this.campaignsService.findAll(status);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async findOne(@Param('id') id: string) {
    return this.campaignsService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async delete(@Param('id') id: string) {
    await this.campaignsService.delete(id);
    return { success: true };
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async activate(@Param('id') id: string) {
    return this.campaignsService.activate(id);
  }

  @Post(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async deactivate(@Param('id') id: string) {
    return this.campaignsService.deactivate(id);
  }

  @Post(':id/end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async end(@Param('id') id: string) {
    return this.campaignsService.endCampaign(id);
  }

  /**
   * Calculate discount for a product (for testing/preview)
   */
  @Post('calculate-discount')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async calculateDiscount(
    @Body()
    body: {
      price: number;
      referralDiscountPercent?: number;
      artistDefaultDiscount?: number;
      isReferralVisitor?: boolean;
    },
  ) {
    const result = await this.campaignsService.calculateCampaignDiscount(
      {
        price: body.price,
        referralDiscountPercent: body.referralDiscountPercent,
      },
      body.artistDefaultDiscount,
      body.isReferralVisitor,
    );
    return { discount: result };
  }
}
