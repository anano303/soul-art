import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';

/**
 * Migration script to add missing refreshToken and refreshTokenJti fields
 * to existing knownDevices that don't have them (from old schema)
 */
async function migrateDeviceTokens() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const userModel: Model<any> = app.get(getModelToken('User'));

    console.log('🔄 Starting device tokens migration...');

    // Find all users with knownDevices
    const users = await userModel
      .find({
        knownDevices: { $exists: true, $ne: [] },
      })
      .select('_id email knownDevices');

    console.log(`Found ${users.length} users with devices`);

    let updatedCount = 0;
    let devicesMigrated = 0;

    for (const user of users) {
      let needsUpdate = false;

      // Check each device
      const updatedDevices = user.knownDevices.map((device: any) => {
        // If device is missing tokens, add null values
        if (!device.refreshToken || !device.refreshTokenJti) {
          needsUpdate = true;
          devicesMigrated++;

          return {
            ...device.toObject(),
            refreshToken: device.refreshToken || null,
            refreshTokenJti: device.refreshTokenJti || null,
            isActive: device.isActive !== undefined ? device.isActive : true,
          };
        }
        return device;
      });

      // Update user if any device was modified
      if (needsUpdate) {
        await userModel.findByIdAndUpdate(user._id, {
          knownDevices: updatedDevices,
        });
        updatedCount++;
        console.log(
          `✅ Updated user ${user.email} - migrated ${updatedDevices.filter((d: any) => d.refreshToken === null).length} devices`,
        );
      }
    }

    console.log('\n📊 Migration complete!');
    console.log(`   Users updated: ${updatedCount}`);
    console.log(`   Devices migrated: ${devicesMigrated}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run migration
migrateDeviceTokens()
  .then(() => {
    console.log('✨ Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
