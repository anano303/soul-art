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
import { Product } from '../../products/schemas/product.schema';
import { hashPassword } from '@/utils/password';
import { generateUsers } from '@/utils/seed-users';
import { PaginatedResponse } from '@/types';
import { Role } from '@/types/role.enum';
import { SellerRegisterDto } from '../dtos/seller-register.dto';
import { AdminProfileDto } from '../dtos/admin.profile.dto';
import { AwsS3Service } from '@/aws-s3/aws-s3.service';
import { UserCloudinaryService } from './user-cloudinary.service';
import { BalanceService } from './balance.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    private readonly awsS3Service: AwsS3Service,
    private readonly userCloudinaryService: UserCloudinaryService,
    private readonly balanceService: BalanceService,
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

      // If storeLogoPath was updated for a seller, also update their products
      if (updateData.storeLogoPath && user.role === Role.Seller) {
        try {
          const updateResult = await this.productModel.updateMany(
            {
              user: id,
              brand: user.name, // Only update products where brand matches seller name
            },
            {
              brandLogo: updateData.storeLogoPath,
            },
          );

          this.logger.log(
            `Updated ${updateResult.modifiedCount} products with new logo for seller ${user.name}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to update products with new logo for seller ${user.name}:`,
            error.message,
          );
          // Don't throw error here - user update was successful, product update is secondary
        }
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

          // Upload logo to Cloudinary instead of S3
          const logoUrl =
            await this.userCloudinaryService.uploadSellerLogo(logoFile);

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

      // Create a multer file object from buffer for Cloudinary service
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: filePath.split('/').pop() || 'profile-image.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg', // Default, will be detected by Cloudinary
        buffer: fileBuffer,
        size: fileBuffer.length,
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      // Upload to Cloudinary
      const imageUrl =
        await this.userCloudinaryService.uploadProfileImage(file);

      // Store the full Cloudinary URL
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

      // Create a multer file object from buffer for Cloudinary service
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: filePath.split('/').pop() || 'store-logo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg', // Default, will be detected by Cloudinary
        buffer: fileBuffer,
        size: fileBuffer.length,
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      // Upload to Cloudinary
      const logoUrl = await this.userCloudinaryService.uploadSellerLogo(file);

      // Store the full Cloudinary URL
      await this.userModel.findByIdAndUpdate(userId, {
        storeLogoPath: logoUrl,
      });

      // Update all products of this seller to use the new logo
      try {
        const updateResult = await this.productModel.updateMany(
          {
            user: userId,
            brand: user.name, // Only update products where brand matches seller name
          },
          {
            brandLogo: logoUrl,
          },
        );

        this.logger.log(
          `Updated ${updateResult.modifiedCount} products with new logo for seller ${user.name}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to update products with new logo for seller ${user.name}:`,
          error.message,
        );
        // Don't throw error here - seller logo update was successful, product update is secondary
      }

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
      // For Cloudinary and other HTTP URLs, use directly
      if (user.profileImagePath.startsWith('http')) {
        profileImage = user.profileImagePath;
      } else {
        // All new uploads should be Cloudinary URLs, but for backward compatibility
        // try to get from S3 first, if that fails, assume it's a legacy local file
        try {
          profileImage = await this.awsS3Service.getImageByFileId(
            user.profileImagePath as string,
          );
        } catch (error) {
          // If S3 fails, it might be a legacy local file
          this.logger.warn(
            `Could not get image from S3: ${error.message}. Assuming legacy local file.`,
          );
          profileImage = null; // Don't use local files anymore
        }
      }
    } else if (user.role === Role.Seller && user.storeLogoPath) {
      // If user is a seller and has no profile image but has a store logo,
      // use the store logo as the profile image
      if (user.storeLogoPath.startsWith('http')) {
        profileImage = user.storeLogoPath;
      } else {
        // All new uploads should be Cloudinary URLs, but for backward compatibility
        try {
          profileImage = await this.awsS3Service.getImageByFileId(
            user.storeLogoPath as string,
          );
        } catch (error) {
          // If S3 fails, it might be a legacy local file
          this.logger.warn(
            `Could not get store logo from S3: ${error.message}. Assuming legacy local file.`,
          );
          profileImage = null; // Don't use local files anymore
        }
      }
    }

    // If user is a seller, get store logo URL
    let storeLogo = null;
    if (user.role === Role.Seller && user.storeLogoPath) {
      // For Cloudinary and other HTTP URLs, use directly
      if (user.storeLogoPath.startsWith('http')) {
        storeLogo = user.storeLogoPath;
      } else {
        // All new uploads should be Cloudinary URLs, but for backward compatibility
        try {
          storeLogo = await this.awsS3Service.getImageByFileId(
            user.storeLogoPath as string,
          );
        } catch (error) {
          // If S3 fails, it might be a legacy local file
          this.logger.warn(
            `Could not get store logo from S3: ${error.message}. Assuming legacy local file.`,
          );
          storeLogo = null; // Don't use local files anymore
        }
      }
    }

    return {
      ...user.toObject(),
      profileImage,
      storeLogo,
      balance:
        user.role === Role.Seller
          ? await this.getSellerBalanceInfo(userId)
          : null,
    };
  }

  async getSellerBalanceInfo(sellerId: string) {
    try {
      const balance = await this.balanceService.getSellerBalance(sellerId);
      return (
        balance || {
          totalBalance: 0,
          totalEarnings: 0,
          pendingWithdrawals: 0,
          totalWithdrawn: 0,
        }
      );
    } catch (error) {
      this.logger.error(`Failed to get seller balance: ${error.message}`);
      return {
        totalBalance: 0,
        totalEarnings: 0,
        pendingWithdrawals: 0,
        totalWithdrawn: 0,
      };
    }
  }

  async getProfileImageUrl(profileImagePath: string): Promise<string | null> {
    if (!profileImagePath) return null;
    try {
      // If it's already a Cloudinary URL, return it directly
      if (profileImagePath.includes('cloudinary.com')) {
        return profileImagePath;
      }

      // If it's already a full URL, return it
      if (profileImagePath.startsWith('http')) {
        return profileImagePath;
      }

      // Otherwise, try to get from S3 (for backward compatibility with existing images)
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

  // Migration helper methods
  async findSellersWithS3Logos() {
    return this.userModel
      .find({
        role: Role.Seller,
        storeLogoPath: { $regex: 's3', $options: 'i' },
      })
      .exec();
  }

  async updateSellerLogoPath(userId: string, newLogoPath: string) {
    return this.userModel.findByIdAndUpdate(userId, {
      storeLogoPath: newLogoPath,
    });
  }
}
