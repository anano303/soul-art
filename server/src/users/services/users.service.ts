import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { User, UserDocument } from '../schemas/user.schema';
import { hashPassword } from '@/utils/password';
import { generateUsers } from '@/utils/seed-users';
import { PaginatedResponse } from '@/types';
import { Role } from '@/types/role.enum';
import { SellerRegisterDto } from '../dtos/seller-register.dto';
import { AdminProfileDto } from '../dtos/admin.profile.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(user: Partial<User>): Promise<UserDocument> {
    try {
      const hashedPassword = await hashPassword(user.password ?? '');
      return await this.userModel.create({
        ...user,
        password: hashedPassword,
        role: user.role ?? Role.User,
      });
    } catch (error: any) {
      this.logger.error(`Failed to create user: ${error.message}`);

      if (error.code === 11000) {
        throw new BadRequestException('Email already exists');
      }

      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }

      throw new BadRequestException('Failed to create user');
    }
  }

  async createMany(users: Partial<User>[]): Promise<UserDocument[]> {
    try {
      return (await this.userModel.insertMany(
        users,
      )) as unknown as UserDocument[];
    } catch (error: any) {
      this.logger.error(`Failed to create users: ${error.message}`);
      throw new BadRequestException('Failed to create users');
    }
  }

  async findOne(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<UserDocument>> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments({}),
    ]);

    return {
      items: users,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async deleteOne(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const result = await this.userModel.findOneAndDelete({ _id: id });
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
  async update(
    id: string,
    attrs: Partial<User>,
    adminRole = false,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }
  
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  
    // მხოლოდ მომხმარებლისთვის პაროლის მოთხოვნა
    if (attrs.password && !adminRole) {
      const passwordMatch = await bcrypt.compare(attrs.password, user.password);
      if (passwordMatch) {
        throw new BadRequestException(
          'New password must be different from the current password',
        );
      }
      attrs.password = await hashPassword(attrs.password);
    }
  
    if (attrs.email) {
      const existingUser = await this.findOne(attrs.email);
      if (existingUser && existingUser._id.toString() !== id) {
        throw new BadRequestException('Email is already in use');
      }
    }
  
    const updateData: Partial<User> = {
      ...attrs,
      role: adminRole ? attrs.role : undefined, // Admins can update the role
      // პაროლი მხოლოდ მაშინ განახლდება, როცა არ არის ადმინისტრატორი და პაროლი მოცემულია
      password: attrs.password || undefined,
    };
  
    // Remove undefined values
    type UpdateKeys = keyof Partial<User>;
    Object.keys(updateData as Record<UpdateKeys, unknown>).forEach(
      (key) =>
        updateData[key as UpdateKeys] === undefined &&
        delete updateData[key as UpdateKeys],
    );
  
    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true },
      );
  
      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
  
      this.logger.log(`User ${id} updated successfully`);
      return updatedUser;
    } catch (error: any) {
      this.logger.error(`Failed to update user ${id}: ${error.message}`);
      throw new BadRequestException('Failed to update user');
    }
  }
  

  async adminUpdate(id: string, updateDto: AdminProfileDto) {
    try {
      const user = await this.userModel.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }
  
      // მხოლოდ განახლება იმ ველების, რომლებიც მოვიდა
      if (updateDto.name) user.name = updateDto.name;
      if (updateDto.email) user.email = updateDto.email;
      if (updateDto.role) user.role = updateDto.role;
  
      // თუ პაროლი არ არის გაცემული, არ უნდა შეიცვალოს
      if (updateDto.password) {
        const hashedPassword = await hashPassword(updateDto.password);
        user.password = hashedPassword;
      }
  
      await user.save();
      return user;
    } catch (error) {
      this.logger.error(`Failed to update user: ${error.message}`);
      throw error;
    }
  }
  

  async deleteMany(): Promise<void> {
    try {
      await this.userModel.deleteMany({});
      this.logger.log('All users deleted successfully');
    } catch (error: any) {
      this.logger.error(`Failed to delete users: ${error.message}`);
      throw new BadRequestException('Failed to delete users');
    }
  }

  async generateUsers(count: number): Promise<UserDocument[]> {
    const generatedUsers = await generateUsers(count);
    return this.createMany(generatedUsers);
  }

  async createSeller(dto: SellerRegisterDto): Promise<UserDocument> {
    try {
      const existingUser = await this.userModel.findOne({ email: dto.email });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      const sellerData = {
        ...dto,
        name: dto.storeName,
        role: Role.Seller,
        password: dto.password,
      };

      return await this.create(sellerData);
    } catch (error: any) {
      this.logger.error(`Failed to create seller: ${error.message}`);

      if (error.code === 11000) {
        throw new ConflictException('User with this email already exists');
      }

      throw error;
    }
  }
}
