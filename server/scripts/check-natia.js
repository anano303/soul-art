const { MongoClient } = require('mongodb');
const MONGODB_URI =
  'mongodb+srv://soulartgeorgia_db_user:hzO24rdfnjaT6kWI@soulart.gacy33l.mongodb.net/?appName=SoulArt';
const PAGE_ID = '542501458957000';
const ACCESS_TOKEN =
  'EAAh5uzqZCKRIBP22uG9wc5sKNWz53S9gfuRzehCmVDcZAX6grP5X9XHU0eNY7wNoos9vXKc9Toq4qN2tXioAiGwalBZC93NQOj4u4nCE4doJQ2Rwp9HPH5Md4jUD0qIZAHoNoVjBHNZBa7xZCeByKykCXzxhe8ZAZCwSUupRku3qqiWv7vdUe068UX8ZBoutrK7n6ZAaBi';

async function main() {
  // 1. Find user in DB
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  let user = await db
    .collection('users')
    .findOne({ artistSlug: 'natiajanturidze' });
  if (!user) {
    console.log('Exact slug not found, searching with regex...');
    const matches = await db
      .collection('users')
      .find({
        $or: [
          { artistSlug: { $regex: /natia/i } },
          { name: { $regex: /natia/i } },
          { storeName: { $regex: /natia/i } },
        ],
      })
      .project({ name: 1, artistSlug: 1, storeName: 1, email: 1 })
      .toArray();
    console.log('Matches:', matches);
  } else {
    console.log(
      'User found:',
      user.name,
      '| slug:',
      user.artistSlug,
      '| id:',
      user._id,
    );
    console.log('storeName:', user.storeName);
    const cnt = await db
      .collection('products')
      .countDocuments({ user: user._id });
    console.log('Current products:', cnt);
  }

  // 2. Check FB posts for this artist
  console.log('\n--- Checking FB posts ---');
  const url = new URL(
    `https://graph.facebook.com/v19.0/${PAGE_ID}/published_posts`,
  );
  url.searchParams.set('access_token', ACCESS_TOKEN);
  url.searchParams.set('limit', '100');
  url.searchParams.set('fields', 'id,message,created_time');

  let found = [];
  let after = null;
  let scanned = 0;
  while (true) {
    const u2 = new URL(url.toString());
    if (after) u2.searchParams.set('after', after);
    const res = await fetch(u2.toString());
    const data = await res.json();
    if (data.error) {
      console.log('FB error:', data.error.message);
      break;
    }
    if (!data.data || data.data.length === 0) break;
    for (const p of data.data) {
      scanned++;
      if (p.message && p.message.toLowerCase().includes('natiajanturidze')) {
        found.push(p);
      }
    }
    if (found.length > 0 && found.length > 3) {
      // Show first few
      console.log(`Scanned ${scanned}, found ${found.length} so far...`);
    }
    if (data.paging?.cursors?.after && data.data.length > 0) {
      after = data.paging.cursors.after;
    } else break;
  }

  console.log(
    `\nTotal scanned: ${scanned}, found: ${found.length} posts with "natiajanturidze"`,
  );

  // Show first 2 posts
  for (let i = 0; i < Math.min(2, found.length); i++) {
    console.log(`\n--- Post ${i + 1} (${found[i].created_time}) ---`);
    console.log(found[i].message);
  }

  await client.close();
}
main().catch(console.error);
