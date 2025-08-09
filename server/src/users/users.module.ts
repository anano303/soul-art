import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './controller/auth.controller';
import { User, UserSchema } from './schemas/user.schema';
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
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from '../strategies/local.strategy';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { UsersController } from './controller/users.controller';
import { BalanceController } from './controller/balance.controller';
import { GoogleStrategy } from '@/strategies/google.strategy';
import { EmailService } from '@/email/services/email.services';
import { AwsS3Module } from '@/aws-s3/aws-s3.module';
import { CloudinaryModule } from '@/cloudinary/cloudinary.module';
import { UserCloudinaryService } from './services/user-cloudinary.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
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
  ],
  controllers: [AuthController, UsersController, BalanceController],
  providers: [
    UsersService,
    AuthService,
    BalanceService,
    BalanceMigrationService,
    BankIntegrationService,
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
  ],
})
export class UsersModule {}
