import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WithdrawalMethod } from '../schemas/withdrawal-request.schema';

export class CreateWithdrawalRequestDto {
  @IsNumber()
  @Min(50, { message: 'მინიმუმ გასატანი თანხა არის 50 ლარი' })
  @Type(() => Number)
  amount: number;

  @IsEnum(WithdrawalMethod)
  method: WithdrawalMethod;

  @IsString()
  accountDetails: string;
}

export class ProcessWithdrawalDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}

export class ReferralStatsDto {
  @IsOptional()
  @IsString()
  period?: 'week' | 'month' | 'year' | 'all';
}

export class ApproveSellerDto {
  @IsMongoId()
  sellerId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
