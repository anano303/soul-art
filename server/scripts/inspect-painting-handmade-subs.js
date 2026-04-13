#!/usr/bin/env node
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PAINT = '68768f6f0b55154655a8e882';
const HAND = '68768f850b55154655a8e88f';

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const subs = await db
    .collection('subcategories')
    .find(
      {
        $or: [
          { category: new ObjectId(PAINT) },
          { parentCategory: new ObjectId(PAINT) },
          { category: new ObjectId(HAND) },
          { parentCategory: new ObjectId(HAND) },
        ],
      },
      { projection: { _id: 1, name: 1, nameEn: 1, category: 1, parentCategory: 1 } },
    )
    .toArray();

  console.log('SUBS', subs.length);
  for (const s of subs) {
    console.log(
      String(s._id),
      '|',
      s.name || '',
      '|',
      s.nameEn || '',
      '| parent',
      String(s.category || s.parentCategory || ''),
    );
  }

  await client.close();
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
