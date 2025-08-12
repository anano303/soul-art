import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReferralsService } from '../services/referrals.service';
import {
  CreateWithdrawalRequestDto,
  ProcessWithdrawalDto,
  ReferralStatsDto,
  ApproveSellerDto,
} from '../dtos/referral.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Role } from '../../types/role.enum';
import { WithdrawalStatus } from '../schemas/withdrawal-request.schema';
import { ReferralStatus } from '../schemas/referral.schema';
import { UserDocument } from '../../users/schemas/user.schema';

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  // რეფერალური კოდის მიღება/შექმნა
  @Get('code')
  async getReferralCode(@CurrentUser() user: UserDocument) {
    const referralCode = await this.referralsService.generateUserReferralCode(
      user._id.toString(),
    );
    return { referralCode };
  }

  // რეფერალების სტატისტიკა
  @Get('stats')
  async getReferralStats(
    @CurrentUser() user: UserDocument,
    @Query() statsDto: ReferralStatsDto,
  ) {
    return await this.referralsService.getUserReferralStats(
      user._id.toString(),
    );
  }

  // ბალანსის ისტორია
  @Get('balance/history')
  async getBalanceHistory(
    @CurrentUser() user: UserDocument,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return await this.referralsService.getUserBalanceHistory(
      user._id.toString(),
      limitNum,
    );
  }

  // ბალანსის გატანის მოთხოვნა
  @Post('withdrawal')
  async createWithdrawalRequest(
    @CurrentUser() user: UserDocument,
    @Body() createWithdrawalDto: CreateWithdrawalRequestDto,
  ) {
    return await this.referralsService.createWithdrawalRequest(
      user._id.toString(),
      createWithdrawalDto,
    );
  }

  // მომხმარებლის გატანის მოთხოვნები
  @Get('withdrawal/my-requests')
  async getMyWithdrawalRequests(@CurrentUser() user: UserDocument) {
    return await this.referralsService.getUserWithdrawalRequests(
      user._id.toString(),
    );
  }

  // === ადმინის ფუნქციები ===

  // ყველა გატანის მოთხოვნა (ადმინისთვის)
  @Get('admin/withdrawal/requests')
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  async getAllWithdrawalRequests(@Query('status') status?: WithdrawalStatus) {
    return await this.referralsService.getWithdrawalRequests(status);
  }

  // ყველა რეფერალი (ადმინისთვის)
  @Get('admin/referrals')
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  async getAllReferrals(@Query('status') status?: ReferralStatus) {
    return await this.referralsService.getAllReferrals(status);
  }

  // გატანის მოთხოვნის დამუშავება (ადმინისთვის)
  @Patch('admin/withdrawal/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  async processWithdrawalRequest(
    @Param('id') requestId: string,
    @Body() processWithdrawalDto: ProcessWithdrawalDto,
    @CurrentUser() admin: UserDocument,
  ) {
    return await this.referralsService.processWithdrawalRequest(
      requestId,
      processWithdrawalDto,
      admin._id.toString(),
    );
  }

  // სელერის დამტკიცება და ბონუსის გადაცემა (ადმინისთვის)
  @Post('admin/approve-seller')
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.OK)
  async approveSellerAndPayBonus(@Body() approveSellerDto: ApproveSellerDto) {
    await this.referralsService.approveSellerAndPayBonus(
      approveSellerDto.sellerId,
    );
    return { message: 'სელერი წარმატებით დამტკიცდა და ბონუსი გადაცემულია' };
  }
}
