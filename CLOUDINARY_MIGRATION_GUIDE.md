# Cloudinary Migration Guide

## 📋 Overview

This guide describes how to migrate all images, videos, and other assets between Cloudinary accounts using a **runtime URL transformation approach** (no database changes needed).

## �️ Admin Panel (Recommended)

The easiest way to manage Cloudinary migrations is through the **Admin Panel**:

1. Go to `/admin/cloudinary` in your browser
2. Enter new Cloudinary credentials
3. Click "Validate Credentials" to test
4. Click "Start Migration" to begin copying assets
5. Monitor progress in real-time with polling updates

The admin panel provides:
- ✅ Real-time migration progress
- ✅ Cancel and resume capabilities
- ✅ History of retired cloud names
- ✅ Encrypted credential storage

## �🔄 Migration History

| Version | Cloud Name | Status |
|---------|-----------|--------|
| v1 | `dsufx8uzd` | ❌ Old (URLs in DB, account closed) |
| v2 | `dwfqjtdu2` | ⚠️ Previous (assets still accessible) |
| v3 | `dmvh7vwpu` | ✅ **Current** (new account) |

## 🎯 Migration Strategy

We use a **runtime URL transformation** approach:

1. **Copy assets** from old account to new account (same public_id/folder structure)
2. **CloudinaryUrlInterceptor** transforms URLs in API responses automatically
3. **No database changes** - DB keeps original URLs, interceptor swaps them

### Why This Approach?

- ✅ Zero downtime migration
- ✅ No database modifications
- ✅ Easy rollback (just disable interceptor)
- ✅ Supports multiple old cloud names
- ✅ Works for all collections automatically

## 📊 Collections Checked

The migration scripts check these MongoDB collections:

- **Products** - `images`, `thumbnail`, `brandLogo`
- **Users** - `profileImagePath`, `storeLogo`, `storeLogoPath`, `artistCoverImage`, `artistGallery`
- **Banners** - `imageUrl`
- **Blog Posts** - `coverImage`, `images`
- **Portfolio Posts** - `images[].url`
- **Forums** - `imagePath`
- **Categories** - `image`

## 🚀 Migration Process

### Step 1: Update Credentials

Update `.env` with new Cloudinary credentials:

```env
CLOUDINARY_CLOUD_NAME=dmvh7vwpu
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Step 2: Run Dry-Run Check

```bash
cd server
npm run cloudinary:copy:dry-run
```

This shows:
- How many URLs need to be copied
- Sample URLs that would be migrated
- No actual changes are made

### Step 3: Copy Assets

```bash
npm run cloudinary:copy
```

This script:
1. Loads progress from `.cloudinary-migration-progress.json` (if exists and matches current destination)
2. Finds all URLs with old cloud names in MongoDB
3. Downloads from latest old account (older URLs are fetched from latest old since same public_id)
4. Uploads to new account with same folder/public_id structure
5. Skips already uploaded assets (using progress file or API check)
6. Saves progress every 10 uploads (resumable!)
7. Shows detailed progress

⚠️ **Note**: The progress file includes the destination cloud name. If you change the destination, the old progress file will be ignored automatically.

### Step 4: Update Interceptor

The `CloudinaryUrlInterceptor` is already configured at:
`server/src/interceptors/cloudinary-url.interceptor.ts`

```typescript
// All previous cloud names that should be replaced (oldest first, latest old last)
private readonly OLD_CLOUD_NAMES = ['dsufx8uzd', 'dwfqjtdu2'];
private readonly NEW_CLOUD_NAME = 'dmvh7vwpu';
```

### Step 5: Deploy

Deploy the server with:
1. Updated `.env` credentials
2. Updated `CloudinaryUrlInterceptor` cloud names

All API responses will automatically serve URLs from the new account.

## 📝 Available Scripts

```bash
# Check how many URLs need migration
npm run cloudinary:check

# Preview what will be copied (no changes)
npm run cloudinary:copy:dry-run

# Copy all assets to new account
npm run cloudinary:copy

# Delete all assets from current account (dangerous!)
npm run cloudinary:delete:dry-run
npm run cloudinary:delete
```

## 🔧 CloudinaryUrlInterceptor

Located at: `server/src/interceptors/cloudinary-url.interceptor.ts`

This interceptor:
- Runs on all API responses
- Recursively finds Cloudinary URLs in response data
- Replaces old cloud names with new cloud name
- Handles arrays, nested objects, Mongoose documents
- **Reads cloud names from database** (with fallback to hardcoded values)
- **Caches for 1 minute** to avoid DB queries on every request

### Database Collections

The migration system uses these collections:

| Collection | Purpose |
|------------|---------|
| `cloudinary_config` | Active Cloudinary credentials (encrypted) |
| `retired_clouds` | History of retired cloud names |
| `cloudinary_migrations` | Migration status & progress |
| `migrated_files` | Tracks individual migrated files |

### Adding New Old Cloud Names (Legacy - CLI only)

To add support for migrating from another account, update **both** files:

**1. Interceptor** (`server/src/interceptors/cloudinary-url.interceptor.ts`):
```typescript
private readonly OLD_CLOUD_NAMES = ['dsufx8uzd', 'dwfqjtdu2', 'new-old-cloud'];
private readonly NEW_CLOUD_NAME = 'dmvh7vwpu';
```

**2. Migration Script** (`server/src/scripts/copy-cloudinary-assets.ts`):
```typescript
const CLOUD_NAMES = ['dsufx8uzd', 'dwfqjtdu2', 'new-old-cloud'];
const NEW_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dmvh7vwpu';
```

**3. Check Script** (`server/src/scripts/check-cloudinary-urls.ts`):
```typescript
const CLOUD_NAMES = ['dsufx8uzd', 'dwfqjtdu2', 'new-old-cloud'];
const NEW_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dmvh7vwpu';
```

> **Important**: Keep cloud names in order - oldest first, latest old last. The migration script fetches from the **latest old** account.

## 📁 Folder Structure in Cloudinary

Assets are organized in these folders:

- `ecommerce/` - Product images (with transformations)
- `products/` - Product images (raw)
- `users/` - User profile images
- `banners/` - Banner images
- `blog/` - Blog post images
- `categories/` - Category images
- `artist-gallery/` - Artist gallery images

## ⚠️ Important Notes

1. **v1 URLs in DB**: The database still contains v1 (`dsufx8uzd`) URLs, but:
   - v1 account is closed (returns 401)
   - Assets exist in v2 with same public_id
   - Script fetches from v2 when it sees v1 URLs

2. **Interceptor is required**: Without the interceptor, old URLs in DB won't work

3. **New uploads**: New uploads go directly to the new account with new credentials

4. **Rate limits**: Cloudinary has API rate limits. If you hit them, wait and retry.

## 🔄 Future Migrations

### Option 1: Admin Panel (Recommended)

1. Go to `/admin/cloudinary`
2. Enter new Cloudinary credentials
3. Click "Validate Credentials"
4. Click "Start Migration"
5. Wait for completion (monitor progress in real-time)
6. Done! The interceptor reads from DB automatically.

### Option 2: CLI Scripts (Legacy)

For the next migration:

1. **Update scripts** - Add current cloud name to arrays:
   - `copy-cloudinary-assets.ts` → `CLOUD_NAMES`
   - `check-cloudinary-urls.ts` → `CLOUD_NAMES`
   - `cloudinary-url.interceptor.ts` → `OLD_CLOUD_NAMES`

2. **Update `.env`** with new Cloudinary credentials

3. **Delete progress file** to start fresh:
   ```bash
   rm server/.cloudinary-migration-progress.json
   ```

4. **Run migration**:
   ```bash
   npm run cloudinary:copy
   ```

5. **Deploy** with new credentials

## 🛟 Troubleshooting

### Images not showing

1. Check if asset exists in new Cloudinary dashboard
2. Check browser Network tab for actual URL being requested
3. Verify interceptor is loaded in `app.module.ts`

### Rate Limit Exceeded

```bash
# Wait 5-10 minutes and retry
npm run cloudinary:copy
```

### Authentication Failed

```bash
# Verify credentials
cat .env | grep CLOUDINARY
```

### Some assets 404

Run the copy again - it skips already copied assets:
```bash
npm run cloudinary:copy
```

### Migration stuck or need to restart fresh

Delete the progress file and run again:
```bash
rm server/.cloudinary-migration-progress.json
npm run cloudinary:copy
```

## 🔐 Security

Never share or commit:
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_ENCRYPTION_KEY` - Used to encrypt API secrets in database
- `.env` file

### Encryption

API secrets are encrypted using AES-256-CBC before storing in the database. The encryption key is derived from `CLOUDINARY_ENCRYPTION_KEY` in `.env`.

```env
# Required for secure credential storage
CLOUDINARY_ENCRYPTION_KEY=your-unique-encryption-key-here
```

⚠️ **Important**: Use a unique, strong key for production. If you change this key, existing encrypted secrets will become unreadable.
