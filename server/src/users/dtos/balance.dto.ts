import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class WithdrawalRequestDto {
  @IsNumber()
  @Min(1, { message: 'თანხა უნდა იყოს მინიმუმ 1 ლარი' })
  amount: number;
}

export class BalanceResponseDto {
  totalBalance: number;
  totalEarnings: number;
  pendingWithdrawals: number;
  totalWithdrawn: number;
  seller?: any;
}

export class TransactionResponseDto {
  seller: any;
  order: any;
  amount: number;
  type: string;
  description: string;
  commissionPercentage?: number;
  commissionAmount?: number;
  deliveryCommissionAmount?: number;
  productPrice?: number;
  finalAmount?: number;
  createdAt: Date;
}
