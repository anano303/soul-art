import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Roles } from '@/decorators/roles.decorator';
import { Role } from '@/types/role.enum';
import { RolesGuard } from '@/guards/roles.guard';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { AdminProfileDto } from '../dtos/admin.profile.dto';
import { UserDto } from '../dtos/user.dto';
import { UsersService } from '../services/users.service';
import { PaginatedUsersDto } from '../dtos/paginated-users.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { User } from '../schemas/user.schema';
import { uploadRateLimit } from '@/middleware/security.middleware';
import { createRateLimitInterceptor } from '@/interceptors/rate-limit.interceptor';
import { CreateAddressDto } from '../dtos/create-address.dto';
import { UpdateAddressDto } from '../dtos/update-address.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Serialize(PaginatedUsersDto)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get()
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    return this.usersService.findAll(pageNumber, limitNumber, search, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteOne(id);
  }

  @Serialize(UserDto)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Serialize(UserDto)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() credentials: AdminProfileDto,
  ) {
    console.log('Admin updating user', id, 'with data:', credentials);
    return this.usersService.adminUpdate(id, credentials);
  }

  @Serialize(UserDto)
  @Post('seed')
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  async generateUsers() {
    return this.usersService.generateUsers(500);
  }

  @ApiTags('Users')
  @ApiOperation({ summary: 'Find user by email' })
  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string) {
    return this.usersService.findOne(email);
  }

  @Serialize(UserDto)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post()
  async createUser(@Body() createUserDto: AdminProfileDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('profile-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @UseInterceptors(createRateLimitInterceptor(uploadRateLimit))
  async uploadProfileImage(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Check file type
    const validMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif', // Fixed 'image.heif' to 'image/heif'
    ];

    if (
      !validMimeTypes.includes(file.mimetype.toLowerCase()) &&
      !file.mimetype.toLowerCase().startsWith('image/')
    ) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Supported types: JPEG, PNG, GIF, WEBP.`,
      );
    }

    const timestamp = Date.now();
    const filePath = `profile-images/${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filesSizeInMb = Number((file.size / (1024 * 1024)).toFixed(1));

    if (filesSizeInMb > 5) {
      throw new BadRequestException('The file must be less than 5 MB.');
    }

    // Use string casting to access _id property
    return this.usersService.updateProfileImage(
      user['_id'] as string,
      filePath,
      file.buffer,
    );
  }

  @Post('seller-logo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @UseInterceptors(createRateLimitInterceptor(uploadRateLimit))
  async uploadSellerLogo(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Check if user is a seller
    if (user.role !== Role.Seller) {
      throw new BadRequestException('Only sellers can upload store logos');
    }

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Check file type - same validation as profile images
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

    const timestamp = Date.now();
    const filePath = `seller-logos/${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filesSizeInMb = Number((file.size / (1024 * 1024)).toFixed(1));

    if (filesSizeInMb > 5) {
      throw new BadRequestException('The file must be less than 5 MB.');
    }

    return this.usersService.updateSellerLogo(
      user['_id'] as string,
      filePath,
      file.buffer,
    );
  }

  // ============================================
  // FOLLOWER SYSTEM ENDPOINTS
  // ============================================

  @ApiOperation({ summary: 'Follow an artist' })
  @UseGuards(JwtAuthGuard)
  @Post(':userId/follow')
  async followUser(
    @Param('userId') targetUserId: string,
    @CurrentUser() user: User,
  ) {
    await this.usersService.followUser(user['_id'] as string, targetUserId);
    return { message: 'Successfully followed artist' };
  }

  @ApiOperation({ summary: 'Unfollow an artist' })
  @UseGuards(JwtAuthGuard)
  @Delete(':userId/follow')
  async unfollowUser(
    @Param('userId') targetUserId: string,
    @CurrentUser() user: User,
  ) {
    await this.usersService.unfollowUser(user['_id'] as string, targetUserId);
    return { message: 'Successfully unfollowed artist' };
  }

  @ApiOperation({ summary: 'Check if following an artist' })
  @UseGuards(JwtAuthGuard)
  @Get(':userId/following-status')
  async getFollowingStatus(
    @Param('userId') targetUserId: string,
    @CurrentUser() user: User,
  ) {
    const isFollowing = await this.usersService.isFollowing(
      user['_id'] as string,
      targetUserId,
    );
    return { isFollowing };
  }

  @ApiOperation({ summary: 'Get followers list for an artist' })
  @Get(':userId/followers')
  async getFollowers(
    @Param('userId') artistId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    return this.usersService.getFollowers(artistId, pageNumber, limitNumber);
  }

  @ApiOperation({ summary: 'Get following list for a user' })
  @UseGuards(JwtAuthGuard)
  @Get(':userId/following')
  async getFollowing(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @CurrentUser() user: User,
  ) {
    // Only allow users to see their own following list
    if (userId !== (user['_id'] as string)) {
      throw new BadRequestException(
        'You can only view your own following list',
      );
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    return this.usersService.getFollowing(userId, pageNumber, limitNumber);
  }

  // ============================================
  // SHIPPING ADDRESS MANAGEMENT ENDPOINTS
  // ============================================

  @ApiOperation({ summary: 'Get all shipping addresses for current user' })
  @UseGuards(JwtAuthGuard)
  @Get('me/addresses')
  async getMyAddresses(@CurrentUser() user: User) {
    return this.usersService.getShippingAddresses(user['_id'] as string);
  }

  @ApiOperation({ summary: 'Add new shipping address' })
  @UseGuards(JwtAuthGuard)
  @Post('me/addresses')
  async addAddress(
    @CurrentUser() user: User,
    @Body() addressData: CreateAddressDto,
  ) {
    return this.usersService.addShippingAddress(
      user['_id'] as string,
      addressData,
    );
  }

  @ApiOperation({ summary: 'Update shipping address' })
  @UseGuards(JwtAuthGuard)
  @Put('me/addresses/:addressId')
  async updateAddress(
    @CurrentUser() user: User,
    @Param('addressId') addressId: string,
    @Body() addressData: UpdateAddressDto,
  ) {
    return this.usersService.updateShippingAddress(
      user['_id'] as string,
      addressId,
      addressData,
    );
  }

  @ApiOperation({ summary: 'Delete shipping address' })
  @UseGuards(JwtAuthGuard)
  @Delete('me/addresses/:addressId')
  async deleteAddress(
    @CurrentUser() user: User,
    @Param('addressId') addressId: string,
  ) {
    return this.usersService.deleteShippingAddress(
      user['_id'] as string,
      addressId,
    );
  }

  @ApiOperation({ summary: 'Set default shipping address' })
  @UseGuards(JwtAuthGuard)
  @Put('me/addresses/:addressId/default')
  async setDefaultAddress(
    @CurrentUser() user: User,
    @Param('addressId') addressId: string,
  ) {
    return this.usersService.setDefaultAddress(
      user['_id'] as string,
      addressId,
    );
  }

  @ApiOperation({ summary: 'Send bulk email to selected sellers' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post('admin/send-bulk-email-sellers')
  async sendBulkEmailToSellers(
    @Body() body: { subject: string; message: string; sellerIds?: string[] },
  ) {
    return this.usersService.sendBulkEmailToSellers(body.subject, body.message, body.sellerIds);
  }

  @ApiOperation({ summary: 'Get all sellers for bulk email preview' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('admin/sellers-for-email')
  async getSellersForEmail() {
    return this.usersService.getSellersForBulkEmail();
  }
}
