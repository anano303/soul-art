import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './controller/auth.controller';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './services/users.service';
import { AuthService } from './services/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from '../strategies/local.strategy';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { UsersController } from './controller/users.controller';
import { GoogleStrategy } from '@/strategies/google.strategy';
import { EmailService } from '@/email/services/email.services';
import { AwsS3Module } from '@/aws-s3/aws-s3.module'; // Import the AwsS3Module

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
    PassportModule.register({ defaultStrategy: 'google' }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '10m' },
    }),
    AwsS3Module, // Add this line to import AwsS3Module
  ],
  controllers: [AuthController, UsersController],
  providers: [
    UsersService,
    AuthService,
    LocalStrategy,
    JwtStrategy,
    AuthService,
    GoogleStrategy,
    EmailService,
  ],
  exports: [UsersService],
})
export class UsersModule {}
