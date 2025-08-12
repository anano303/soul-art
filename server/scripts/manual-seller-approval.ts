import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ReferralsService } from '../src/referrals/services/referrals.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const referralsService = app.get(ReferralsService);
  const logger = new Logger('ManualSellerApproval');

  try {
    // Replace with the actual seller ID from the logs
    const sellerId = '689b6498dbc8860bac97d94a';
    
    logger.log(`Manually approving seller referral for seller: ${sellerId}`);
    
    await referralsService.approveSellerAndPayBonus(sellerId);
    
    logger.log('Seller referral approval completed successfully');
  } catch (error) {
    logger.error(`Failed to approve seller referral: ${error.message}`);
    console.error(error);
  } finally {
    await app.close();
  }
}

bootstrap();
