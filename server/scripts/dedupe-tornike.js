const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const USER_ID = '68e8fe72f10079410087add2';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeDimensions(dimensions) {
  if (!dimensions || typeof dimensions !== 'object') return '';
  const width = Number(dimensions.width || 0);
  const height = Number(dimensions.height || 0);
  const depth = Number(dimensions.depth || 0);
  const unit = String(dimensions.unit || 'cm').trim().toLowerCase();
  return `${width}|${height}|${depth}|${unit}`;
}

function keyOf(p) {
  return [
    normalizeText(p.name),
    Number(p.price || 0),
    normalizeText(p.description),
    normalizeDimensions(p.dimensions),
  ].join('__');
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const col = db.collection('products');

  const uid = new ObjectId(USER_ID);
  const docs = await col.find({ user: uid }).sort({ createdAt: 1, _id: 1 }).toArray();
  const seen = new Map();
  const dupeIds = [];

  for (const doc of docs) {
    const key = keyOf(doc);
    if (seen.has(key)) {
      dupeIds.push(doc._id);
    } else {
      seen.set(key, doc._id);
    }
  }

  let deleted = 0;
  if (dupeIds.length) {
    const res = await col.deleteMany({ _id: { $in: dupeIds } });
    deleted = res.deletedCount;
  }

  const finalCount = await col.countDocuments({ user: uid });
  console.log('initial:', docs.length);
  console.log('deleted_duplicates:', deleted);
  console.log('final:', finalCount);

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
