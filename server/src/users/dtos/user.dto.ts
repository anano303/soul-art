import { Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongoose';
import { Role } from '@/types/role.enum';

export class UserDto {
  @Expose()
  email!: string;

  @Expose()
  @Transform(({ key, obj }) => obj[key])
  _id!: ObjectId;

  @Expose()
  name!: string;

  @Expose()
  role?: Role;

  @Expose()
  accessToken?: string;
  
  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
