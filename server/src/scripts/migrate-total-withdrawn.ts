import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { BalanceMigrationService } from '../users/services/balance-migration.service';

async function runMigration() {
  console.log('🚀 Starting Balance Migration...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const migrationService = app.get(BalanceMigrationService);

  try {
    // ჯერ შევამოწმოთ მიმდინარე მდგომარეობა
    console.log('📊 Checking current state...');
    const preResults = await migrationService.verifyMigration();
    console.log(
      `📋 Found ${preResults.discrepanciesFound} sellers with incorrect totalWithdrawn`,
    );

    if (preResults.discrepanciesFound > 0) {
      console.log('🔧 Running migration...');
      await migrationService.updateTotalWithdrawnFromHistory();

      console.log('✅ Migration completed. Verifying results...');
      const postResults = await migrationService.verifyMigration();
      console.log(
        `🎯 After migration: ${postResults.discrepanciesFound} discrepancies remaining`,
      );

      if (postResults.discrepanciesFound === 0) {
        console.log(
          '🎉 Migration successful! All totalWithdrawn values are now correct.',
        );
      } else {
        console.log('⚠️  Some discrepancies remain. Check logs for details.');
      }
    } else {
      console.log(
        '✅ All totalWithdrawn values are already correct. No migration needed.',
      );
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }

  console.log('🏁 Migration process completed.');
}

// Migration-ის გაშვება
runMigration().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
