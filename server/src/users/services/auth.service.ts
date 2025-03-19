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
    const user = await this.usersService.findOne(email);
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

  async singInWithGoogle(googleUser) {
    let existUser = await this.userModel.findOne({ email: googleUser.email });

    console.log('🆕 ახალი მომხმარებლის რეგისტრაცია Google-ით:', googleUser);

    if (!existUser) {
      const newUser = new this.userModel({
        email: googleUser.email,
        name: googleUser.name || 'Google User',
        googleId: googleUser.id || googleUser.sub, // Google ID უნდა შევინახოთ
        role: Role.User,
      });

      await newUser.save(); // ⬅️ აქამდე უკვე აქვს googleId მნიშვნელობა, ამიტომ password არ ითვლება required

      existUser = newUser;
      console.log('✅ ახალი მომხმარებელი წარმატებით დაემატა:', existUser);
    }

    const { tokens, user: userData } = await this.login(existUser);

    console.log('✅ გენერირებული access_token და refresh_token:', tokens);
    return { tokens, user: userData };
  }

  async validateUser(email: string, password: string): Promise<UserDocument> {
    const user = await this.usersService.findOne(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await verifyPassword(user.password, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(user: UserDocument): Promise<AuthResponseDto> {
    const tokens = await this.generateTokens(user);

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

  private async generateTokens(user: UserDocument): Promise<TokensDto> {
    const jti = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: user._id.toString(),
          email: user.email,
          // isAdmin: user.isAdmin,
          role: user.role,
          type: 'access',
        } as TokenPayload,
        {
          expiresIn: '20m',
          secret: process.env.JWT_ACCESS_SECRET,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: user._id.toString(),
          email: user.email,
          // isAdmin: user.isAdmin,
          role: user.role,
          type: 'refresh',
          jti,
        } as TokenPayload,
        {
          expiresIn: '7d',
          secret: process.env.JWT_REFRESH_SECRET,
        },
      ),
    ]);

    await this.userModel.findByIdAndUpdate(user._id, {
      refreshToken: jti,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string): Promise<TokensDto> {
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

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException();
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: null,
    });
  }
}
