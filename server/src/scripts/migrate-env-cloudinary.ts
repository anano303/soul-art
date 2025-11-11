import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const OLD_CLOUD_NAME = 'dsufx8uzd';
const NEW_CLOUD_NAME = 'dwfqjtdu2';

// Configure new Cloudinary account
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Download file from URL
 */
async function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download file: ${response.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      })
      .on('error', reject);
  });
}

/**
 * Upload file to new Cloudinary account
 */
async function uploadToNewCloudinary(
  fileUrl: string,
  folder: string,
): Promise<string> {
  try {
    console.log(`   📥 Downloading: ${fileUrl}`);
    const fileBuffer = await downloadFile(fileUrl);

    // Determine resource type from URL
    let resourceType: 'image' | 'video' | 'raw' = 'image';
    if (fileUrl.includes('/video/')) {
      resourceType = 'video';
    } else if (fileUrl.includes('.mp3') || fileUrl.includes('.wav')) {
      resourceType = 'video'; // Cloudinary treats audio as video
    }

    console.log(
      `   📤 Uploading to new Cloudinary account (${resourceType})...`,
    );
    const result = await cloudinary.uploader.upload(
      `data:${resourceType}/auto;base64,${fileBuffer.toString('base64')}`,
      {
        folder: folder,
        resource_type: resourceType,
      },
    );

    console.log(`   ✅ Uploaded: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error(`   ❌ Failed to migrate: ${error.message}`);
    throw error;
  }
}

/**
 * Migrate assets from .env file
 */
async function migrateEnvAssets(dryRun: boolean = false) {
  console.log('\n📄 Migrating .env file assets...');

  const envPath = path.join(__dirname, '../../.env');
  const envContent = fs.readFileSync(envPath, 'utf8');

  const lines = envContent.split('\n');
  const updates: { [key: string]: string } = {};
  let hasChanges = false;

  for (const line of lines) {
    // Check for URLs with old cloud name
    if (line.includes('=') && line.includes(OLD_CLOUD_NAME)) {
      const [key, value] = line.split('=');
      const trimmedKey = key.trim();
      const trimmedValue = value.trim();

      if (trimmedValue.startsWith('http')) {
        console.log(`\n   📌 Found: ${trimmedKey}`);
        console.log(`      Old URL: ${trimmedValue}`);

        if (dryRun) {
          const newUrl = trimmedValue.replace(OLD_CLOUD_NAME, NEW_CLOUD_NAME);
          console.log(`      [DRY RUN] Would update to: ${newUrl}`);
          updates[trimmedKey] = newUrl;
        } else {
          try {
            // Determine folder based on key
            let folder = 'ecommerce';
            if (trimmedKey.includes('AUDIO')) {
              folder = 'audio';
            } else if (
              trimmedKey.includes('IMAGE') ||
              trimmedKey.includes('OUTRO')
            ) {
              folder = 'images';
            }

            const newUrl = await uploadToNewCloudinary(trimmedValue, folder);
            updates[trimmedKey] = newUrl;
            console.log(`      ✅ Updated to: ${newUrl}`);
          } catch (error) {
            console.error(`      ❌ Failed to migrate: ${error.message}`);
          }
        }
        hasChanges = true;
      }
    }
  }

  if (hasChanges && !dryRun) {
    // Update .env file
    console.log('\n   📝 Updating .env file...');
    let newEnvContent = envContent;

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`${key}=.*`, 'g');
      newEnvContent = newEnvContent.replace(regex, `${key}=${value}`);
    }

    fs.writeFileSync(envPath, newEnvContent, 'utf8');
    console.log('   ✅ .env file updated successfully');
  } else if (dryRun && hasChanges) {
    console.log('\n   [DRY RUN] Would update .env file with new URLs');
  } else {
    console.log('\n   ℹ️  No changes needed in .env file');
  }

  return {
    totalFound: Object.keys(updates).length,
    updated: hasChanges && !dryRun,
  };
}

/**
 * Main migration function
 */
async function runEnvMigration() {
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    console.log('🧪 RUNNING IN DRY-RUN MODE - No changes will be made\n');
  }

  console.log('🚀 Starting .env file Cloudinary Migration...');
  console.log(`   Old account: ${OLD_CLOUD_NAME}`);
  console.log(`   New account: ${NEW_CLOUD_NAME}\n`);
  console.log('='.repeat(80));

  try {
    const result = await migrateEnvAssets(dryRun);

    console.log('\n' + '='.repeat(80));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`   Total URLs found: ${result.totalFound}`);
    console.log(`   Updated: ${result.updated ? 'Yes' : 'No'}`);
    console.log('='.repeat(80) + '\n');

    if (dryRun) {
      console.log('🧪 DRY RUN COMPLETED - No changes were made');
      console.log(
        '   Run without --dry-run flag to perform actual migration\n',
      );
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
runEnvMigration()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
