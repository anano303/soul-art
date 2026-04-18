#!/usr/bin/env node
/**
 * Import FB products for Keto Chekurishvili (ketos-art)
 * Email: qeti.chekurishvili@gmail.com
 * Slug: ketos-art
 * 
 * Usage:
 *   node scripts/import-fb-keto-chekurishvili.js          # dry run
 *   node scripts/import-fb-keto-chekurishvili.js --apply   # real run
 */

const { MongoClient, ObjectId } = require('mongodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const path = require('path');
const axios = require('axios');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;
const PAGE_ID = process.env.FACEBOOK_POSTS_PAGE_ID || process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_POSTS_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const GRAPH_API = 'https://graph.facebook.com/v19.0';
const MAX_SCAN = 700;
const APPLY = process.argv.includes('--apply');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_BUCKET_NAME || 'soulart-s3';

const TARGET = {
  email: 'qeti.chekurishvili@gmail.com',
  slug: 'ketos-art',
  displayName: 'Keto Chekurishvili',
  displayNameGe: 'ქეთო ჩეკურიშვილი',
};

// Category IDs
const CATS = {
  paintings: '68768f6f0b55154655a8e882',
  handmade:  '68768f850b55154655a8e88f',
};
const SUBCATS = {
  'აბსტრაქცია':     { id: '68768f990b55154655a8e89d', cat: CATS.paintings, en: 'Abstraction',   catEn: 'Painting' },
  'პეიზაჟი':        { id: '68769d0ba7672efd3181125a', cat: CATS.paintings, en: 'Landscape',     catEn: 'Painting' },
  'პორტრეტი':       { id: '68769d2da7672efd31811268', cat: CATS.paintings, en: 'Portrait',      catEn: 'Painting' },
  'ანიმაციური':     { id: '68769d44a7672efd31811277', cat: CATS.paintings, en: 'Animation',     catEn: 'Painting' },
  'გრაფიკა':        { id: '68769d59a7672efd31811285', cat: CATS.paintings, en: 'Graphics',      catEn: 'Painting' },
  'ციფრული':        { id: '68d8cd3f83c6d6636d570ec1', cat: CATS.paintings, en: 'Digital',       catEn: 'Painting' },
  'სხვა_ნახატი':    { id: '68d8cce983c6d6636d570e76', cat: CATS.paintings, en: 'Other',         catEn: 'Painting' },
  'კერამიკა':       { id: '6876c5a039d2cdf209e0f2d6', cat: CATS.handmade, en: 'Ceramics',      catEn: 'Handmade' },
  'ხის_ნაკეთობები': { id: '6876c54c39d2cdf209e0f2a9', cat: CATS.handmade, en: 'Wooden products', catEn: 'Handmade' },
  'სამკაულები':     { id: '6876ea6f39d2cdf209e0fa56', cat: CATS.handmade, en: 'Jewelry',       catEn: 'Handmade' },
  'თოჯინები':       { id: '68768fad0b55154655a8e8ab', cat: CATS.handmade, en: 'Dolls',         catEn: 'Handmade' },
  'ყვავილები':      { id: '6876c50c39d2cdf209e0f298', cat: CATS.handmade, en: 'Flowers',       catEn: 'Handmade' },
  'სანთლები':       { id: '6876c55f39d2cdf209e0f2b7', cat: CATS.handmade, en: 'Candles',       catEn: 'Handmade' },
  'თიხა':           { id: '6876c57739d2cdf209e0f2c6', cat: CATS.handmade, en: 'Clay',          catEn: 'Handmade' },
  'დეკორი':         { id: '6876c6c639d2cdf209e0f3b2', cat: CATS.handmade, en: 'Decor',         catEn: 'Handmade' },
  'ტექსტილი':       { id: '69cf7ef85bf5111ee8818a89', cat: CATS.handmade, en: 'Textile',       catEn: 'Handmade' },
  'დანები':         { id: '68ded8658443c8f8dbec5cae', cat: CATS.handmade, en: 'Knives',        catEn: 'Handmade' },
  'სხვა_ხელნაკეთი': { id: '68d8cd7c83c6d6636d570eea', cat: CATS.handmade, en: 'Others',       catEn: 'Handmade' },
};

function detectCategory(parsed) {
  const text = [parsed.name || '', parsed.description || '', (parsed.hashtags || []).join(' ')].join(' ').toLowerCase();
  const materialsText = (parsed.materials || []).join(' ').toLowerCase();
  const allText = text + ' ' + materialsText;
  const paintingMaterials = /ზეთი|ტილო|აკრილ|აკვარელ|oil|canvas|acrylic|watercolor|გუაშ|პასტელ|pastel|gouache/;
  const isPaintingByMaterial = paintingMaterials.test(materialsText);

  if (isPaintingByMaterial || /ნახატ|painting|paint|ფერწერ|მინიატურა/.test(allText)) {
    const signals = {
      'პეიზაჟი':    /პეიზაჟ|landscape|ბუნება|მთა|ზღვა|სოფელ|nature|mountain|sea|ტბა|lake/,
      'პორტრეტი':   /პორტრეტ|portrait|სახე|face|დედა|ქალი|ბავშვ|კაცი|ადამიან|გოგონა/,
      'აბსტრაქცია': /აბსტრაქ|abstract/,
      'ანიმაციური':  /ანიმაც|anime|cartoon|ანიმე|მულტ/,
      'გრაფიკა':    /გრაფიკ|graphic|sketch|ესკიზ|ტუში|ink|charcoal|ნახშირ/,
      'ციფრული':    /ციფრულ|digital|ipad|procreate|ილუსტრაც/,
    };
    for (const [sub, regex] of Object.entries(signals)) {
      if (regex.test(text)) {
        const sc = SUBCATS[sub];
        return { mainCategory: new ObjectId(sc.cat), mainCategoryEn: sc.catEn, subCategory: new ObjectId(sc.id), subCategoryEn: sc.en, category: 'ნახატები', detectedAs: sub };
      }
    }
    const sc = SUBCATS['სხვა_ნახატი'];
    return { mainCategory: new ObjectId(sc.cat), mainCategoryEn: sc.catEn, subCategory: new ObjectId(sc.id), subCategoryEn: sc.en, category: 'ნახატები', detectedAs: 'სხვა_ნახატი' };
  }

  const handmadeSignals = {
    'სამკაულები': /სამკაული|ბეჭედი|საყურე|სამაჯური|ყელსაბამი|bracelet|earring|necklace|ring|beads|მძივ/,
    'კერამიკა':   /კერამიკ|ceramic|თასი|ვაზა|ჭიქა|ჯამი|vase/,
    'ხის_ნაკეთობები': /ხის\s|ხისგან|wood|wooden/,
    'ყვავილები':   /ყვავილ|flower|ბუკეტ|საპნის\sყვავ/,
    'სანთლები':   /სანთელ|candle|სანთლ/,
    'თიხა':       /თიხ|clay|პოლიმერ/,
    'დეკორი':     /დეკორ|decor|კედლის|მაგნიტ|ჩარჩო|frame|ქოთანი|ხავს|საათ|clock|პანო/,
    'ტექსტილი':   /ტექსტილ|textile|ნაქსოვი|knit|crochet|ხელით\sნაქსოვი|ქსოვა/,
    'დანები':     /დანა|knife|ხანჯალ|dagger/,
  };
  for (const [sub, regex] of Object.entries(handmadeSignals)) {
    if (regex.test(allText)) {
      const sc = SUBCATS[sub];
      return { mainCategory: new ObjectId(sc.cat), mainCategoryEn: sc.catEn, subCategory: new ObjectId(sc.id), subCategoryEn: sc.en, category: 'ხელნაკეთი ნივთები', detectedAs: sub };
    }
  }

  if (parsed.dimensions && parsed.dimensions.width && parsed.dimensions.height && !parsed.dimensions.depth) {
    if (parsed.dimensions.width * parsed.dimensions.height > 200) {
      const sc = SUBCATS['სხვა_ნახატი'];
      return { mainCategory: new ObjectId(sc.cat), mainCategoryEn: sc.catEn, subCategory: new ObjectId(sc.id), subCategoryEn: sc.en, category: 'ნახატები', detectedAs: 'სხვა_ნახატი (2D)' };
    }
  }

  const sc = SUBCATS['სხვა_ხელნაკეთი'];
  return { mainCategory: new ObjectId(sc.cat), mainCategoryEn: sc.catEn, subCategory: new ObjectId(sc.id), subCategoryEn: sc.en, category: 'ხელნაკეთი ნივთები', detectedAs: 'სხვა_ხელნაკეთი' };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function normalizeSlug(s) { return String(s || '').trim().toLowerCase(); }

function extractAuthorSlug(message) {
  if (!message) return null;
  const lines = String(message).split('\n');
  const authorLine = lines.find(l => l.includes('✍️')) || '';
  const inParens = authorLine.match(/\(([^)]+)\)/);
  if (inParens && inParens[1]) return normalizeSlug(inParens[1]);
  const mention = String(message).match(/@([a-z0-9._-]+)/i);
  if (mention && mention[1]) return normalizeSlug(mention[1]);
  return null;
}

function extractOriginalProductId(text) {
  const match = String(text || '').match(/soulart\.ge\/products?\/([a-f0-9]{24})/i);
  return match ? match[1] : null;
}

function parsePostMessage(message) {
  const product = {};
  const text = String(message || '');
  const titleMatch = text.match(/📌\s*(.+)/);
  product.name = titleMatch ? titleMatch[1].trim() : 'უსათაურო';
  const lines = text.split('\n');
  const descLines = [];
  let foundAuthor = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('✍️')) { foundAuthor = true; continue; }
    if (!foundAuthor) continue;
    const isStructured = line.startsWith('✅') || line.startsWith('🖼️') || (line.startsWith('🎨') && line.includes('მასალა')) || line.startsWith('📏') || line.startsWith('💰') || line.startsWith('🔻') || line.startsWith('⏳') || line.startsWith('🔗') || line.startsWith('👤') || line.startsWith('#');
    const isDecorator = /^[\p{Emoji}\p{Emoji_Component}\uFE0F\u200D\s]+$/u.test(line) && line.length < 30;
    if (isStructured || isDecorator) break;
    descLines.push(line);
  }
  product.description = descLines.join('\n');
  product.isOriginal = text.includes('✅ ორიგინალი');
  const materialMatch = text.match(/🎨\s*მასალა:\s*(.+)/);
  product.materials = materialMatch ? materialMatch[1].split(',').map(s => s.trim()).filter(Boolean) : [];
  const dimMatch = text.match(/📏\s*ზომა:\s*([\d.]+)[×xX*]([\d.]+)(?:[×xX*]([\d.]+))?\s*სმ/i);
  if (dimMatch) {
    product.dimensions = { width: parseFloat(dimMatch[1]), height: parseFloat(dimMatch[2]) };
    if (dimMatch[3]) product.dimensions.depth = parseFloat(dimMatch[3]);
  }
  const priceMatch = text.match(/💰\s*ფასი:\s*([\d.]+)/);
  product.price = priceMatch ? parseFloat(priceMatch[1]) : 0;
  const discountMatch = text.match(/🔻\s*ფასდაკლება:\s*(\d+)%/);
  if (discountMatch) {
    product.discountPercentage = parseInt(discountMatch[1], 10);
    const oldPrice = text.match(/ძველი ფასი\s*([\d.]+)/);
    if (oldPrice) product.price = parseFloat(oldPrice[1]);
  }
  const hashtags = [];
  const tagRegex = /#([\p{L}\p{N}_-]+)/gu;
  let m;
  while ((m = tagRegex.exec(text)) !== null) hashtags.push(m[1]);
  product.hashtags = hashtags;
  return product;
}

function extractImages(post) {
  const images = [];
  const attachments = post.attachments?.data || [];
  for (const att of attachments) {
    const subs = att.subattachments?.data || [];
    for (const sub of subs) { if (sub.media?.image?.src) images.push(sub.media.image.src); }
    if (subs.length === 0 && att.media?.image?.src) images.push(att.media.image.src);
  }
  if (images.length === 0 && post.full_picture) images.push(post.full_picture);
  return images;
}

async function fetchPosts(after = null) {
  const url = new URL(`${GRAPH_API}/${PAGE_ID}/published_posts`);
  url.searchParams.set('access_token', ACCESS_TOKEN);
  url.searchParams.set('limit', '100');
  url.searchParams.set('fields', 'id,message,created_time,full_picture,attachments{media,subattachments{media}}');
  if (after) url.searchParams.set('after', after);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.error) { await sleep((attempt + 1) * 3000); continue; }
      return data;
    } catch { await sleep((attempt + 1) * 3000); }
  }
  throw new Error('Facebook API failed after 5 retries');
}

async function fetchAllPagePosts() {
  const allPosts = [];
  let after = null;
  let scanned = 0;
  process.stdout.write('Fetching FB posts');
  while (scanned < MAX_SCAN) {
    const data = await fetchPosts(after);
    if (!data.data || data.data.length === 0) break;
    for (const post of data.data) { allPosts.push(post); scanned++; }
    process.stdout.write('.');
    if (data.paging?.cursors?.after && data.data.length > 0 && scanned < MAX_SCAN) {
      after = data.paging.cursors.after;
      await sleep(120);
    } else break;
  }
  console.log(` (${allPosts.length})`);
  return allPosts;
}

async function fetchComments(postId) {
  try {
    const response = await axios.get(`${GRAPH_API}/${postId}/comments`, { params: { access_token: ACCESS_TOKEN, limit: 100 } });
    return response.data.data || [];
  } catch { return []; }
}

function downloadImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(imageUrl);
    const client = parsed.protocol === 'https:' ? https : http;
    client.get(imageUrl, { headers: { 'User-Agent': 'SoulArt/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return downloadImage(res.headers.location).then(resolve).catch(reject);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function uploadToS3(buffer, key) {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: 'image/jpeg' }));
  return `https://${BUCKET}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${key}`;
}

// Simple Georgian-to-English translation for product names
function translateName(geName) {
  const translations = {
    'უსათაურო': 'Untitled',
    'ნახატი': 'Painting',
    'აბსტრაქცია': 'Abstraction',
    'პეიზაჟი': 'Landscape',
    'პორტრეტი': 'Portrait',
    'ყვავილები': 'Flowers',
    'ზღვა': 'Sea',
    'მთა': 'Mountain',
    'ქალაქი': 'City',
    'ბუნება': 'Nature',
    'კერამიკა': 'Ceramics',
  };
  for (const [ge, en] of Object.entries(translations)) {
    if (geName.toLowerCase().includes(ge)) return en;
  }
  return '';
}

// Translate materials
function translateMaterials(materials) {
  const matMap = {
    'ზეთი': 'Oil', 'ტილო': 'Canvas', 'აკრილი': 'Acrylic', 'აკვარელი': 'Watercolor',
    'გუაში': 'Gouache', 'პასტელი': 'Pastel', 'ქაღალდი': 'Paper', 'ხე': 'Wood',
    'თიხა': 'Clay', 'კერამიკა': 'Ceramics', 'ტყავი': 'Leather', 'მინა': 'Glass',
    'ლითონი': 'Metal', 'ბამბა': 'Cotton', 'აბრეშუმი': 'Silk', 'სელი': 'Linen',
    'ფაიფური': 'Porcelain', 'ცვილი': 'Wax', 'ბეტონი': 'Concrete',
  };
  return materials.map(mat => {
    const lower = mat.toLowerCase().trim();
    for (const [ge, en] of Object.entries(matMap)) {
      if (lower.includes(ge.toLowerCase())) return en;
    }
    return '';
  }).filter(Boolean);
}

async function main() {
  console.log(`\n=== Import FB Products: ${TARGET.displayName} (@${TARGET.slug}) ===`);
  console.log(`Mode: ${APPLY ? '🔴 APPLY' : '🟢 DRY RUN'}\n`);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('test');
  const usersCol = db.collection('users');
  const productsCol = db.collection('products');

  // Find user
  const user = await usersCol.findOne({ email: TARGET.email });
  if (!user) {
    console.log(`❌ User not found: ${TARGET.email}`);
    await client.close();
    return;
  }
  console.log(`✔ Found user: ${user.name || user.email} (role: ${user.role}, id: ${user._id})`);

  // Ensure user is seller
  if (user.role !== 'seller') {
    console.log(`⚠️  User is not seller (role: ${user.role}). Will promote to seller.`);
    if (APPLY) {
      await usersCol.updateOne({ _id: user._id }, {
        $set: {
          role: 'seller',
          artistSlug: TARGET.slug,
          storeName: TARGET.displayName,
          ownerFirstName: 'Keto',
          ownerLastName: 'Chekurishvili',
          sellerApprovedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`  ✅ Promoted to seller with slug @${TARGET.slug}`);
    } else {
      console.log(`  🟡 Would promote to seller with slug @${TARGET.slug}`);
    }
  } else {
    console.log(`  Already seller (slug: ${user.artistSlug || 'none'})`);
    if (!user.artistSlug && APPLY) {
      await usersCol.updateOne({ _id: user._id }, { $set: { artistSlug: TARGET.slug } });
      console.log(`  ✅ Set slug to @${TARGET.slug}`);
    }
  }

  // Check existing products
  const existingCount = await productsCol.countDocuments({ user: user._id });
  console.log(`  Existing products in DB: ${existingCount}`);

  // Fetch FB posts
  const allPosts = await fetchAllPagePosts();

  // Filter posts by this artist's slug
  const matches = allPosts
    .filter(p => p.message && extractAuthorSlug(p.message) === TARGET.slug)
    .sort((a, b) => new Date(a.created_time) - new Date(b.created_time));

  console.log(`\n── @${TARGET.slug}: ${matches.length} FB posts found ──\n`);
  if (matches.length === 0) {
    console.log('No FB posts found for this artist.');
    await client.close();
    return;
  }

  let imported = 0, skipped = 0, failed = 0;

  for (let i = 0; i < matches.length; i++) {
    const post = matches[i];
    try {
      const parsed = parsePostMessage(post.message);

      // Find original product ID from post or comments
      let originalId = extractOriginalProductId(post.message);
      if (!originalId) {
        const comments = await fetchComments(post.id);
        for (const c of comments) {
          const cid = extractOriginalProductId(c.message);
          if (cid) { originalId = cid; break; }
        }
      }
      if (!originalId) {
        console.log(`  [${i+1}] "${parsed.name}" - NO PRODUCT ID, skip`);
        skipped++;
        continue;
      }

      // Check if already exists
      const exists = await productsCol.findOne({ _id: new ObjectId(originalId) });
      if (exists) {
        console.log(`  [${i+1}] "${parsed.name}" - ALREADY EXISTS (owner: ${exists.user}), skip`);
        skipped++;
        continue;
      }

      const catInfo = detectCategory(parsed);
      const nameEn = translateName(parsed.name);
      const materialsEn = translateMaterials(parsed.materials || []);

      if (!APPLY) {
        console.log(`  🟡 [${i+1}] "${parsed.name}"${nameEn ? ` (${nameEn})` : ''} → ${catInfo.detectedAs} | ₾${parsed.price} | ${parsed.materials.join(', ') || '-'} | id: ${originalId}`);
        imported++;
        continue;
      }

      process.stdout.write(`  [${i+1}] "${parsed.name}" ... `);

      // Download and upload images to S3
      const originalImages = extractImages(post);
      const s3Images = [];
      for (let imgIdx = 0; imgIdx < originalImages.length; imgIdx++) {
        try {
          const buffer = await downloadImage(originalImages[imgIdx]);
          const key = `products/${TARGET.slug}-${originalId}-${imgIdx}.jpg`;
          const s3Url = await uploadToS3(buffer, key);
          s3Images.push(s3Url);
        } catch (imgErr) {
          console.log(`(img ${imgIdx} fallback) `);
          s3Images.push(originalImages[imgIdx]);
        }
      }

      const doc = {
        _id: new ObjectId(originalId),
        user: user._id,
        name: parsed.name,
        nameEn: nameEn || undefined,
        brand: TARGET.displayName,
        description: parsed.description || parsed.name,
        descriptionEn: '',
        price: parsed.price,
        images: s3Images,
        category: catInfo.category,
        mainCategory: catInfo.mainCategory,
        mainCategoryEn: catInfo.mainCategoryEn,
        subCategory: catInfo.subCategory,
        subCategoryEn: catInfo.subCategoryEn,
        countInStock: 1,
        status: 'APPROVED',
        reviews: [],
        rating: 0,
        numReviews: 0,
        hashtags: parsed.hashtags || [],
        deliveryType: 'SELLER',
        minDeliveryDays: 1,
        maxDeliveryDays: 3,
        materials: parsed.materials || [],
        materialsEn: materialsEn,
        dimensions: parsed.dimensions || {},
        isOriginal: parsed.isOriginal !== false,
        hideFromStore: false,
        viewCount: 0,
        variants: [],
        ageGroups: [],
        sizes: [],
        colors: [],
        colorsEn: [],
        discountPercentage: parsed.discountPercentage || 0,
        referralDiscountPercent: 0,
        useArtistDefaultDiscount: false,
        createdAt: new Date(post.created_time || Date.now()),
        updatedAt: new Date(),
      };

      await productsCol.insertOne(doc);
      imported++;
      console.log(`OK → ${catInfo.detectedAs}${nameEn ? ` (${nameEn})` : ''}`);
      await sleep(100);
    } catch (err) {
      failed++;
      console.log(`  [${i+1}] FAILED: ${err.message}`);
    }
  }

  console.log(`\n=== Result ===`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Failed:   ${failed}`);

  if (!APPLY) console.log('\n🟡 DRY RUN. Run with --apply to execute.');
  await client.close();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
