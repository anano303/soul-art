import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { BalanceService } from '../users/services/balance.service';
import { BalanceMigrationService } from '../users/services/balance-migration.service';

async function checkTransactionTypes() {
  console.log('🔍 Checking withdrawal transaction types...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const migrationService = app.get(BalanceMigrationService);

  try {
    const results = await migrationService.verifyMigration();
    
    console.log(`📊 Verification Results:`);
    console.log(`   - Sellers checked: ${results.sellersChecked}`);
    console.log(`   - Discrepancies found: ${results.discrepanciesFound}`);
    
    console.log(`\n📋 Detailed breakdown:`);
    for (const detail of results.details) {
      console.log(`   Seller ${detail.sellerId}:`);
      console.log(`     - Current totalWithdrawn: ${detail.currentTotal}`);
      console.log(`     - Calculated from completed: ${detail.calculatedTotal}`);
      console.log(`     - Completed transactions: ${detail.completedTransactions}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }

  console.log('✅ Check completed.');
}

checkTransactionTypes().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
