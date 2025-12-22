import { MongoClient } from 'mongodb';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI!;
const ENCRYPTION_KEY = process.env.CLOUDINARY_ENCRYPTION_KEY || 'soulart-cloudinary-encryption-key-2024';

// Encryption setup (same as in the service)
const encryptionKey = crypto.scryptSync(ENCRYPTION_KEY, 'cloudinary-salt', 32);
const encryptionIV = Buffer.alloc(16, 0);

function encrypt(text: string): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, encryptionIV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

async function seed() {
  console.log('🔗 Connecting to MongoDB...');
  console.log(`   URI: ${MONGODB_URI.replace(/:[^:@]+@/, ':****@')}`);
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    console.log('✅ Connected to MongoDB\n');

    // 1. Create cloudinary_config collection and seed
    console.log('📦 Setting up cloudinary_config...');
    const configExists = await db.collection('cloudinary_config').findOne({ isActive: true });
    if (!configExists) {
      await db.collection('cloudinary_config').insertOne({
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dmvh7vwpu',
        apiKey: process.env.CLOUDINARY_API_KEY || '321869239875453',
        apiSecretEncrypted: encrypt(process.env.CLOUDINARY_API_SECRET || 'pE6Z6Jp1qFkQzSldNt-1I-QSzXQ'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('   ✅ Created cloudinary_config with active config');
    } else {
      console.log('   ⏭️  cloudinary_config already exists');
    }

    // 2. Create retired_clouds collection and seed
    console.log('\n📦 Setting up retired_clouds...');
    const retiredClouds = [
      { cloudName: 'dsufx8uzd', retiredAt: new Date('2024-06-15'), migratedToCloud: 'dwfqjtdu2' },
      { cloudName: 'dwfqjtdu2', retiredAt: new Date('2024-12-22'), migratedToCloud: 'dmvh7vwpu' }
    ];
    
    for (const cloud of retiredClouds) {
      const exists = await db.collection('retired_clouds').findOne({ cloudName: cloud.cloudName });
      if (!exists) {
        await db.collection('retired_clouds').insertOne({
          ...cloud,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`   ✅ Added retired cloud: ${cloud.cloudName}`);
      } else {
        console.log(`   ⏭️  Retired cloud already exists: ${cloud.cloudName}`);
      }
    }

    // 3. Create indexes for cloudinary_migrations
    console.log('\n📦 Setting up cloudinary_migrations...');
    await db.collection('cloudinary_migrations').createIndex({ status: 1 });
    await db.collection('cloudinary_migrations').createIndex({ startedAt: -1 });
    console.log('   ✅ Created indexes on cloudinary_migrations');

    // 4. Create indexes for migrated_files
    console.log('\n📦 Setting up migrated_files...');
    try {
      await db.collection('migrated_files').createIndex(
        { publicId: 1, destinationCloud: 1 }, 
        { unique: true }
      );
    } catch (e) {
      // Index might already exist
    }
    await db.collection('migrated_files').createIndex({ destinationCloud: 1 });
    await db.collection('migrated_files').createIndex({ migrationId: 1 });
    console.log('   ✅ Created indexes on migrated_files');

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Database seeding complete!');
    console.log('='.repeat(50));
    
    // Show counts
    const configCount = await db.collection('cloudinary_config').countDocuments();
    const retiredCount = await db.collection('retired_clouds').countDocuments();
    const migrationsCount = await db.collection('cloudinary_migrations').countDocuments();
    const filesCount = await db.collection('migrated_files').countDocuments();
    
    console.log(`\n📊 Collection counts:`);
    console.log(`   cloudinary_config:    ${configCount}`);
    console.log(`   retired_clouds:       ${retiredCount}`);
    console.log(`   cloudinary_migrations: ${migrationsCount}`);
    console.log(`   migrated_files:       ${filesCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

seed();
