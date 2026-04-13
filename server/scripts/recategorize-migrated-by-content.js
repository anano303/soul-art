const { MongoClient, ObjectId } = require('mongodb');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const GRAPH_API = 'https://graph.facebook.com/v19.0';
const PAGE_ID = process.env.FACEBOOK_POSTS_PAGE_ID || process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_POSTS_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const MAX_SCAN = 700;

// Covers this migration session window only.
const MIGRATION_START = new Date('2026-04-01T00:00:00.000Z');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractProductIdsFromText(text) {
  const ids = [];
  if (!text) return ids;
  const matches = text.matchAll(/soulart\.ge\/products?\/([a-f0-9]{24})/gi);
  for (const m of matches) ids.push(m[1].toLowerCase());
  return ids;
}

async function fetchPosts(after = null) {
  const url = new URL(`${GRAPH_API}/${PAGE_ID}/published_posts`);
  url.searchParams.set('access_token', ACCESS_TOKEN);
  url.searchParams.set('limit', '100');
  url.searchParams.set('fields', 'id,message,created_time');
  if (after) url.searchParams.set('after', after);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { data } = await axios.get(url.toString(), { timeout: 30000 });
      if (data.error) throw new Error(data.error.message);
      return data;
    } catch (e) {
      await sleep((attempt + 1) * 1500);
      if (attempt === 4) throw e;
    }
  }
}

async function fetchComments(postId) {
  try {
    const { data } = await axios.get(`${GRAPH_API}/${postId}/comments`, {
      params: { access_token: ACCESS_TOKEN, limit: 100 },
      timeout: 30000,
    });
    return data.data || [];
  } catch {
    return [];
  }
}

function hasAny(text, keywords) {
  return keywords.some((k) => text.includes(k));
}

function chooseCategoryAndSubcategory(text) {
  const t = (text || '').toLowerCase();

  if (
    hasAny(t, [
      'ხელნაკეთი',
      'handmade',
      'სამკაულ',
      'jewel',
      'სამაჯურ',
      'ყელსაბამ',
      'ბეჭედ',
      'საყურ',
      'კერამ',
      'ceramic',
      'თიხ',
      'clay',
      'ხის',
      'wood',
      'დეკორ',
      'decor',
      'სანთ',
      'candle',
      'სუფრა',
      'tablecloth',
      'თოჯინა',
      'doll',
      'დანა',
      'knife',
      'ხანჯალ',
      'dagger',
      'ყანწ',
    ])
  ) {
    if (hasAny(t, ['სამკაულ', 'jewel', 'სამაჯურ', 'ყელსაბამ', 'ბეჭედ', 'საყურ'])) {
      return { categoryName: 'ხელნაკეთი ნივთები', categoryEn: 'Handmade', subcategoryName: 'სამკაულები' };
    }
    if (hasAny(t, ['კერამ', 'ceramic'])) {
      return { categoryName: 'ხელნაკეთი ნივთები', categoryEn: 'Handmade', subcategoryName: 'კერამიკა' };
    }
    if (hasAny(t, ['თიხ', 'clay'])) {
      return { categoryName: 'ხელნაკეთი ნივთები', categoryEn: 'Handmade', subcategoryName: 'თიხა' };
    }
    if (hasAny(t, ['ხის', 'wood'])) {
      return { categoryName: 'ხელნაკეთი ნივთები', categoryEn: 'Handmade', subcategoryName: 'ხის ნაკეთობები' };
    }
    if (hasAny(t, ['სანთ', 'candle'])) {
      return { categoryName: 'ხელნაკეთი ნივთები', categoryEn: 'Handmade', subcategoryName: 'სანთლები' };
    }
    if (hasAny(t, ['დეკორ', 'decor'])) {
      return { categoryName: 'ხელნაკეთი ნივთები', categoryEn: 'Handmade', subcategoryName: 'დეკორი' };
    }
    if (hasAny(t, ['სუფრა', 'tablecloth', 'ტექსტილ', 'textile'])) {
      return { categoryName: 'ხელნაკეთი ნივთები', categoryEn: 'Handmade', subcategoryName: 'სუფრა' };
    }
    if (hasAny(t, ['თოჯინა', 'doll'])) {
      return { categoryName: 'ხელნაკეთი ნივთები', categoryEn: 'Handmade', subcategoryName: 'თოჯინები' };
    }
    if (hasAny(t, ['დანა', 'knife'])) {
      return { categoryName: 'ხელნაკეთი ნივთები', categoryEn: 'Handmade', subcategoryName: 'დანები' };
    }
    if (hasAny(t, ['ხანჯალ', 'dagger'])) {
      return { categoryName: 'ხელნაკეთი ნივთები', categoryEn: 'Handmade', subcategoryName: 'ხანჯლები' };
    }
    if (hasAny(t, ['ყანწ'])) {
      return { categoryName: 'ხელნაკეთი ნივთები', categoryEn: 'Handmade', subcategoryName: 'ყანწი' };
    }

    return { categoryName: 'ხელნაკეთი ნივთები', categoryEn: 'Handmade', subcategoryName: 'სხვა' };
  }

  if (hasAny(t, ['ციფრული', 'digital'])) {
    return { categoryName: 'ნახატები', categoryEn: 'Painting', subcategoryName: 'ციფრული' };
  }
  if (hasAny(t, ['ანიმაც', 'cartoon'])) {
    return { categoryName: 'ნახატები', categoryEn: 'Painting', subcategoryName: 'ანიმაციური' };
  }
  if (hasAny(t, ['ილუსტრ', 'illustration', 'გრაფიკ', 'graphic'])) {
    return { categoryName: 'ნახატები', categoryEn: 'Painting', subcategoryName: 'გრაფიკა' };
  }
  if (hasAny(t, ['ყვავ', 'flower', 'ვარდ', 'იასამ', 'ტიტა'])) {
    return { categoryName: 'ნახატები', categoryEn: 'Painting', subcategoryName: 'ყვავილები' };
  }
  if (hasAny(t, ['პორტრეტ', 'portrait', 'სახე', 'გოგონა', 'ქალი', 'კაცი', 'ბიჭ'])) {
    return { categoryName: 'ნახატები', categoryEn: 'Painting', subcategoryName: 'პორტრეტი' };
  }
  if (hasAny(t, ['პეიზაჟ', 'landscape', 'ზღვა', 'მთა', 'ქალაქ', 'სოფელ', 'ტყე', 'მინდორ', 'ბუნება'])) {
    return { categoryName: 'ნახატები', categoryEn: 'Painting', subcategoryName: 'პეიზაჟი' };
  }
  if (hasAny(t, ['აბსტრაქ', 'abstract'])) {
    return { categoryName: 'ნახატები', categoryEn: 'Painting', subcategoryName: 'აბსტრაქცია' };
  }

  return { categoryName: 'ნახატები', categoryEn: 'Painting', subcategoryName: 'აბსტრაქცია' };
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const categoriesCol = db.collection('categories');
  const subcategoriesCol = db.collection('subcategories');
  const productsCol = db.collection('products');

  const paintingsCategory = await categoriesCol.findOne({
    $or: [{ name: 'ნახატები' }, { nameEn: /paint/i }],
  });
  if (!paintingsCategory) throw new Error('Paintings category not found');

  const handmadeCategory = await categoriesCol.findOne({
    $or: [{ name: /ხელნაკეთ/i }, { nameEn: /handmade/i }],
  });
  if (!handmadeCategory) throw new Error('Handmade category not found');

  const allNeededSubNames = [
    'აბსტრაქცია',
    'პეიზაჟი',
    'პორტრეტი',
    'ანიმაციური',
    'გრაფიკა',
    'ყვავილები',
    'ციფრული',
    'კერამიკა',
    'ხის ნაკეთობები',
    'სამკაულები',
    'სანთლები',
    'თიხა',
    'დეკორი',
    'სუფრა',
    'თოჯინები',
    'დანები',
    'ხანჯლები',
    'ყანწი',
    'სხვა',
  ];

  const allSubs = await subcategoriesCol
    .find({
      $or: [
        { category: paintingsCategory._id },
        { parentCategory: paintingsCategory._id },
        { category: handmadeCategory._id },
        { parentCategory: handmadeCategory._id },
        { name: { $in: allNeededSubNames } },
      ],
    })
    .toArray();

  const subByName = new Map();
  for (const sub of allSubs) {
    if (sub?.name) subByName.set(sub.name, sub._id);
  }

  if (!subByName.has('აბსტრაქცია')) {
    throw new Error('Abstraction subcategory not found');
  }
  if (!subByName.has('სხვა')) {
    throw new Error('Other handmade subcategory not found');
  }

  // 1) Gather all FB product IDs from posts + comments
  const fbIds = new Set();
  let after = null;
  let scanned = 0;

  while (scanned < MAX_SCAN) {
    const data = await fetchPosts(after);
    const posts = data.data || [];
    if (!posts.length) break;

    for (const post of posts) {
      scanned++;

      extractProductIdsFromText(post.message).forEach((id) => fbIds.add(id));

      const comments = await fetchComments(post.id);
      for (const c of comments) {
        extractProductIdsFromText(c.message).forEach((id) => fbIds.add(id));
      }
    }

    if (data.paging?.cursors?.after && scanned < MAX_SCAN) {
      after = data.paging.cursors.after;
    } else {
      break;
    }
  }

  const fbObjectIds = [...fbIds].map((id) => new ObjectId(id));

  // 2) Only products likely migrated in this session
  const migratedProducts = await productsCol
    .find({
      _id: { $in: fbObjectIds },
      updatedAt: { $gte: MIGRATION_START },
    })
    .toArray();

  let updated = 0;
  const subStats = {};

  for (const product of migratedProducts) {
    const content = [
      product.name || '',
      product.description || '',
      ...(Array.isArray(product.hashtags) ? product.hashtags : []),
    ].join(' ');

    const selected = chooseCategoryAndSubcategory(content);
    const selectedMain = selected.categoryName === 'ხელნაკეთი ნივთები' ? handmadeCategory : paintingsCategory;
    const fallbackSubName = selected.categoryName === 'ხელნაკეთი ნივთები' ? 'სხვა' : 'აბსტრაქცია';
    const subId = subByName.get(selected.subcategoryName) || subByName.get(fallbackSubName);

    await productsCol.updateOne(
      { _id: product._id },
      {
        $set: {
          category: selected.categoryName,
          mainCategory: selectedMain._id,
          mainCategoryEn: selected.categoryEn,
          subCategory: subId,
          subCategoryEn: selected.subcategoryName,
        },
      },
    );

    updated++;
    const statKey = `${selected.categoryName} / ${selected.subcategoryName}`;
    subStats[statKey] = (subStats[statKey] || 0) + 1;
  }

  // 3) Duplicate-by-ID check for the same migrated set
  const duplicateById = await productsCol
    .aggregate([
      {
        $match: {
          _id: { $in: fbObjectIds },
          updatedAt: { $gte: MIGRATION_START },
        },
      },
      { $group: { _id: '$_id', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'duplicates' },
    ])
    .toArray();

  console.log('SUMMARY', {
    scannedPosts: scanned,
    fbLinkedProductIds: fbIds.size,
    migratedProductsFound: migratedProducts.length,
    updated,
    subcategoryBreakdown: subStats,
    duplicateProductIds: duplicateById[0]?.duplicates || 0,
  });

  await client.close();
}

main().catch((error) => {
  console.error('Fatal:', error.message);
  process.exit(1);
});
