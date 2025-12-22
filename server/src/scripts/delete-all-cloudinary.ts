import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const NEW_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dmvh7vwpu';

// Configure new Cloudinary account
cloudinary.config({
  cloud_name: NEW_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Delete all resources from Cloudinary account
 */
async function deleteAllResources() {
  const dryRun = process.argv.includes('--dry-run');
  
  if (dryRun) {
    console.log('🧪 RUNNING IN DRY-RUN MODE - No deletions will be performed\n');
  }

  console.log('⚠️  WARNING: This will delete ALL resources from Cloudinary account!');
  console.log(`   Cloud: ${NEW_CLOUD_NAME}\n`);
  console.log('='.repeat(80) + '\n');

  try {
    let totalDeleted = 0;
    const resourceTypes = ['image', 'video', 'raw'];

    for (const resourceType of resourceTypes) {
      console.log(`🗑️  Checking ${resourceType} resources...`);
      
      let hasMore = true;
      let nextCursor: string | undefined = undefined;

      while (hasMore) {
        try {
          const result = await cloudinary.api.resources({
            resource_type: resourceType as any,
            type: 'upload',
            max_results: 500,
            next_cursor: nextCursor,
          });

          const resources = result.resources || [];
          console.log(`   Found ${resources.length} ${resourceType} resources`);

          if (resources.length === 0) {
            hasMore = false;
            continue;
          }

          if (!dryRun) {
            // Delete resources in batches of 100 (Cloudinary API limit)
            const publicIds = resources.map((r: any) => r.public_id);
            
            if (publicIds.length > 0) {
              console.log(`   Deleting ${publicIds.length} resources in batches...`);
              
              // Split into batches of 100
              const batchSize = 100;
              for (let i = 0; i < publicIds.length; i += batchSize) {
                const batch = publicIds.slice(i, i + batchSize);
                console.log(`      Batch ${Math.floor(i / batchSize) + 1}: Deleting ${batch.length} resources...`);
                
                await cloudinary.api.delete_resources(batch, {
                  resource_type: resourceType as any,
                  type: 'upload',
                });
                
                totalDeleted += batch.length;
              }
              
              console.log(`   ✅ Deleted ${publicIds.length} resources`);
            }
          } else {
            console.log(`   [DRY RUN] Would delete ${resources.length} resources`);
            totalDeleted += resources.length;
          }

          nextCursor = result.next_cursor;
          hasMore = !!nextCursor;

        } catch (error: any) {
          if (error.http_code === 404) {
            hasMore = false;
          } else {
            throw error;
          }
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 DELETION SUMMARY');
    console.log('='.repeat(80));
    console.log(`${dryRun ? 'Would delete' : 'Deleted'}: ${totalDeleted} resources`);
    console.log('='.repeat(80) + '\n');

    if (!dryRun) {
      console.log('✅ Cleanup completed!');
      console.log('📌 Now you can run: npm run cloudinary:copy');
      console.log('   to upload all assets with proper folder structure\n');
    }

  } catch (error) {
    console.error('❌ Deletion failed:', error);
    throw error;
  }
}

// Run deletion
deleteAllResources()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
