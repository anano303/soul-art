import { Logger, Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { ProductsService } from './services/products.service';
import { ProductsController } from './controller/products.controller';
import { MediaProxyController } from './controller/media-proxy.controller';
import { InjectModel, MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { AppService } from '@/app/services/app.service';
import { CloudinaryModule } from '@/cloudinary/cloudinary.module';
import { AiModule } from '@/ai/ai.module';
import { UsersModule } from '@/users/users.module';
import { ProductExpertAgent } from '@/ai/agents/product-expert.agent';
import { Order } from '@/orders/schemas/order.schema';
import { OrderSchema } from '@/orders/schemas/order.schema';
import { Model } from 'mongoose';
import { ReferralsModule } from '@/referrals/referrals.module';
import { FacebookPostingService } from './services/facebook-posting.service';
import { TikTokPostingService } from './services/tiktok-posting.service';
import { PushNotificationModule } from '@/push/push-notification.module';
import { YoutubeModule } from '@/youtube/youtube.module';
import { ProductYoutubeService } from './services/product-youtube.service';
import { ExchangeRateModule } from '@/exchange-rate/exchange-rate.module';
import { SettingsModule } from '@/settings/settings.module';

// Add a provider to manually drop the problematic index on module initialization
export class IndexCleanupService implements OnModuleInit {
  private readonly logger = new Logger('IndexCleanupService');
  private static hasRunOnce = false; // Flag to prevent multiple runs

  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async onModuleInit() {
    // Skip if already run during this application lifecycle
    if (IndexCleanupService.hasRunOnce) {
      this.logger.debug('Index cleanup already completed, skipping...');
      return;
    }

    try {
      this.logger.log('Checking for and removing problematic indexes...');
      const collection = this.productModel.collection;
      const indexInfo = await collection.indexInformation();

      // Log found indexes
      this.logger.log(
        `Found indexes: ${JSON.stringify(Object.keys(indexInfo))}`,
      );

      let foundProblematicIndex = false;

      // Look for any index on both sizes and ageGroups
      for (const indexName of Object.keys(indexInfo)) {
        if (indexName !== '_id_') {
          // Skip the default _id index
          const indexKeys = indexInfo[indexName];
          const indexFields = indexKeys.map((pair) => pair[0]);

          // If this index contains problematic parallel arrays, drop it
          if (
            (indexFields.includes('ageGroups') &&
              indexFields.includes('sizes')) ||
            (indexFields.includes('ageGroups') &&
              indexFields.includes('colors')) ||
            (indexFields.includes('sizes') && indexFields.includes('colors'))
          ) {
            foundProblematicIndex = true;
            this.logger.warn(
              `Dropping problematic parallel array index: ${indexName} (fields: ${indexFields.join(', ')})`,
            );
            await collection.dropIndex(indexName);
            this.logger.log(`Successfully dropped index: ${indexName}`);
          }
        }
      }

      if (!foundProblematicIndex) {
        this.logger.log('No problematic indexes found');
      }

      this.logger.log('Index cleanup completed');
      IndexCleanupService.hasRunOnce = true; // Set flag to prevent future runs
    } catch (error) {
      this.logger.error('Error during index cleanup:', error);
    }
  }
}

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Product.name,
        useFactory: () => {
          const schema = ProductSchema;

          // Remove any compound indexes on array fields
          schema.index({ mainCategory: 1 });
          schema.index({ subCategory: 1 });
          schema.index({ createdAt: -1 });

          // Make sure we don't have any compound indexes on multiple array fields
          // By explicitly removing them - this will ensure they don't get recreated

          return schema;
        },
      },
      {
        name: Order.name,
        useFactory: () => OrderSchema,
      },
    ]),
    CloudinaryModule,
    forwardRef(() => AiModule),
    forwardRef(() => UsersModule),
    forwardRef(() => ReferralsModule), // Add ReferralsModule
    PushNotificationModule,
    YoutubeModule,
    ExchangeRateModule,
    SettingsModule,
  ],
  providers: [
    ProductsService,
    AppService,
    IndexCleanupService,
    FacebookPostingService,
    TikTokPostingService,
    ProductYoutubeService,
  ],
  controllers: [ProductsController, MediaProxyController],
  exports: [
    ProductsService,
    MongooseModule.forFeature([
      {
        name: Product.name,
        schema: ProductSchema,
      },
    ]), // Export the ProductModel to be available for other modules
  ],
})
export class ProductsModule {}
