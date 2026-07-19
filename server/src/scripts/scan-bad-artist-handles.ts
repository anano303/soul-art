/**
 * READ-ONLY scan. Finds artist profiles whose handle/slug/store fields look like
 * they contain a full URL (e.g. "@httpswwwinstagramcomartekoek") instead of a
 * clean handle. Does NOT modify anything — only prints a list for manual review.
 *
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/scan-bad-artist-handles.ts
 */
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

// Signals that a value is a URL rather than a clean handle.
const URL_SIGNALS = /(https?|www\.?|instagram|facebook|\.com|\.ge|tiktok|\/\/)/i;

function looksLikeUrl(value?: string | null): boolean {
  if (!value) return false;
  return URL_SIGNALS.test(value);
}

async function scan() {
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const dbName = mongoUri.split('/').pop()?.split('?')[0] || 'test';
    const db = client.db(dbName);
    const users = db.collection('users');

    const sellers = await users
      .find(
        { role: { $in: ['seller', 'admin'] } },
        {
          projection: {
            _id: 1,
            email: 1,
            name: 1,
            storeName: 1,
            artistSlug: 1,
          },
        },
      )
      .toArray();

    const affected = sellers.filter(
      (u) =>
        looksLikeUrl(u.artistSlug) ||
        looksLikeUrl(u.storeName) ||
        looksLikeUrl(u.name),
    );

    console.log(`\nScanned ${sellers.length} seller/admin profiles.`);
    console.log(`Found ${affected.length} with a URL-like handle/slug/name:\n`);

    for (const u of affected) {
      const bad: string[] = [];
      if (looksLikeUrl(u.artistSlug)) bad.push(`artistSlug="${u.artistSlug}"`);
      if (looksLikeUrl(u.storeName)) bad.push(`storeName="${u.storeName}"`);
      if (looksLikeUrl(u.name)) bad.push(`name="${u.name}"`);
      console.log(
        `- ${u._id} | ${u.email || '(no email)'} | ${bad.join(' | ')}`,
      );
    }
    console.log('\n(Read-only scan — no records were modified.)');
  } finally {
    await client.close();
  }
}

scan().catch((e) => {
  console.error(e);
  process.exit(1);
});
