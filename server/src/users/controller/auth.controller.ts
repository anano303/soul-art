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
import { GoogleAuthGuard } from '@/guards/google-oauth.guard';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { authRateLimit, uploadRateLimit } from '@/middleware/security.middleware';
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
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    let profileImage = null;
    if (user.profileImagePath) {
      profileImage = await this.usersService.getProfileImageUrl(
        user.profileImagePath,
      );
    }

    const { tokens, user: userData } = await this.authService.login(user);

    // Set HTTP-only cookies instead of returning tokens in response
    res.cookie(cookieConfig.access.name, tokens.accessToken, cookieConfig.access.options);
    res.cookie(cookieConfig.refresh.name, tokens.refreshToken, cookieConfig.refresh.options);

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

  @UseInterceptors(createRateLimitInterceptor(authRateLimit))
  @Post('refresh')
  async refresh(
    @Body() body: { deviceInfo?: { fingerprint?: string, userAgent?: string } }, 
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    // Get refresh token from HTTP-only cookie
    const refreshToken = req.cookies?.[cookieConfig.refresh.name];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    // Extract device information for context
    const deviceInfo = {
      fingerprint: body.deviceInfo?.fingerprint || this.generateDeviceFingerprint(req),
      userAgent: body.deviceInfo?.userAgent || req.headers['user-agent'] || '',
    };

    const tokens = await this.authService.refresh(refreshToken, deviceInfo);
    
    // Set new HTTP-only cookies
    res.cookie(cookieConfig.access.name, tokens.accessToken, cookieConfig.access.options);
    res.cookie(cookieConfig.refresh.name, tokens.refreshToken, cookieConfig.refresh.options);
    
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
      res.cookie(cookieConfig.access.name, tokens.accessToken, cookieConfig.access.options);
      res.cookie(cookieConfig.refresh.name, tokens.refreshToken, cookieConfig.refresh.options);
      
      console.log('🔄 Redirecting to:', `${process.env.ALLOWED_ORIGINS}/auth-callback?success=true`);

      // Redirect to auth callback page with success parameter
      res.redirect(`${process.env.ALLOWED_ORIGINS}/auth-callback?success=true`);
    } catch (error) {
      console.error('❌ Google auth error:', error);
      res.redirect(`${process.env.ALLOWED_ORIGINS}/login?error=auth_failed`);
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: UserDocument, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user._id.toString());

    // Clear HTTP-only cookies
    res.clearCookie(cookieConfig.access.name, { 
      ...cookieConfig.access.options, 
      maxAge: 0 
    });
    res.clearCookie(cookieConfig.refresh.name, { 
      ...cookieConfig.refresh.options, 
      maxAge: 0 
    });

    return { success: true };
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user trusted devices' })
  async getUserDevices(@CurrentUser() user: UserDocument) {
    const devices = await this.authService.getUserDevices(user._id.toString());
    return { devices };
  }

  @Post('devices/trust')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Trust current device for extended sessions' })
  async trustDevice(
    @CurrentUser() user: UserDocument, 
    @Req() req: Request, 
    @Body() body: any,
    @Res({ passthrough: true }) res: Response
  ) {
    // Use frontend fingerprint if provided, otherwise fallback to server-generated
    const deviceFingerprint = body.deviceInfo?.fingerprint || this.generateDeviceFingerprint(req);
    
    // Trust the device and generate new tokens in one operation
    const tokens = await this.authService.trustDeviceAndGenerateTokens(
      user,
      deviceFingerprint,
      req.headers['user-agent'] || ''
    );
    
    // Clean up duplicates after trusting device
    await this.authService.cleanupDuplicateDevices(user._id.toString());
    
    // Set new HTTP-only cookies with trusted tokens
    res.cookie(cookieConfig.access.name, tokens.accessToken, cookieConfig.access.options);
    res.cookie(cookieConfig.refresh.name, tokens.refreshToken, cookieConfig.refresh.options);
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
      message: 'Device trusted successfully'
    };
  }

  @Delete('devices/:fingerprint')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove a trusted device' })
  async removeDevice(
    @CurrentUser() user: UserDocument,
    @Param('fingerprint') fingerprint: string
  ) {
    await this.authService.removeDevice(user._id.toString(), fingerprint);
    return { success: true, message: 'Device removed successfully' };
  }

  @Post('devices/cleanup')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Clean up duplicate devices' })
  async cleanupDevices(@CurrentUser() user: UserDocument) {
    await this.authService.cleanupDuplicateDevices(user._id.toString());
    return { success: true, message: 'Duplicate devices cleaned up successfully' };
  }

  @Delete('devices/all')
  @UseGuards(JwtAuthGuard)
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
  @UseInterceptors(createRateLimitInterceptor(authRateLimit))
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.usersService.create(registerDto);
    const { tokens, user: userData } = await this.authService.login(user);
    
    // Set HTTP-only cookies
    res.cookie(cookieConfig.access.name, tokens.accessToken, cookieConfig.access.options);
    res.cookie(cookieConfig.refresh.name, tokens.refreshToken, cookieConfig.refresh.options);
    
    // Return user data without tokens
    return { user: userData };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.User, Role.Seller)
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

    // Check if the update contains seller-specific fields
    const hasSellerFields = [
      'storeName',
      'phoneNumber',
      'identificationNumber',
      'accountNumber',
    ].some((field) => field in filteredDto);

    // Only allow updating seller fields if the user is actually a seller
    if (hasSellerFields && user.role !== Role.Seller) {
      const sellerFields = [
        'storeName',
        'phoneNumber',
        'identificationNumber',
        'accountNumber',
      ].filter((field) => field in filteredDto);

      throw new BadRequestException(
        `Only sellers can update the following fields: ${sellerFields.join(', ')}`,
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
      res.cookie(cookieConfig.access.name, tokens.accessToken, cookieConfig.access.options);
      res.cookie(cookieConfig.refresh.name, tokens.refreshToken, cookieConfig.refresh.options);

      // Return user data without tokens
      return { user };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException('Registration failed: ' + error.message);
    }
  }

  @UseInterceptors(createRateLimitInterceptor(authRateLimit))
  @Post('forgot-password')
  async forgotPassword(@Body() { email }: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(email);
    return {
      message:
        'თუ თქვენი მეილი სისტემაში არსებობს, პაროლის აღდგენის ბმული გამოგეგზავნებათ.',
    };
  }
  @UseInterceptors(createRateLimitInterceptor(authRateLimit))
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
    
    return crypto.createHash('sha256').update(components).digest('hex').substring(0, 16);
  }
}
