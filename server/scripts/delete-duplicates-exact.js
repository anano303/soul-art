const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env'),
});

const MONGODB_URI = process.env.MONGODB_URI;
const TARGET_USER_IDS = [
  '69d5f81b3b0ca78dc71c1e19', // giga-art
  '6912f0db231e458e759a80c3', // natiajanturidze
];

function normalizeText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function normalizeDimensions(dimensions) {
  if (!dimensions || typeof dimensions !== 'object') return '';
  const width = Number(dimensions.width || 0);
  const height = Number(dimensions.height || 0);
  const depth = Number(dimensions.depth || 0);
  const unit = (dimensions.unit || 'cm').toString().trim().toLowerCase();
  return `${width}|${height}|${depth}|${unit}`;
}

function dedupeKey(product) {
  const name = normalizeText(product.name);
  const price = Number(product.price || 0);
  const description = normalizeText(product.description);
  const dims = normalizeDimensions(product.dimensions);
  return `${name}__${price}__${description}__${dims}`;
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db();
  const products = db.collection('products');

  let totalDeleted = 0;

  for (const userId of TARGET_USER_IDS) {
    const uid = new ObjectId(userId);
    const docs = await products
      .find({ user: uid })
      .sort({ createdAt: 1, _id: 1 })
      .toArray();

    const seen = new Map();
    const duplicateIds = [];

    for (const doc of docs) {
      const key = dedupeKey(doc);
      if (seen.has(key)) {
        duplicateIds.push(doc._id);
      } else {
        seen.set(key, doc._id);
      }
    }

    if (duplicateIds.length > 0) {
      const result = await products.deleteMany({ _id: { $in: duplicateIds } });
      totalDeleted += result.deletedCount;
      console.log(`user ${userId}: deleted ${result.deletedCount} duplicates`);
    } else {
      console.log(`user ${userId}: no duplicates found`);
    }

    const remaining = await products.countDocuments({ user: uid });
    console.log(`user ${userId}: remaining ${remaining}`);
  }

  console.log(`total deleted: ${totalDeleted}`);
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
