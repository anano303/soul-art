import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface User {
  _id: any;
  email: string;
  name: string;
  role: string;
  storeName?: string;
  artistSlug?: string;
}

// Georgian to English transliteration mapping
const georgianToEnglishMap: { [key: string]: string } = {
  'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z',
  'თ': 't', 'ი': 'i', 'კ': 'k', 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o',
  'პ': 'p', 'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u', 'ფ': 'f',
  'ქ': 'q', 'ღ': 'gh', 'ყ': 'y', 'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz',
  'წ': 'w', 'ჭ': 'j', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
};

function transliterateGeorgian(text: string): string {
  return text.replace(/[\u10A0-\u10FF]/g, (char) => {
    return georgianToEnglishMap[char] || char;
  });
}

function hasGeorgianCharacters(text: string): boolean {
  return /[\u10A0-\u10FF]/.test(text);
}

function generateSlugFromEmail(email: string): string {
  // Extract username part from email (before @)
  let username = email.split('@')[0];
  
  // Transliterate Georgian characters to English
  if (hasGeorgianCharacters(username)) {
    username = transliterateGeorgian(username);
    console.log(`    📝 Transliterated email: ${email.split('@')[0]} → ${username}`);
  }
  
  // Clean and format the username
  return username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric characters
    .slice(0, 20); // Limit to 20 characters
}

function generateSlugFromStoreName(storeName: string): string {
  let cleanName = storeName;
  
  // Transliterate Georgian characters to English
  if (hasGeorgianCharacters(cleanName)) {
    const original = cleanName;
    cleanName = transliterateGeorgian(cleanName);
    console.log(`    📝 Transliterated storeName: ${original} → ${cleanName}`);
  }
  
  return cleanName
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters, keep alphanumeric and spaces
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, '') // Keep only letters and numbers
    .slice(0, 20); // Limit to 20 characters
}

function generateSlugFromName(name: string): string {
  let cleanName = name;
  
  // Transliterate Georgian characters to English
  if (hasGeorgianCharacters(cleanName)) {
    const original = cleanName;
    cleanName = transliterateGeorgian(cleanName);
    console.log(`    📝 Transliterated name: ${original} → ${cleanName}`);
  }
  
  return cleanName
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters, keep alphanumeric and spaces
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, '') // Keep only letters and numbers
    .slice(0, 20); // Limit to 20 characters
}

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

        // Priority 1: Try to use storeName if available and meaningful
        if (seller.storeName && seller.storeName.trim().length > 2) {
          baseSlug = generateSlugFromStoreName(seller.storeName.trim());
          console.log(`📝 Using storeName for ${seller.email}: ${seller.storeName} -> ${baseSlug}`);
        }
        // Priority 2: Use email username
        else if (seller.email) {
          baseSlug = generateSlugFromEmail(seller.email);
          console.log(`📧 Using email for ${seller.email}: ${baseSlug}`);
        }
        // Priority 3: Use user name as fallback
        else if (seller.name && seller.name.trim().length > 2) {
          baseSlug = generateSlugFromName(seller.name.trim());
          console.log(`👤 Using name for ${seller.email}: ${seller.name} -> ${baseSlug}`);
        }
        // Last resort: use email prefix or default
        else {
          baseSlug = seller.email ? generateSlugFromEmail(seller.email) : 'artist';
          console.log(`🔧 Using fallback for ${seller.email}: ${baseSlug}`);
        }

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