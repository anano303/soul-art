import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  UseGuards,
  Res,
  Req,
  Param,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { Roles } from '@/decorators/roles.decorator';
import { Role } from '@/types/role.enum';
import { RolesGuard } from '@/guards/roles.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { LocalAuthGuard } from 'src/guards/local-auth.guard';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { ProfileDto } from '../dtos/profile.dto';
import { RegisterDto } from '../dtos/register.dto';
import { UserDto } from '../dtos/user.dto';
import { UserDocument } from '../schemas/user.schema';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../services/users.service';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthResponseDto, LoginDto } from '../dtos/auth.dto';
import { NotAuthenticatedGuard } from '@/guards/not-authenticated.guard';
import { Response, Request } from 'express';
import { cookieConfig } from '@/cookie-config';
import { SellerRegisterDto } from '../dtos/seller-register.dto';
import { SalesManagerRegisterDto } from '../dtos/sales-manager-register.dto';
import { BecomeSellerDto } from '../dtos/become-seller.dto';
import { GoogleAuthGuard } from '@/guards/google-oauth.guard';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  authRateLimit,
  uploadRateLimit,
  refreshRateLimit,
  passwordResetRateLimit,
  deviceManagementRateLimit,
} from '@/middleware/security.middleware';
import { createRateLimitInterceptor } from '@/interceptors/rate-limit.interceptor';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @UseGuards(LocalAuthGuard)
  @UseInterceptors(createRateLimitInterceptor(authRateLimit))
  @Post('login')
  async login(
    @Body()
    body: LoginDto & {
      deviceInfo?: {
        fingerprint?: string;
        userAgent?: string;
        trusted?: boolean;
      };
    },
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const user = await this.authService.validateUser(body.email, body.password);

    let profileImage = null;
    if (user.profileImagePath) {
      profileImage = await this.usersService.getProfileImageUrl(
        user.profileImagePath,
      );
    }

    // Extract device info from request body or generate from request
    const deviceInfo = {
      fingerprint:
        body.deviceInfo?.fingerprint || this.generateDeviceFingerprint(req),
      userAgent: body.deviceInfo?.userAgent || req.headers['user-agent'] || '',
      trusted: body.deviceInfo?.trusted || false,
    };

    const { tokens, user: userData } = await this.authService.login(
      user,
      deviceInfo,
    );

    // Set HTTP-only cookies instead of returning tokens in response
    res.cookie(
      cookieConfig.access.name,
      tokens.accessToken,
      cookieConfig.access.options,
    );
    res.cookie(
      cookieConfig.refresh.name,
      tokens.refreshToken,
      cookieConfig.refresh.options,
    );

    // Return user data without tokens
    return {
      user: {
        ...userData,
        profileImage,
      },
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: UserDocument) {
    return this.usersService.getProfileData(user._id.toString());
  }

  @UseInterceptors(createRateLimitInterceptor(refreshRateLimit))
  @Post('refresh')
  async refresh(
    @Body() body: { deviceInfo?: { fingerprint?: string; userAgent?: string } },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Get refresh token from HTTP-only cookie
    const refreshToken = req.cookies?.[cookieConfig.refresh.name];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    // Extract device information for context
    const deviceInfo = {
      fingerprint:
        body.deviceInfo?.fingerprint || this.generateDeviceFingerprint(req),
      userAgent: body.deviceInfo?.userAgent || req.headers['user-agent'] || '',
    };

    const tokens = await this.authService.refresh(refreshToken, deviceInfo);

    // Set new HTTP-only cookies
    res.cookie(
      cookieConfig.access.name,
      tokens.accessToken,
      cookieConfig.access.options,
    );
    res.cookie(
      cookieConfig.refresh.name,
      tokens.refreshToken,
      cookieConfig.refresh.options,
    );

    return { success: true };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async auth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    try {
      console.log('🔍 Google OAuth callback received');
      const { tokens, user } = await this.authService.singInWithGoogle({
        email: req.user.email,
        name: req.user.name || 'Google User',
        id: req.user.id,
      });
      console.log('✅ Google auth successful, setting HTTP-only cookies');
      console.log('🍪 Setting cookies with config:', cookieConfig);

      // Set HTTP-only cookies instead of URL hash tokens
      res.cookie(
        cookieConfig.access.name,
        tokens.accessToken,
        cookieConfig.access.options,
      );
      res.cookie(
        cookieConfig.refresh.name,
        tokens.refreshToken,
        cookieConfig.refresh.options,
      );

      console.log(
        '🔄 Redirecting to:',
        `${process.env.ALLOWED_ORIGINS}/auth-callback?success=true`,
      );

      // Redirect to auth callback page with success parameter
      res.redirect(`${process.env.ALLOWED_ORIGINS}/auth-callback?success=true`);
    } catch (error) {
      console.error('❌ Google auth error:', error);
      res.redirect(`${process.env.ALLOWED_ORIGINS}/login?error=auth_failed`);
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: UserDocument,
    @Body()
    body: { deviceInfo?: { fingerprint?: string; logoutAllDevices?: boolean } },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Extract device fingerprint for per-device logout
    const deviceFingerprint =
      body.deviceInfo?.fingerprint || this.generateDeviceFingerprint(req);

    if (body.deviceInfo?.logoutAllDevices) {
      // Full logout from all devices
      await this.authService.logout(user._id.toString());
    } else {
      // Logout only current device
      await this.authService.logout(user._id.toString(), {
        fingerprint: deviceFingerprint,
      });
    }

    // Clear HTTP-only cookies
    res.clearCookie(cookieConfig.access.name, {
      ...cookieConfig.access.options,
      maxAge: 0,
    });
    res.clearCookie(cookieConfig.refresh.name, {
      ...cookieConfig.refresh.options,
      maxAge: 0,
    });

    return {
      success: true,
      message: body.deviceInfo?.logoutAllDevices
        ? 'Logged out from all devices'
        : 'Logged out from current device',
    };
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(createRateLimitInterceptor(deviceManagementRateLimit))
  @ApiOperation({ summary: 'Get user trusted devices' })
  async getUserDevices(@CurrentUser() user: UserDocument) {
    const devices = await this.authService.getUserDevices(user._id.toString());
    return { devices };
  }

  @Post('devices/trust')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(createRateLimitInterceptor(deviceManagementRateLimit))
  @ApiOperation({ summary: 'Trust current device for extended sessions' })
  async trustDevice(
    @CurrentUser() user: UserDocument,
    @Req() req: Request,
    @Body() body: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Use frontend fingerprint if provided, otherwise fallback to server-generated
    const deviceFingerprint =
      body.deviceInfo?.fingerprint || this.generateDeviceFingerprint(req);

    // Trust the device and generate new tokens in one operation
    const tokens = await this.authService.trustDeviceAndGenerateTokens(
      user,
      deviceFingerprint,
      req.headers['user-agent'] || '',
    );

    // Clean up duplicates after trusting device
    await this.authService.cleanupDuplicateDevices(user._id.toString());

    // Set new HTTP-only cookies with trusted tokens
    res.cookie(
      cookieConfig.access.name,
      tokens.accessToken,
      cookieConfig.access.options,
    );
    res.cookie(
      cookieConfig.refresh.name,
      tokens.refreshToken,
      cookieConfig.refresh.options,
    );
    if (tokens.sessionToken) {
      // Add session token cookie config if needed
      res.cookie('session_token', tokens.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    return {
      success: true,
      message: 'Device trusted successfully',
    };
  }

  @Delete('devices/:fingerprint')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(createRateLimitInterceptor(deviceManagementRateLimit))
  @ApiOperation({ summary: 'Remove a trusted device' })
  async removeDevice(
    @CurrentUser() user: UserDocument,
    @Param('fingerprint') fingerprint: string,
  ) {
    await this.authService.removeDevice(user._id.toString(), fingerprint);
    return { success: true, message: 'Device removed successfully' };
  }

  @Post('devices/cleanup')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(createRateLimitInterceptor(deviceManagementRateLimit))
  @ApiOperation({ summary: 'Clean up duplicate devices' })
  async cleanupDevices(@CurrentUser() user: UserDocument) {
    await this.authService.cleanupDuplicateDevices(user._id.toString());
    return {
      success: true,
      message: 'Duplicate devices cleaned up successfully',
    };
  }

  @Delete('devices/all')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(createRateLimitInterceptor(deviceManagementRateLimit))
  @ApiOperation({ summary: 'Remove all trusted devices' })
  async removeAllDevices(@CurrentUser() user: UserDocument) {
    await this.authService.removeAllDevices(user._id.toString());
    return { success: true, message: 'All devices removed successfully' };
  }

  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @Post('check-email')
  async checkEmail(@Body() body: { email: string }) {
    const user = await this.usersService.findByEmail(body.email);
    return { exists: !!user };
  }

  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @UseInterceptors(createRateLimitInterceptor(authRateLimit))
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.usersService.create(registerDto);
    const { tokens, user: userData } = await this.authService.login(user);

    // Set HTTP-only cookies
    res.cookie(
      cookieConfig.access.name,
      tokens.accessToken,
      cookieConfig.access.options,
    );
    res.cookie(
      cookieConfig.refresh.name,
      tokens.refreshToken,
      cookieConfig.refresh.options,
    );

    // Return user data without tokens
    return { user: userData };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.User, Role.Seller, Role.Blogger, Role.SalesManager, Role.AuctionAdmin)
  @Put('profile')
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() updateDto: ProfileDto,
  ) {
    // Filter out undefined fields to make all fields truly optional
    const filteredDto = Object.entries(updateDto)
      .filter(([_, value]) => value !== undefined)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    // Check if the update contains seller-specific fields (bank details, etc.)
    const hasSellerFields = [
      'storeName',
      'phoneNumber',
      'identificationNumber',
      'accountNumber',
      'beneficiaryBankCode',
    ].some((field) => field in filteredDto);

    // Only allow updating seller/sales-manager/auction-admin fields if the user has appropriate role
    if (
      hasSellerFields &&
      user.role !== Role.Seller &&
      user.role !== Role.SalesManager &&
      user.role !== Role.AuctionAdmin &&
      user.role !== Role.SellerAndSalesManager
    ) {
      const sellerFields = [
        'storeName',
        'phoneNumber',
        'identificationNumber',
        'accountNumber',
        'beneficiaryBankCode',
      ].filter((field) => field in filteredDto);

      throw new BadRequestException(
        `Only sellers, sales managers, and auction admins can update the following fields: ${sellerFields.join(', ')}`,
      );
    }

    return this.usersService.update(user._id.toString(), filteredDto);
  }

  @ApiOperation({ summary: 'Register a new seller' })
  @ApiResponse({
    status: 201,
    description: 'Seller successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logoFile'))
  @UseInterceptors(createRateLimitInterceptor(uploadRateLimit))
  @Post('sellers-register')
  async registerSeller(
    @Body() sellerRegisterDto: SellerRegisterDto,
    @UploadedFile() logoFile: Express.Multer.File,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const seller = await this.usersService.createSellerWithLogo(
        sellerRegisterDto,
        logoFile,
      );
      const { tokens, user } = await this.authService.login(seller);

      // Set HTTP-only cookies
      res.cookie(
        cookieConfig.access.name,
        tokens.accessToken,
        cookieConfig.access.options,
      );
      res.cookie(
        cookieConfig.refresh.name,
        tokens.refreshToken,
        cookieConfig.refresh.options,
      );

      // Return user data without tokens
      return { user };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException('Registration failed: ' + error.message);
    }
  }

  @ApiOperation({ summary: 'Register a new sales manager' })
  @ApiResponse({
    status: 201,
    description: 'Sales Manager successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @UseInterceptors(createRateLimitInterceptor(authRateLimit))
  @Post('sales-manager-register')
  async registerSalesManager(
    @Body() salesManagerRegisterDto: SalesManagerRegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const salesManager = await this.usersService.createSalesManager(
        salesManagerRegisterDto,
      );
      const { tokens, user } = await this.authService.login(salesManager);

      // Set HTTP-only cookies
      res.cookie(
        cookieConfig.access.name,
        tokens.accessToken,
        cookieConfig.access.options,
      );
      res.cookie(
        cookieConfig.refresh.name,
        tokens.refreshToken,
        cookieConfig.refresh.options,
      );

      // Return user data without tokens
      return { user };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException('Registration failed: ' + error.message);
    }
  }

  @UseInterceptors(createRateLimitInterceptor(passwordResetRateLimit))
  @Post('forgot-password')
  async forgotPassword(@Body() { email }: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(email);
    return {
      message:
        'თუ თქვენი მეილი სისტემაში არსებობს, პაროლის აღდგენის ბმული გამოგეგზავნებათ.',
    };
  }

  @ApiOperation({ summary: 'Upgrade existing user to seller' })
  @ApiResponse({
    status: 200,
    description: 'User successfully upgraded to seller',
    type: UserDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('logoFile'))
  @UseInterceptors(createRateLimitInterceptor(uploadRateLimit))
  @Post('become-seller')
  async becomeSeller(
    @CurrentUser() user: UserDocument,
    @Body() becomeSellerDto: BecomeSellerDto,
    @UploadedFile() logoFile: Express.Multer.File,
  ) {
    // Check if user is already a seller
    if (user.role === Role.Seller || user.role === Role.SellerAndSalesManager) {
      throw new BadRequestException('User is already a seller');
    }

    try {
      const updatedUser = await this.usersService.upgradeToSeller(
        user._id.toString(),
        becomeSellerDto,
        logoFile,
      );

      // Get store logo URL if available
      let storeLogo = null;
      if (updatedUser.storeLogoPath) {
        try {
          storeLogo = await this.usersService.getProfileImageUrl(
            updatedUser.storeLogoPath,
          );
        } catch (error) {
          console.warn('Failed to get store logo URL:', error);
        }
      }

      return {
        user: {
          id: updatedUser._id.toString(),
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          storeName: updatedUser.storeName,
          ownerFirstName: updatedUser.ownerFirstName,
          ownerLastName: updatedUser.ownerLastName,
          phoneNumber: updatedUser.phoneNumber,
          identificationNumber: updatedUser.identificationNumber,
          accountNumber: updatedUser.accountNumber,
          storeLogo: storeLogo,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
        message: 'Successfully upgraded to seller account',
      };
    } catch (error: any) {
      if (error instanceof ConflictException) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(
        'Failed to upgrade to seller: ' + error.message,
      );
    }
  }

  @UseInterceptors(createRateLimitInterceptor(passwordResetRateLimit))
  @Post('reset-password')
  async resetPassword(@Body() { token, newPassword }: ResetPasswordDto) {
    await this.authService.resetPassword(token, newPassword);
    return { message: 'Password reset successful. You can now log in.' };
  }

  // Helper method to generate device fingerprint
  private generateDeviceFingerprint(req: Request): string {
    const crypto = require('crypto');
    const components = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.ip || '',
      req.headers['accept-encoding'] || '',
    ].join('|');

    return crypto
      .createHash('sha256')
      .update(components)
      .digest('hex')
      .substring(0, 16);
  }
}
