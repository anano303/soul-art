const { MongoClient, ObjectId } = require('mongodb');
const MONGODB_URI =
  'mongodb+srv://soulartgeorgia_db_user:hzO24rdfnjaT6kWI@soulart.gacy33l.mongodb.net/?appName=SoulArt';

const PAGE_ID = '542501458957000';
const ACCESS_TOKEN =
  'EAAh5uzqZCKRIBP22uG9wc5sKNWz53S9gfuRzehCmVDcZAX6grP5X9XHU0eNY7wNoos9vXKc9Toq4qN2tXioAiGwalBZC93NQOj4u4nCE4doJQ2Rwp9HPH5Md4jUD0qIZAHoNoVjBHNZBa7xZCeByKykCXzxhe8ZAZCwSUupRku3qqiWv7vdUe068UX8ZBoutrK7n6ZAaBi';

async function main() {
  // Fetch a few gskkart posts to see the raw message format
  const url = new URL(`https://graph.facebook.com/v19.0/${PAGE_ID}/posts`);
  url.searchParams.set('access_token', ACCESS_TOKEN);
  url.searchParams.set('limit', '5');
  url.searchParams.set('fields', 'id,message,created_time');

  const res = await fetch(url.toString());
  const data = await res.json();

  let count = 0;
  for (const post of data.data) {
    if (post.message && post.message.toLowerCase().includes('gskkart')) {
      count++;
      console.log(`\n========== POST ${count} ==========`);
      console.log(post.message);
      console.log(`============================\n`);
      if (count >= 3) break;
    }
  }

  // Also show what's in DB now
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const userId = new ObjectId('69d5f81b3b0ca78dc71c1e19');
  const products = await db
    .collection('products')
    .find({ user: userId })
    .project({ name: 1, description: 1 })
    .limit(5)
    .toArray();

  console.log('\n========== DB PRODUCTS (first 5) ==========');
  for (const p of products) {
    console.log(`Name: "${p.name}"`);
    console.log(`Desc: "${p.description?.substring(0, 120)}..."`);
    console.log('---');
  }

  await client.close();
}
main().catch(console.error);
