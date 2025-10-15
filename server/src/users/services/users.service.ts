import { FilterQuery, Model, Types, isValidObjectId } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';

import { User, UserDocument } from '../schemas/user.schema';
import { Product, ProductStatus } from '../../products/schemas/product.schema';
import { hashPassword } from '@/utils/password';
import { generateUsers } from '@/utils/seed-users';
import { PaginatedResponse } from '@/types';
import { Role } from '@/types/role.enum';
import { SellerRegisterDto } from '../dtos/seller-register.dto';
import { BecomeSellerDto } from '../dtos/become-seller.dto';
import { AdminProfileDto } from '../dtos/admin.profile.dto';
import { AwsS3Service } from '@/aws-s3/aws-s3.service';
import { UserCloudinaryService } from './user-cloudinary.service';
import { BalanceService } from './balance.service';
import { ReferralsService } from '@/referrals/services/referrals.service';
import { UpdateArtistProfileDto } from '../dtos/update-artist-profile.dto';
import { ArtistSocialLinks } from '../schemas/user.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    private readonly awsS3Service: AwsS3Service,
    private readonly userCloudinaryService: UserCloudinaryService,
    private readonly balanceService: BalanceService,
    @Optional()
    @Inject(forwardRef(() => ReferralsService))
    private readonly referralsService?: ReferralsService,
  ) {}

  private normalizeArtistSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }

  private isCloudinaryUrl(url?: string | null): boolean {
    if (!url) return false;
    return /^https?:\/\/.+cloudinary\.com/.test(url.trim());
  }

  private sanitizeSocialLinks(links?: ArtistSocialLinks) {
    if (!links) return undefined;

    const sanitizedEntries = Object.entries(links);

    return sanitizedEntries.length > 0
      ? sanitizedEntries.reduce((acc, [key, value]) => {
          acc[key as keyof ArtistSocialLinks] = value;
          return acc;
        }, {} as ArtistSocialLinks)
      : {};
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async listPublicArtists(limit: number = 200) {
    const normalizedLimit = Math.min(Math.max(Number(limit) || 50, 1), 1000);

    const artists = await this.userModel
      .find({
        role: Role.Seller,
        artistSlug: { $exists: true, $nin: [null, ''] },
      })
      .sort({ updatedAt: -1 })
      .limit(normalizedLimit)
      .select(['artistSlug', 'storeName', 'name', 'updatedAt', 'createdAt'])
      .lean();

    return artists.map((artist) => ({
      id: artist._id.toString(),
      slug: artist.artistSlug ?? artist._id.toString(),
      name: artist.storeName ?? artist.name,
      updatedAt: artist.updatedAt ?? artist.createdAt ?? new Date(),
      createdAt: artist.createdAt ?? null,
    }));
  }

  async searchPublicArtists(keyword: string, limit: number = 20): Promise<any[]> {
    if (!keyword || keyword.trim().length < 2) {
      return [];
    }

    try {
      // Sanitize the keyword to prevent regex injection
      const sanitizedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

      const artists = await this.userModel
        .find({
          role: Role.Seller,
          artistSlug: { $exists: true, $nin: [null, ''] },
          $or: [
            { name: { $regex: sanitizedKeyword, $options: 'i' } },
            { storeName: { $regex: sanitizedKeyword, $options: 'i' } },
            { artistSlug: { $regex: sanitizedKeyword, $options: 'i' } },
          ],
        })
        .sort({ updatedAt: -1 })
        .limit(normalizedLimit)
        .select(['artistSlug', 'storeName', 'name', 'updatedAt', 'createdAt', 'artistCoverImage', 'storeLogo', 'storeLogoPath', 'profileImagePath'])
        .lean();

      return artists.map((artist) => ({
        id: artist._id.toString(),
        slug: artist.artistSlug ?? artist._id.toString(),
        name: artist.storeName ?? artist.name,
        updatedAt: artist.updatedAt ?? artist.createdAt ?? new Date(),
        createdAt: artist.createdAt ?? null,
        // Image fields - prioritize portfolio image (artistCoverImage), then store logo, then profile image
        artistCoverImage: artist.artistCoverImage,
        storeLogo: artist.storeLogo,
        storeLogoPath: artist.storeLogoPath,
        profileImagePath: artist.profileImagePath,
      }));
    } catch (error) {
      console.error('Error searching artists:', error);
      throw new BadRequestException('Failed to search artists');
    }
  }

  async isArtistSlugAvailable(slug: string, excludeUserId?: string) {
    const normalized = this.normalizeArtistSlug(slug);

    if (normalized.length === 0) {
      return { available: true, reason: null };
    }

    if (normalized.length < 3 || normalized.length > 40) {
      throw new BadRequestException(
        'Slug length must be between 3 and 40 characters',
      );
    }

    const reservedSlugs = new Set([
      'artists',
      'sellers',
      'admin',
      'profile',
      'store',
      'soulart',
    ]);

    if (reservedSlugs.has(normalized)) {
      return { available: false, reason: 'reserved' };
    }

    const existing = await this.userModel.findOne({
      artistSlug: normalized,
      ...(excludeUserId
        ? { _id: { $ne: new Types.ObjectId(excludeUserId) } }
        : {}),
    });

    return { available: !existing, reason: existing ? 'taken' : null };
  }

  private validateImageFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const validMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
    ];

    if (
      !validMimeTypes.includes(file.mimetype.toLowerCase()) &&
      !file.mimetype.toLowerCase().startsWith('image/')
    ) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Supported types: JPEG, PNG, GIF, WEBP.`,
      );
    }

    const filesSizeInMb = Number((file.size / (1024 * 1024)).toFixed(1));
    if (filesSizeInMb > 10) {
      throw new BadRequestException('The file must be less than 10 MB.');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }
  }

  async uploadArtistCoverImage(userId: string, file: Express.Multer.File) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.Seller) {
      throw new BadRequestException('Only sellers can upload cover images');
    }

    this.validateImageFile(file);

    const coverUrl =
      await this.userCloudinaryService.uploadArtistCoverImage(file);

    await this.userModel.findByIdAndUpdate(userId, {
      artistCoverImage: coverUrl,
    });

    return {
      message: 'Artist cover image updated successfully',
      coverUrl,
    };
  }

  async addArtistGalleryImage(userId: string, file: Express.Multer.File) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.Seller) {
      throw new BadRequestException('Only sellers can upload gallery images');
    }

    this.validateImageFile(file);

    const currentGallery = Array.isArray(user.artistGallery)
      ? [...user.artistGallery]
      : [];

    if (currentGallery.length >= 20) {
      throw new BadRequestException(
        'You can upload up to 20 gallery images. Please remove one before adding a new image.',
      );
    }

    const imageUrl =
      await this.userCloudinaryService.uploadArtistGalleryImage(file);

    if (!this.isCloudinaryUrl(imageUrl)) {
      throw new BadRequestException('Invalid gallery image URL');
    }

    if (currentGallery.includes(imageUrl)) {
      return {
        message: 'Image already exists in gallery',
        imageUrl,
        gallery: currentGallery,
      };
    }

    currentGallery.push(imageUrl);

    await this.userModel.findByIdAndUpdate(userId, {
      artistGallery: currentGallery,
    });

    return {
      message: 'Gallery image added successfully',
      imageUrl,
      gallery: currentGallery,
    };
  }

  async removeArtistGalleryImage(userId: string, imageUrl: string) {
    if (!imageUrl || !this.isCloudinaryUrl(imageUrl)) {
      throw new BadRequestException('Invalid gallery image URL');
    }

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.Seller) {
      throw new BadRequestException('Only sellers can update gallery images');
    }

    const currentGallery = Array.isArray(user.artistGallery)
      ? [...user.artistGallery]
      : [];

    const updatedGallery = currentGallery.filter((url) => url !== imageUrl);

    if (updatedGallery.length === currentGallery.length) {
      throw new NotFoundException('Gallery image not found');
    }

    await this.userModel.findByIdAndUpdate(userId, {
      artistGallery: updatedGallery,
    });

    return {
      message: 'Gallery image removed successfully',
      gallery: updatedGallery,
    };
  }

  async updateArtistProfile(id: string, dto: UpdateArtistProfileDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.Seller) {
      throw new BadRequestException('Only sellers can update artist profile');
    }

    const update: Partial<User> = {};

    if (dto.artistSlug !== undefined) {
      const rawSlug = dto.artistSlug ?? '';
      const normalized =
        typeof rawSlug === 'string' && rawSlug.length > 0
          ? this.normalizeArtistSlug(rawSlug)
          : '';

      if (normalized.length > 0) {
        const slugCheck = await this.isArtistSlugAvailable(normalized, id);
        if (!slugCheck.available) {
          throw new ConflictException(
            slugCheck.reason === 'reserved'
              ? 'This slug is reserved'
              : 'This slug is already in use',
          );
        }
        update.artistSlug = normalized;
      } else {
        update.artistSlug = null;
      }
    }

    if (dto.artistCoverImage !== undefined) {
      const cover = dto.artistCoverImage?.trim();
      if (cover && cover.length > 0) {
        if (!this.isCloudinaryUrl(cover)) {
          throw new BadRequestException(
            'Artist cover image must be a Cloudinary URL',
          );
        }
        update.artistCoverImage = cover;
      } else {
        update.artistCoverImage = null;
      }
    }

    if (dto.artistBio !== undefined) {
      const sanitizedBioEntries = Object.entries(dto.artistBio || {})
        .map(
          ([locale, value]) =>
            [locale.trim(), value?.trim()] as [string, string | undefined],
        )
        .filter(([locale, value]) => locale.length > 0 && !!value);

      update.artistBio = new Map(sanitizedBioEntries as [string, string][]);
    }

    if (dto.artistDisciplines !== undefined) {
      update.artistDisciplines = dto.artistDisciplines
        ?.map((value) => value.trim())
        .filter((value) => value.length > 0);
    }

    if (dto.artistLocation !== undefined) {
      const location = dto.artistLocation?.trim();
      update.artistLocation = location && location.length > 0 ? location : null;
    }

    if (dto.artistOpenForCommissions !== undefined) {
      update.artistOpenForCommissions = dto.artistOpenForCommissions;
    }

    if (dto.artistSocials !== undefined) {
      update.artistSocials = this.sanitizeSocialLinks(dto.artistSocials);
    }

    if (dto.artistHighlights !== undefined) {
      update.artistHighlights = dto.artistHighlights
        ?.map((value) => value.trim())
        .filter((value) => value.length > 0);
    }

    if (dto.artistGallery !== undefined) {
      update.artistGallery = dto.artistGallery
        ?.map((value) => value.trim())
        .filter((value) => value.length > 0 && this.isCloudinaryUrl(value));
    }

    Object.keys(update).forEach((key) => {
      if (update[key] === undefined) {
        delete update[key];
      }
    });

    await this.userModel.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    return this.userModel.findById(id);
  }

  async getArtistProfile(identifier: string) {
    if (!identifier) {
      throw new BadRequestException('Identifier is required');
    }

    try {
      const query = isValidObjectId(identifier)
        ? { _id: new Types.ObjectId(identifier) }
        : { artistSlug: this.normalizeArtistSlug(identifier) };

      const artist = await this.userModel
        .findOne({ ...query, role: Role.Seller })
        .lean();

      if (!artist) {
        throw new NotFoundException('Artist profile not found');
      }

      const productsFilter = {
        user: artist._id,
        status: ProductStatus.APPROVED,
      };

      const [products, totalProducts] = await Promise.all([
        this.productModel
          .find(productsFilter)
          .sort({ createdAt: -1 })
          .limit(12)
          .select([
            'name',
            'price',
            'images',
            'brand',
            'brandLogo',
            'rating',
            'numReviews',
            'createdAt',
          ])
          .lean(),
        this.productModel.countDocuments(productsFilter),
      ]);

      const storeLogo = artist.storeLogoPath ?? artist.storeLogo ?? null;

      const biography =
        artist.artistBio instanceof Map
          ? Object.fromEntries(artist.artistBio)
          : typeof artist.artistBio === 'object' && artist.artistBio !== null
            ? { ...artist.artistBio }
            : {};

      return {
        artist: {
          id: artist._id.toString(),
          name: artist.name,
          storeName: artist.storeName ?? artist.name,
          artistSlug: artist.artistSlug ?? null,
          artistBio: biography,
          artistCoverImage: artist.artistCoverImage,
          artistDisciplines: artist.artistDisciplines ?? [],
          artistLocation: artist.artistLocation ?? null,
          artistOpenForCommissions: artist.artistOpenForCommissions ?? false,
          artistSocials: artist.artistSocials ?? {},
          artistHighlights: artist.artistHighlights ?? [],
          artistGallery: (artist.artistGallery ?? []).filter((url: string) =>
            this.isCloudinaryUrl(url),
          ),
          storeLogo,
        },
        products: {
          total: totalProducts,
          items: products.map((product) => ({
            id: product._id.toString(),
            name: product.name,
            price: product.price,
            images: product.images,
            brand: product.brand,
            brandLogo: product.brandLogo ?? storeLogo,
            rating: product.rating,
            numReviews: product.numReviews,
            createdAt: (product as any).createdAt ?? null,
          })),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to load artist profile for identifier "${identifier}": ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findByEmail(email: string) {
    // Convert to lowercase to ensure case-insensitive matching
    const lowercaseEmail = email.toLowerCase();
    return this.userModel.findOne({ email: lowercaseEmail }).exec();
  }

  async create(
    user: Partial<User> & { invitationCode?: string },
  ): Promise<UserDocument> {
    try {
      const existingUser = await this.findByEmail(
        user.email?.toLowerCase() ?? '',
      );

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      const hashedPassword = await hashPassword(user.password ?? '');

      // Store email in lowercase
      const newUser = await this.userModel.create({
        ...user,
        email: user.email?.toLowerCase(),
        password: hashedPassword,
        role: user.role ?? Role.User,
      });

      // რეფერალური კოდით რეგისტრაცია
      if (user.invitationCode && this.referralsService) {
        this.logger.log(
          `მუშაობს რეფერალური კოდით: ${user.invitationCode} მომხმარებლისთვის: ${newUser.email}`,
        );
        try {
          await this.referralsService.registerWithReferralCode(
            newUser._id.toString(),
            user.invitationCode,
          );
          this.logger.log(
            `რეფერალური კოდი წარმატებით დამუშავდა: ${user.invitationCode}`,
          );
        } catch (error) {
          this.logger.error(
            `რეფერალური კოდის დამუშავების შეცდომა: ${error.message}`,
            error.stack,
          );
          // არ ვაჩერებთ რეგისტრაციას რეფერალური კოდის შეცდომის გამო
        }
      }

      return newUser;
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

  async findUsersByKeyword(keyword: string): Promise<UserDocument[]> {
    if (!keyword || keyword.trim() === '') {
      return [];
    }

    const users = await this.userModel
      .find({
        $or: [
          { email: { $regex: keyword, $options: 'i' } },
          { name: { $regex: keyword, $options: 'i' } },
          { storeName: { $regex: keyword, $options: 'i' } },
          { phoneNumber: { $regex: keyword, $options: 'i' } },
        ],
      })
      .select('_id')
      .limit(100) // Limit to avoid performance issues
      .exec();

    return users;
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: string,
  ): Promise<
    PaginatedResponse<UserDocument> & {
      summary: {
        totalUsers: number;
        roleCounts: Record<Role, number>;
      };
    }
  > {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;
    const normalizedLimit = Math.min(safeLimit, 100);
    const skip = (safePage - 1) * normalizedLimit;

    const filters: FilterQuery<User> = {};

    const normalizedRole = role?.toLowerCase();
    if (normalizedRole && Object.values(Role).includes(normalizedRole as Role)) {
      filters.role = normalizedRole as Role;
    }

    const trimmedSearch = search?.trim();
    if (trimmedSearch && trimmedSearch.length > 0) {
      const escapedKeyword = this.escapeRegex(trimmedSearch);
      filters.$or = [
        { email: { $regex: escapedKeyword, $options: 'i' } },
        { name: { $regex: escapedKeyword, $options: 'i' } },
        { storeName: { $regex: escapedKeyword, $options: 'i' } },
        { phoneNumber: { $regex: escapedKeyword, $options: 'i' } },
      ];
    }

    const [users, filteredTotal, overallTotal, roleAggregation] =
      await Promise.all([
        this.userModel
          .find(filters)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(normalizedLimit)
          .exec(),
        this.userModel.countDocuments(filters),
        this.userModel.countDocuments({}),
        this.userModel.aggregate<{ _id: Role; count: number }>([
          {
            $group: {
              _id: '$role',
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    const roleCounts: Record<Role, number> = {
      [Role.Admin]: 0,
      [Role.Seller]: 0,
      [Role.User]: 0,
    };

    roleAggregation.forEach(({ _id, count }) => {
      if (_id && Object.values(Role).includes(_id)) {
        roleCounts[_id] = count;
      }
    });

    const totalPages = Math.max(Math.ceil(filteredTotal / normalizedLimit), 1);

    return {
      items: users,
      total: filteredTotal,
      page: safePage,
      pages: totalPages,
      summary: {
        totalUsers: overallTotal,
        roleCounts,
      },
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
      // All images should now be Cloudinary URLs
      if (user.profileImagePath.startsWith('http')) {
        profileImage = user.profileImagePath;
      }
      // If not an HTTP URL, skip (shouldn't happen after migration)
    } else if (user.role === Role.Seller && user.storeLogoPath) {
      // If user is a seller and has no profile image but has a store logo,
      // use the store logo as the profile image
      if (user.storeLogoPath.startsWith('http')) {
        profileImage = user.storeLogoPath;
      }
      // If not an HTTP URL, skip (shouldn't happen after migration)
    }

    // If user is a seller, get store logo URL
    let storeLogo = null;
    if (user.role === Role.Seller && user.storeLogoPath) {
      // All images should now be Cloudinary URLs
      if (user.storeLogoPath.startsWith('http')) {
        storeLogo = user.storeLogoPath;
      }
      // If not an HTTP URL, skip (shouldn't happen after migration)
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

    // All images should now be Cloudinary URLs
    if (profileImagePath.startsWith('http')) {
      return profileImagePath;
    }

    // If not an HTTP URL, return null (shouldn't happen after migration)
    return null;
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

  async upgradeToSeller(
    userId: string,
    becomeSellerDto: BecomeSellerDto,
    logoFile?: Express.Multer.File,
  ): Promise<UserDocument> {
    try {
      const user = await this.findById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.role === Role.Seller) {
        throw new ConflictException('User is already a seller');
      }

      // Prepare update data with existing user data
      const updateData: Partial<User> = {
        role: Role.Seller,
        storeName: becomeSellerDto.storeName,
        identificationNumber: becomeSellerDto.identificationNumber,
        accountNumber: becomeSellerDto.accountNumber,
      };

      // Auto-populate owner first and last name from existing user name
      if (user.name) {
        const nameParts = user.name.trim().split(/\s+/);
        updateData.ownerFirstName = nameParts[0] || '';
        updateData.ownerLastName = nameParts.slice(1).join(' ') || '';

        this.logger.log(
          `Auto-populated owner names: ${updateData.ownerFirstName} ${updateData.ownerLastName}`,
        );
      }

      // Only update phone number if provided and different from existing
      if (
        becomeSellerDto.phoneNumber &&
        becomeSellerDto.phoneNumber !== user.phoneNumber
      ) {
        updateData.phoneNumber = becomeSellerDto.phoneNumber;
      }

      // Handle logo upload if provided
      if (logoFile) {
        // Validate file type and size (same as existing logic)
        const validMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/heic',
          'image/heif',
        ];

        if (!validMimeTypes.includes(logoFile.mimetype.toLowerCase())) {
          throw new BadRequestException(
            `Unsupported file type: ${logoFile.mimetype}. Supported types: JPEG, PNG, GIF, WEBP.`,
          );
        }

        const filesSizeInMb = Number(
          (logoFile.size / (1024 * 1024)).toFixed(1),
        );
        if (filesSizeInMb > 5) {
          throw new BadRequestException('The file must be less than 5 MB.');
        }

        const timestamp = Date.now();
        const filePath = `seller-logos/${timestamp}-${logoFile.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        try {
          // Upload logo to cloud storage
          const logoUrl = await this.uploadImage(filePath, logoFile.buffer);
          updateData.storeLogoPath = filePath;
          updateData.storeLogo = logoUrl;
        } catch (uploadError) {
          this.logger.error('Failed to upload seller logo:', uploadError);
          throw new BadRequestException('Failed to upload store logo');
        }
      } else if (becomeSellerDto.storeLogo) {
        // If logo URL is provided instead of file
        updateData.storeLogo = becomeSellerDto.storeLogo;
      }

      // Handle referral code if provided (simplified)
      if (becomeSellerDto.invitationCode && this.referralsService) {
        try {
          // TODO: Add referral code processing logic here if needed
          this.logger.log(
            `Referral code provided: ${becomeSellerDto.invitationCode}`,
          );
        } catch (referralError) {
          this.logger.warn(
            `Referral code processing failed: ${referralError.message}`,
          );
        }
      }

      // Update user in database
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        updateData,
        { new: true },
      );

      if (!updatedUser) {
        throw new NotFoundException('User not found during update');
      }

      // Create balance account for new seller (if balance service is available)
      if (this.balanceService) {
        try {
          // TODO: Implement balance creation logic if needed
          this.logger.log(
            `Balance account creation pending for new seller: ${userId}`,
          );
        } catch (balanceError) {
          this.logger.warn(
            `Balance setup note for seller ${userId}:`,
            balanceError,
          );
        }
      }

      this.logger.log(`User ${userId} successfully upgraded to seller`);
      return updatedUser;
    } catch (error: any) {
      this.logger.error(`Failed to upgrade user ${userId} to seller:`, error);

      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to upgrade to seller: ${error.message}`,
      );
    }
  }
}
