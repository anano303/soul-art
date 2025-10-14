import { Expose, Type } from 'class-transformer';
import { UserDto } from './user.dto';

class RoleCountsDto {
  @Expose()
  admin!: number;

  @Expose()
  seller!: number;

  @Expose()
  user!: number;
}

class UsersSummaryDto {
  @Expose()
  totalUsers!: number;

  @Expose()
  @Type(() => RoleCountsDto)
  roleCounts!: RoleCountsDto;
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
}
