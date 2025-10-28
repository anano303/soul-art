import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../users/schemas/user.schema';
import { detectBankFromIban, getBankByIban } from '../utils/georgian-banks';

/**
 * Migration script to populate beneficiaryBankCode for existing sellers
 * Run with: npm run cli migrate-bank-codes
 */
async function migrateBankCodes() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userModel = app.get<Model<User>>(getModelToken(User.name));

  console.log('🏦 Starting bank code migration...\n');

  try {
    // Find all sellers with account numbers but no beneficiaryBankCode
    const sellers = await userModel.find({
      accountNumber: { $exists: true, $ne: null },
      $or: [
        { beneficiaryBankCode: { $exists: false } },
        { beneficiaryBankCode: null },
        { beneficiaryBankCode: '' },
      ],
    });

    console.log(`Found ${sellers.length} sellers to migrate\n`);

    let updated = 0;
    let failed = 0;
    let skipped = 0;

    for (const seller of sellers) {
      const accountNumber = seller.accountNumber;
      
      console.log(`Processing: ${seller.email}`);
      console.log(`  Account: ${accountNumber}`);

      // Detect bank from IBAN
      const bankCode = detectBankFromIban(accountNumber);
      
      if (!bankCode) {
        console.log(`  ❌ Could not detect bank (invalid IBAN format)`);
        failed++;
        console.log('');
        continue;
      }

      const bankInfo = getBankByIban(accountNumber);
      console.log(`  ✅ Detected: ${bankInfo?.nameEn} (${bankCode})`);

      // Update seller
      try {
        await userModel.updateOne(
          { _id: seller._id },
          { $set: { beneficiaryBankCode: bankCode } }
        );
        updated++;
        console.log(`  ✅ Updated successfully`);
      } catch (error) {
        console.log(`  ❌ Failed to update: ${error.message}`);
        failed++;
      }

      console.log('');
    }

    // Summary
    console.log('═'.repeat(50));
    console.log('Migration Summary:');
    console.log('═'.repeat(50));
    console.log(`✅ Successfully updated: ${updated}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log('═'.repeat(50));

    // Show sample of updated sellers
    if (updated > 0) {
      console.log('\nSample of updated sellers:');
      const updatedSellers = await userModel
        .find({ beneficiaryBankCode: { $exists: true, $ne: null } })
        .limit(5)
        .select('email accountNumber beneficiaryBankCode');

      updatedSellers.forEach((seller: any) => {
        const bankInfo = getBankByIban(seller.accountNumber);
        console.log(`  • ${seller.email}`);
        console.log(`    IBAN: ${seller.accountNumber}`);
        console.log(`    Bank: ${bankInfo?.nameEn} (${seller.beneficiaryBankCode})`);
      });
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run migration
migrateBankCodes()
  .then(() => {
    console.log('\n✅ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
