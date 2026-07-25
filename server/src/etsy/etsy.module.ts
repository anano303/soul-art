import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EtsyService } from './etsy.service';
import { EtsyController } from './etsy.controller';
import { EtsyAuth, EtsyAuthSchema } from './schemas/etsy-auth.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: EtsyAuth.name, schema: EtsyAuthSchema },
    ]),
  ],
  controllers: [EtsyController],
  providers: [EtsyService],
  exports: [EtsyService],
})
export class EtsyModule {}
