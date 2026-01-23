import { Expose, Type } from 'class-transformer';
import { UserDto } from './user.dto';

class RoleCountsDto {
  @Expose()
  admin!: number;

  @Expose()
  seller!: number;

  @Expose()
  user!: number;

  @Expose()
  blogger!: number;

  @Expose()
  sales_manager?: number;
}

class UsersSummaryDto {
  @Expose()
  totalUsers!: number;

  @Expose()
  @Type(() => RoleCountsDto)
  roleCounts!: RoleCountsDto;

  @Expose()
  activeSellers?: number;

  @Expose()
  activeSalesManagers?: number;
}

class SellerProductStatsDto {
  @Expose()
  productCount!: number;

  @Expose()
  lastProductDate?: Date | null;
}

export class PaginatedUsersDto {
  @Expose()
  @Type(() => UserDto)
  items!: UserDto[];

  @Expose()
  total!: number;

  @Expose()
  page!: number;

  @Expose()
  pages!: number;

  @Expose()
  @Type(() => UsersSummaryDto)
  summary!: UsersSummaryDto;

  @Expose()
  sellerProductStats?: Record<string, SellerProductStatsDto>;
}
