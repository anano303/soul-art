import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { forwardRef } from '@nestjs/common';
import { AuthController } from './controller/auth.controller';
import { User, UserSchema } from './schemas/user.schema';
import { GalleryLike, GalleryLikeSchema } from './schemas/gallery-like.schema';
import { GalleryComment, GalleryCommentSchema } from './schemas/gallery-comment.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import {
  SellerBalance,
  SellerBalanceSchema,
} from './schemas/seller-balance.schema';
import {
  BalanceTransaction,
  BalanceTransactionSchema,
} from './schemas/seller-balance.schema';
import { UsersService } from './services/users.service';
import { AuthService } from './services/auth.service';
import { BalanceService } from './services/balance.service';
import { BalanceMigrationService } from './services/balance-migration.service';
import { BankIntegrationService } from './services/bog-bank-integration.service';
import { GalleryInteractionService } from './services/gallery-interaction.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from '../strategies/local.strategy';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { UsersController } from './controller/users.controller';
import { BalanceController } from './controller/balance.controller';
import { ArtistController } from './controller/artist.controller';
import { GalleryInteractionController } from './controller/gallery-interaction.controller';
import { GoogleStrategy } from '@/strategies/google.strategy';
import { EmailService } from '@/email/services/email.services';
import { AwsS3Module } from '@/aws-s3/aws-s3.module';
import { CloudinaryModule } from '@/cloudinary/cloudinary.module';
import { UserCloudinaryService } from './services/user-cloudinary.service';
import { ReferralsModule } from '../referrals/referrals.module';
import { OrderModule } from '../orders/order.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: GalleryLike.name,
        schema: GalleryLikeSchema,
      },
      {
        name: GalleryComment.name,
        schema: GalleryCommentSchema,
      },
      {
        name: Product.name,
        schema: ProductSchema,
      },
      {
        name: Order.name,
        schema: OrderSchema,
      },
      {
        name: SellerBalance.name,
        schema: SellerBalanceSchema,
      },
      {
        name: BalanceTransaction.name,
        schema: BalanceTransactionSchema,
      },
    ]),
    PassportModule.register({ defaultStrategy: 'google' }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '10m' },
    }),
    AwsS3Module,
    CloudinaryModule, // Add Cloudinary module
    forwardRef(() => ReferralsModule), // Add ReferralsModule for dependency injection
    forwardRef(() => OrderModule), // Add OrderModule for guest order linking
  ],
  controllers: [
    AuthController,
    UsersController,
    BalanceController,
    ArtistController,
    GalleryInteractionController,
  ],
  providers: [
    UsersService,
    AuthService,
    BalanceService,
    BalanceMigrationService,
    BankIntegrationService,
    GalleryInteractionService,
    LocalStrategy,
    JwtStrategy,
    AuthService,
    GoogleStrategy,
    EmailService,
    UserCloudinaryService, // Add our new service
  ],
  exports: [
    UsersService,
    BalanceService,
    BalanceMigrationService,
    EmailService,
    MongooseModule, // Export MongooseModule for User model access
  ],
})
export class UsersModule {}
