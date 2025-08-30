import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtService } from '@nestjs/jwt';
import { AuthResponseDto, TokensDto, TokenPayload } from '../dtos/auth.dto';
// import { User, UserDocument } from '../schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { verifyPassword } from '@/utils/password';
import { randomUUID } from 'crypto';
import { Role } from '@/types/role.enum';
import { EmailService } from '@/email/services/email.services';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '@/utils/password';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async requestPasswordReset(email: string): Promise<void> {
    // Convert email to lowercase
    const lowercaseEmail = email.toLowerCase();

    // Find user with lowercase email
    const user = await this.usersService.findByEmail(lowercaseEmail);
    if (!user) {
      throw new BadRequestException('მომხმარებელი ვერ მოიძებნა');
    }

    const resetToken = uuidv4();
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 საათი

    await user.save();
    await this.emailService.sendPasswordResetEmail(email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }, // Ensure token is not expired
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    user.password = await hashPassword(newPassword);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();
  }

  async singInWithGoogle(googleData: {
    email: string;
    name: string;
    id: string;
    sub?: string;
  }, deviceInfo?: {
    fingerprint?: string;
    userAgent?: string;
    trusted?: boolean;
  }) {
    // Convert email to lowercase
    const email = googleData.email.toLowerCase();

    let existUser = await this.userModel.findOne({ email });

    console.log('🆕 ახალი მომხმარებლის რეგისტრაცია Google-ით:', googleData);

    if (!existUser) {
      const newUser = new this.userModel({
        email,
        name: googleData.name || 'Google User',
        googleId: googleData.id || googleData.sub, // Google ID უნდა შევინახოთ
        role: Role.User,
      });

      await newUser.save(); // ⬅️ აქამდე უკვე აქვს googleId მნიშვნელობა, ამიტომ password არ ითვლება required

      existUser = newUser;
      console.log('✅ ახალი მომხმარებელი წარმატებით დაემატა:', existUser);
    }

    const { tokens, user: userData } = await this.login(existUser, deviceInfo);

    console.log('✅ გენერირებული access_token და refresh_token:', tokens);
    return { tokens, user: userData };
  }

  async validateUser(email: string, password: string): Promise<UserDocument> {
    // Convert email to lowercase for case-insensitive comparison
    const lowercaseEmail = email.toLowerCase();
    const user = await this.usersService.findByEmail(lowercaseEmail);

    if (!user) {
      throw new UnauthorizedException('არასწორი მეილი ან პაროლი.');
    }

    const isPasswordValid = await verifyPassword(user.password, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('არასწორი მეილი ან პაროლი.');
    }

    return user;
  }

  async login(user: UserDocument, deviceInfo?: {
    fingerprint?: string;
    userAgent?: string;
    trusted?: boolean;
  }): Promise<AuthResponseDto> {
    const tokens = await this.generateTokens(user, deviceInfo);

    return {
      tokens,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        // isAdmin: user.isAdmin,
        role: user.role,
      },
    };
  }

  private async generateTokens(user: UserDocument, deviceInfo?: any): Promise<TokensDto> {
    const jti = randomUUID();
    const sessionId = randomUUID();

    const [accessToken, refreshToken, sessionToken] = await Promise.all([
      // Access token - 1 hour (increased from 20min for better UX)
      this.jwtService.signAsync(
        {
          sub: user._id.toString(),
          email: user.email,
          role: user.role,
          type: 'access',
          sessionId, // Link to session
        } as TokenPayload,
        {
          expiresIn: '1h',
          secret: process.env.JWT_ACCESS_SECRET,
        },
      ),
      // Refresh token - 30 days (increased from 7d for convenience)
      this.jwtService.signAsync(
        {
          sub: user._id.toString(),
          email: user.email,
          role: user.role,
          type: 'refresh',
          jti,
          sessionId,
        } as TokenPayload,
        {
          expiresIn: '30d',
          secret: process.env.JWT_REFRESH_SECRET,
        },
      ),
      // Session token - 7 days for device trust
      this.jwtService.signAsync(
        {
          sub: user._id.toString(),
          email: user.email,
          role: user.role,
          type: 'session',
          sessionId,
          deviceTrusted: !!deviceInfo?.trusted,
        } as TokenPayload,
        {
          expiresIn: '7d',
          secret: process.env.JWT_SESSION_SECRET || process.env.JWT_ACCESS_SECRET,
        },
      ),
    ]);

    // Update user with new token info and device tracking
    const updateData: any = {
      refreshToken: jti,
      sessionId,
      lastActivity: new Date(),
    };

    // Handle device info if provided
    if (deviceInfo) {
      // Check if device already exists
      const existingUser = await this.userModel.findById(user._id);
      const existingDevice = existingUser?.knownDevices?.find(
        device => device.fingerprint === deviceInfo.fingerprint
      );

      if (existingDevice) {
        // Update existing device
        await this.userModel.findOneAndUpdate(
          { 
            _id: user._id,
            'knownDevices.fingerprint': deviceInfo.fingerprint 
          },
          {
            $set: {
              ...updateData,
              'knownDevices.$.userAgent': deviceInfo.userAgent,
              'knownDevices.$.lastSeen': new Date(),
              'knownDevices.$.trusted': deviceInfo.trusted || existingDevice.trusted,
              'knownDevices.$.sessionId': sessionId,
            }
          }
        );
      } else {
        // Add new device
        updateData.$push = {
          knownDevices: {
            fingerprint: deviceInfo.fingerprint,
            userAgent: deviceInfo.userAgent,
            lastSeen: new Date(),
            trusted: deviceInfo.trusted || false,
            sessionId,
          }
        };
        await this.userModel.findByIdAndUpdate(user._id, updateData);
      }
    } else {
      // No device info, just update tokens
      await this.userModel.findByIdAndUpdate(user._id, updateData);
    }

    return {
      accessToken,
      refreshToken,
      sessionToken, // Add session token to response
    };
  }

  async refresh(refreshToken: string, deviceInfo?: {
    fingerprint?: string;
    userAgent?: string;
  }): Promise<TokensDto> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(
        refreshToken,
        {
          secret: process.env.JWT_REFRESH_SECRET,
        },
      );

      if (payload.type !== 'refresh' || !payload.jti) {
        throw new UnauthorizedException();
      }

      const user = await this.userModel.findById(payload.sub);
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException();
      }

      if (user.refreshToken !== payload.jti) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if device is trusted for extended session
      let deviceTrusted = false;
      if (deviceInfo?.fingerprint) {
        const knownDevice = user.knownDevices?.find(
          device => device.fingerprint === deviceInfo.fingerprint
        );
        deviceTrusted = knownDevice?.trusted || false;
      }

      // Generate new tokens with device context (token rotation)
      return this.generateTokens(user, { 
        ...deviceInfo, 
        trusted: deviceTrusted 
      });
    } catch {
      throw new UnauthorizedException();
    }
  }

  async logout(userId: string, sessionId?: string): Promise<void> {
    const updateData: any = { refreshToken: null };
    
    if (sessionId) {
      // Remove specific session/device
      updateData.$pull = {
        knownDevices: { sessionId }
      };
    } else {
      // Full logout - clear all sessions and devices
      updateData.knownDevices = [];
      updateData.sessionId = null;
    }

    await this.userModel.findByIdAndUpdate(userId, updateData);
  }

  // Method to trust a device for extended sessions
  async trustDevice(userId: string, deviceFingerprint: string): Promise<void> {
    await this.userModel.findOneAndUpdate(
      { 
        _id: userId,
        'knownDevices.fingerprint': deviceFingerprint 
      },
      {
        $set: { 'knownDevices.$.trusted': true }
      }
    );
  }

  // Method to trust device and generate new tokens atomically
  async trustDeviceAndGenerateTokens(user: UserDocument, deviceFingerprint: string, userAgent: string): Promise<TokensDto> {
    let sessionId: string;

    // First, check if the device exists and update/create it
    const existingUser = await this.userModel.findById(user._id);
    const existingDevice = existingUser?.knownDevices?.find(
      device => device.fingerprint === deviceFingerprint
    );

    if (existingDevice) {
      // Device exists - update it to trusted and use its sessionId
      sessionId = existingDevice.sessionId || require('crypto').randomUUID();
      
      const updateResult = await this.userModel.findOneAndUpdate(
        { 
          _id: user._id,
          'knownDevices.fingerprint': deviceFingerprint 
        },
        {
          $set: { 
            'knownDevices.$.trusted': true,
            'knownDevices.$.lastSeen': new Date(),
            'knownDevices.$.sessionId': sessionId
          }
        },
        { returnDocument: 'after' }
      );
      
      console.log('Updated existing device trust status:', updateResult ? 'success' : 'failed');
    } else {
      // Device doesn't exist - create it as trusted
      sessionId = require('crypto').randomUUID();
      
      await this.userModel.findByIdAndUpdate(user._id, {
        $push: {
          knownDevices: {
            fingerprint: deviceFingerprint,
            userAgent: userAgent,
            lastSeen: new Date(),
            trusted: true, // Create as trusted
            sessionId,
          }
        }
      });
      
      console.log('Created new trusted device');
    }

    // Generate new tokens using the device's sessionId
    const jti = require('crypto').randomUUID();

    const [accessToken, refreshToken, sessionToken] = await Promise.all([
      // Access token - 1 hour
      this.jwtService.signAsync(
        {
          sub: user._id.toString(),
          email: user.email,
          role: user.role,
          type: 'access',
          sessionId,
        },
        {
          expiresIn: '1h',
          secret: process.env.JWT_ACCESS_SECRET,
        },
      ),
      // Refresh token - 30 days
      this.jwtService.signAsync(
        {
          sub: user._id.toString(),
          email: user.email,
          role: user.role,
          type: 'refresh',
          jti,
          sessionId,
        },
        {
          expiresIn: '30d',
          secret: process.env.JWT_REFRESH_SECRET,
        },
      ),
      // Session token - 7 days with device trusted flag
      this.jwtService.signAsync(
        {
          sub: user._id.toString(),
          email: user.email,
          role: user.role,
          type: 'session',
          sessionId,
          deviceTrusted: true, // This is the key - marking as trusted
        },
        {
          expiresIn: '7d',
          secret: process.env.JWT_SESSION_SECRET || process.env.JWT_ACCESS_SECRET,
        },
      ),
    ]);

    // Update user with new token info (but don't touch devices)
    await this.userModel.findByIdAndUpdate(user._id, {
      refreshToken: jti,
      sessionId,
      lastActivity: new Date(),
    });

    return {
      accessToken,
      refreshToken,
      sessionToken,
    };
  }

  // Method to get user's trusted devices
  async getUserDevices(userId: string) {
    const user = await this.userModel.findById(userId).select('knownDevices');
    return user?.knownDevices || [];
  }

  // Method to remove a specific device
  async removeDevice(userId: string, deviceFingerprint: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $pull: {
        knownDevices: { fingerprint: deviceFingerprint }
      }
    });
  }

  // Method to remove all devices
  async removeAllDevices(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      knownDevices: []
    });
  }

  // Method to clean up duplicate devices (keep the most recent one for each fingerprint)
  async cleanupDuplicateDevices(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user?.knownDevices) return;

    // Group devices by fingerprint and keep only the most recent one
    const uniqueDevices = user.knownDevices.reduce((acc, device) => {
      const existing = acc.find(d => d.fingerprint === device.fingerprint);
      if (!existing || device.lastSeen > existing.lastSeen) {
        if (existing) {
          // Remove the older one
          acc.splice(acc.indexOf(existing), 1);
        }
        acc.push(device);
      }
      return acc;
    }, []);

    // Update user with cleaned up devices
    await this.userModel.findByIdAndUpdate(userId, {
      knownDevices: uniqueDevices
    });
  }

  // Public method to generate tokens for a user (used when trusting device)
  async generateTokensForUser(user: UserDocument, deviceInfo?: any): Promise<TokensDto> {
    return this.generateTokens(user, deviceInfo);
  }

  // Method to get user by ID
  async getUserById(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
