import { Module, forwardRef } from '@nestjs/common';
import { ImageGenerationService } from './services/image-generation.service';
import { AiConfigService } from './services/ai-config.service';
import { CloudinaryModule } from '@/cloudinary/cloudinary.module';
import { ProductGenerationTool } from './tools/product-generation.tool';
import { ProductsModule } from '@/products/products.module';
import { ProductExpertAgent } from './agents/product-expert.agent';

@Module({
  imports: [CloudinaryModule, forwardRef(() => ProductsModule)],
  providers: [
    ImageGenerationService,
    AiConfigService,
    ProductGenerationTool,
    ProductExpertAgent,
  ],
  exports: [
    ImageGenerationService,
    AiConfigService,
    ProductGenerationTool,
    ProductExpertAgent,
  ],
})
export class AiModule {}
