import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { 
  generateBaseArtistSlug, 
  hasGeorgianCharacters 
} from '../utils/slug-generator';

// Load environment variables
dotenv.config();

interface User {
  _id: any;
  email: string;
  name: string;
  role: string;
  ownerFirstName: string;
  ownerLastName: string;
  storeName?: string;
  artistSlug?: string;
}

// Now using utility functions from slug-generator.ts

function generateUniqueSlug(baseSlug: string, existingSlugs: Set<string>): string {
  let counter = 1;
  let slug = baseSlug;
  
  // If base slug is empty or too short, use a default
  if (!slug || slug.length < 3) {
    slug = 'artist';
  }
  
  // Keep trying until we find a unique slug
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}${counter}`;
    counter++;
  }
  
  existingSlugs.add(slug);
  return slug;
}

async function createArtistSlugs() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
  console.log(`🔗 Connecting to MongoDB at ${mongoUri.replace(/\/\/[^:]*:[^@]*@/, '//*****:*****@')}`);

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB server');

    // Extract database name from connection string
    const dbName = mongoUri.split('/').pop()?.split('?')[0] || 'test';
    console.log(`📁 Using database: ${dbName}`);

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    // Find all sellers (artists) who need slug generation or have Georgian characters in existing slugs
    const sellers = await usersCollection.find({
      role: 'seller',
      $or: [
        { artistSlug: { $exists: false } },
        { artistSlug: null },
        { artistSlug: '' },
        { artistSlug: { $regex: '[ა-ჰ]' } } // Has Georgian characters (ა through ჰ)
      ]
    }).toArray() as User[];

    console.log(`🎨 Found ${sellers.length} artists needing slug generation/update`);
    
    // Count how many need updates vs new slugs
    const needsUpdate = sellers.filter(s => s.artistSlug && hasGeorgianCharacters(s.artistSlug));
    const needsNew = sellers.filter(s => !s.artistSlug || s.artistSlug === '');
    
    console.log(`   📝 New slugs needed: ${needsNew.length}`);
    console.log(`   🔄 Georgian slugs to update: ${needsUpdate.length}`);

    if (sellers.length === 0) {
      console.log('✨ All artists already have proper English slugs! Nothing to do.');
      return;
    }

    // Get existing slugs to avoid duplicates
    const existingUsers = await usersCollection.find({
      artistSlug: { $exists: true, $nin: [null, ''] }
    }).toArray() as User[];

    const existingSlugs = new Set(existingUsers.map(user => user.artistSlug).filter(Boolean));
    console.log(`🔍 Found ${existingSlugs.size} existing slugs to avoid duplicates`);

    let successCount = 0;
    let errorCount = 0;

    for (const seller of sellers) {
      try {
        const isUpdate = seller.artistSlug && hasGeorgianCharacters(seller.artistSlug);
        let baseSlug = '';

        if (isUpdate) {
          console.log(`🔄 Updating Georgian slug for ${seller.email}: ${seller.artistSlug}`);
        }

        // Generate base slug using utility function
        baseSlug = generateBaseArtistSlug(
          seller.storeName,
          seller.email,
          seller.ownerFirstName + ' ' + seller.ownerLastName
        );

        console.log(`🔍 Generated base slug for ${seller.email}: ${baseSlug}`);

        // Generate unique slug
        const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);

        // Update the user with the new slug
        await usersCollection.updateOne(
          { _id: seller._id },
          { $set: { artistSlug: uniqueSlug } }
        );

        if (isUpdate) {
          console.log(`✅ Updated slug for ${seller.email}: ${seller.artistSlug} → @${uniqueSlug}`);
        } else {
          console.log(`✅ Created slug for ${seller.email}: @${uniqueSlug}`);
        }
        successCount++;

      } catch (error) {
        console.error(`❌ Error processing slug for ${seller.email}:`, error);
        errorCount++;
      }
    }

    console.log('\n🎉 Migration completed!');
    console.log(`✅ Successfully created: ${successCount} slugs`);
    console.log(`❌ Errors: ${errorCount}`);

    // Verify the results
    const updatedCount = await usersCollection.countDocuments({
      role: 'seller',
      artistSlug: { $exists: true, $nin: [null, ''] }
    });

    console.log(`🔍 Total artists with slugs now: ${updatedCount}`);

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the migration
if (require.main === module) {
  createArtistSlugs()
    .then(() => {
      console.log('🚀 Artist slug migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { createArtistSlugs };