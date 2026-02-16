/**
 * Translate product names and descriptions to English using Gemini AI
 *
 * Usage: node scripts/translate-products.js
 *
 * This script:
 * 1. Finds all products that have a Georgian name but no English name (nameEn)
 * 2. Uses Gemini AI to translate name and description to English
 * 3. Updates the products in the database
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is required');
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is required');
  process.exit(1);
}

async function translateWithGemini(text) {
  if (!text || text.trim() === '') return '';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Translate the following Georgian text to English. Only return the translation, nothing else. If the text is already in English, return it as-is. If you can't translate it, return the original text.\n\nText: ${text}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return translated || text;
}

async function main() {
  console.log('🔄 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db();
  const products = db.collection('products');

  // Find products without nameEn
  const toTranslate = await products
    .find({
      $or: [{ nameEn: { $exists: false } }, { nameEn: null }, { nameEn: '' }],
    })
    .toArray();

  console.log(`📦 Found ${toTranslate.length} products without English name`);

  let translated = 0;
  let errors = 0;

  for (const product of toTranslate) {
    try {
      console.log(`\n🔄 Translating: "${product.name}" (${product._id})`);

      // Translate name
      const nameEn = await translateWithGemini(product.name);
      console.log(`  ✅ Name: "${product.name}" → "${nameEn}"`);

      const update = { nameEn };

      // Translate description if it exists and descriptionEn is empty
      if (
        product.description &&
        (!product.descriptionEn || product.descriptionEn === '')
      ) {
        // Wait a bit to avoid rate limiting
        await new Promise((r) => setTimeout(r, 500));
        const descriptionEn = await translateWithGemini(product.description);
        update.descriptionEn = descriptionEn;
        console.log(
          `  ✅ Description translated (${descriptionEn.substring(0, 50)}...)`,
        );
      }

      await products.updateOne({ _id: product._id }, { $set: update });

      translated++;

      // Rate limit - wait between requests
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ❌ Error translating "${product.name}": ${err.message}`);
      errors++;
      // Wait longer on error (might be rate limited)
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log(`\n✅ Done! Translated: ${translated}, Errors: ${errors}`);

  await client.close();
}

main().catch(console.error);
