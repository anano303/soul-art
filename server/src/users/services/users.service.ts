import { Model, Types, isValidObjectId } from 'mongoose';
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
import { AwsS3Service } from '@/aws-s3/aws-s3.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  async findByEmail(email: string) {
    // Convert to lowercase to ensure case-insensitive matching
    const lowercaseEmail = email.toLowerCase();
    return this.userModel.findOne({ email: lowercaseEmail }).exec();
  }

  async create(user: Partial<User>): Promise<UserDocument> {
    try {
      const existingUser = await this.findByEmail(
        user.email?.toLowerCase() ?? '',
      );

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      const hashedPassword = await hashPassword(user.password ?? '');

      // Store email in lowercase
      return await this.userModel.create({
        ...user,
        email: user.email?.toLowerCase(),
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
      const usersWithLowercaseEmails = users.map((user) => ({
        ...user,
        email: user.email?.toLowerCase(),
      }));
      return (await this.userModel.insertMany(
        usersWithLowercaseEmails,
      )) as unknown as UserDocument[];
    } catch (error: any) {
      this.logger.error(`Failed to create users: ${error.message}`);
      throw new BadRequestException('Failed to create users');
    }
  }

  async findOne(email: string): Promise<UserDocument | null> {
    return this.findByEmail(email);
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

    // Only validate email if it's being updated
    if (attrs.email && attrs.email !== user.email) {
      attrs.email = attrs.email.toLowerCase();

      const existingUser = await this.findByEmail(attrs.email);
      if (existingUser && existingUser._id.toString() !== id) {
        throw new BadRequestException('Email is already in use');
      }
    }

    // Handle password update if provided
    if (attrs.password && !adminRole) {
      const passwordMatch = await bcrypt.compare(attrs.password, user.password);
      if (passwordMatch) {
        throw new BadRequestException(
          'New password must be different from the current password',
        );
      }
      attrs.password = await hashPassword(attrs.password);
    }

    // Prepare update data, filter out undefined values
    const updateData = { ...attrs };

    // Prevent role changes unless admin
    if (!adminRole) delete updateData.role;

    // Filter out undefined values to ensure only provided fields are updated
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true },
      );

      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      this.logger.log(`User ${id} updated successfully`);
      return updatedUser;
    } catch (error: any) {
      this.logger.error(`Failed to update user ${id}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to update user');
    }
  }

  async adminUpdate(id: string, updateDto: AdminProfileDto) {
    try {
      const user = await this.userModel.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Convert email to lowercase if provided
      if (updateDto.email) {
        updateDto.email = updateDto.email.toLowerCase();

        // Check if the email is already in use by another user
        const existingUser = await this.findByEmail(updateDto.email);
        if (existingUser && existingUser._id.toString() !== id) {
          throw new ConflictException('Email already exists');
        }
      }

      // Update fields only if they are provided
      if (updateDto.name) user.name = updateDto.name;
      if (updateDto.email) user.email = updateDto.email;
      if (updateDto.role) user.role = updateDto.role;

      // Only hash and update password if it's provided and not empty
      if (updateDto.password && updateDto.password.trim() !== '') {
        this.logger.log('Updating password for user', id);
        user.password = await hashPassword(updateDto.password);
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
      const existingUser = await this.findByEmail(dto.email.toLowerCase());
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      const sellerData = {
        ...dto,
        name: dto.storeName,
        email: dto.email.toLowerCase(),
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

  async createSellerWithLogo(
    dto: SellerRegisterDto,
    logoFile?: Express.Multer.File,
  ): Promise<UserDocument> {
    try {
      const existingUser = await this.findByEmail(dto.email.toLowerCase());
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Create the seller account first
      const sellerData = {
        ...dto,
        name: dto.storeName,
        email: dto.email.toLowerCase(),
        role: Role.Seller,
        password: dto.password,
      };

      const seller = await this.create(sellerData);

      // If logo file is provided, upload it to S3
      if (logoFile) {
        try {
          const timestamp = Date.now();
          const filePath = `seller-logos/${timestamp}-${logoFile.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

          // Upload logo to S3
          const storeLogoPath = await this.awsS3Service.uploadImage(
            filePath,
            logoFile.buffer,
          );

          // Get the complete URL for the logo
          const logoUrl =
            await this.awsS3Service.getImageByFileId(storeLogoPath);

          // Update the seller record with the logo URL
          await this.userModel.findByIdAndUpdate(seller._id, {
            storeLogoPath: logoUrl,
          });

          this.logger.log(`Logo uploaded for seller ${seller._id}`);
        } catch (error) {
          this.logger.error(`Failed to upload seller logo: ${error.message}`);
          // Continue even if logo upload fails - the account has been created
        }
      }

      return seller;
    } catch (error: any) {
      this.logger.error(`Failed to create seller: ${error.message}`);

      if (error.code === 11000) {
        throw new ConflictException('User with this email already exists');
      }

      throw error;
    }
  }

  async updateProfileImage(
    userId: string,
    filePath: string,
    fileBuffer: Buffer,
  ) {
    try {
      const user = await this.userModel.findById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Delete old image if it exists
      if (user.profileImagePath) {
        try {
          // Only delete from S3 if it's a file path, not a URL
          if (!user.profileImagePath.startsWith('http')) {
            await this.awsS3Service.deleteImageByFileId(
              user.profileImagePath as string,
            );
          }
        } catch (error) {
          console.error('Failed to delete old profile image', error);
          // Continue even if deletion fails
        }
      }

      // Upload new image
      const profileImagePath = await this.awsS3Service.uploadImage(
        filePath,
        fileBuffer,
      );

      // Get image URL
      const imageUrl =
        await this.awsS3Service.getImageByFileId(profileImagePath);

      // Update user record with the full URL instead of just the path
      await this.userModel.findByIdAndUpdate(userId, {
        profileImagePath: imageUrl,
      });

      return {
        message: 'Profile image updated successfully',
        profileImage: imageUrl,
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to update profile image: ' + error.message,
      );
    }
  }

  async updateSellerLogo(userId: string, filePath: string, fileBuffer: Buffer) {
    try {
      const user = await this.userModel.findById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.role !== Role.Seller) {
        throw new BadRequestException('Only sellers can update store logos');
      }

      // Delete old logo if it exists
      if (user.storeLogoPath) {
        try {
          // Only delete from S3 if it's a file path, not a URL
          if (!user.storeLogoPath.startsWith('http')) {
            await this.awsS3Service.deleteImageByFileId(
              user.storeLogoPath as string,
            );
          }
        } catch (error) {
          console.error('Failed to delete old store logo', error);
          // Continue even if deletion fails
        }
      }

      // Upload new logo
      const storeLogoPath = await this.awsS3Service.uploadImage(
        filePath,
        fileBuffer,
      );

      // Get logo URL
      const logoUrl = await this.awsS3Service.getImageByFileId(storeLogoPath);

      // Update user record with the full URL instead of just the path
      await this.userModel.findByIdAndUpdate(userId, {
        storeLogoPath: logoUrl,
      });

      return {
        message: 'Store logo updated successfully',
        logoUrl: logoUrl,
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to update store logo: ' + error.message,
      );
    }
  }

  async uploadImage(filePath: string, fileBuffer: Buffer): Promise<string> {
    try {
      return await this.awsS3Service.uploadImage(filePath, fileBuffer);
    } catch (error) {
      this.logger.error(`Failed to upload image: ${error.message}`);
      throw new BadRequestException('Failed to upload image: ' + error.message);
    }
  }

  async getProfileData(userId: string) {
    const user = await this.userModel.findById(userId, { password: 0 });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get profile image URL if it exists
    let profileImage = null;
    if (user.profileImagePath) {
      // Check if profileImagePath is already a full URL
      if (user.profileImagePath.startsWith('http')) {
        profileImage = user.profileImagePath;
      } else {
        // Otherwise get a signed URL from S3
        profileImage = await this.awsS3Service.getImageByFileId(
          user.profileImagePath as string,
        );
      }
    }

    // If user is a seller, get store logo URL
    let storeLogo = null;
    if (user.role === Role.Seller && user.storeLogoPath) {
      // Check if storeLogoPath is already a full URL
      if (user.storeLogoPath.startsWith('http')) {
        storeLogo = user.storeLogoPath;
      } else {
        // Otherwise get a signed URL from S3
        storeLogo = await this.awsS3Service.getImageByFileId(
          user.storeLogoPath as string,
        );
      }
    }

    return {
      ...user.toObject(),
      profileImage,
      storeLogo,
    };
  }

  async getProfileImageUrl(profileImagePath: string): Promise<string | null> {
    if (!profileImagePath) return null;
    try {
      return await this.awsS3Service.getImageByFileId(profileImagePath);
    } catch (error) {
      this.logger.error(`Failed to get image URL: ${error.message}`);
      return null;
    }
  }

  async remove(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove user's profile image if exists
    if (user.profileImagePath) {
      try {
        await this.awsS3Service.deleteImageByFileId(
          user.profileImagePath as string,
        );
      } catch (error) {
        console.error('Failed to delete profile image', error);
        // Continue even if image deletion fails
      }
    }

    await this.userModel.findByIdAndDelete(id);
    return { message: 'User deleted successfully' };
  }
}
