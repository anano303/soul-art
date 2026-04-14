#!/usr/bin/env node
/**
 * Import FB products for papalashvili.nino1@gmail.com (Nini's gift shop / ninis-gift-shop)
 * Creates products + portfolio posts + English translations.
 *
 * Usage:
 *   node scripts/import-fb-ninis-gift-shop.js          # dry run
 *   node scripts/import-fb-ninis-gift-shop.js --apply   # real run
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
const ACCESS_TOKEN =
  process.env.FACEBOOK_POSTS_PAGE_ACCESS_TOKEN ||
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

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
  email: 'papalashvili.nino1@gmail.com',
  slug: 'ninis-gift-shop',
  displayName: "Nini's gift shop",
};

// ── Category IDs ──
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

// ── Category detection ──
function detectCategory(parsed) {
  const text = [parsed.name || '', parsed.description || '', (parsed.hashtags || []).join(' ')].join(' ').toLowerCase();
  const materialsText = (parsed.materials || []).join(' ').toLowerCase();
  const allText = text + ' ' + materialsText;

  const paintingMaterials = /ზეთი|ტილო|აკრილ|აკვარელ|oil|canvas|acrylic|watercolor|გუაშ|პასტელ|pastel|gouache|ნახშირ|charcoal|ფანქარი|pencil/;
  if (paintingMaterials.test(materialsText) || /ნახატ|painting|paint|ფერწერ/.test(allText)) {
    const signals = {
      'პეიზაჟი':    /პეიზაჟ|landscape|ბუნება|მთა|ზღვა|სოფელ|nature/,
      'პორტრეტი':   /პორტრეტ|portrait|სახე|face/,
      'აბსტრაქცია': /აბსტრაქ|abstract/,
      'ანიმაციური':  /ანიმაც|anime|cartoon/,
      'გრაფიკა':    /გრაფიკ|graphic|sketch|ტუში|ink/,
      'ციფრული':    /ციფრულ|digital|ipad/,
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
    'სამკაულები': /სამკაული|ბეჭედი|საყურე|სამაჯური|ყელსაბამი|bracelet|earring|necklace|ring|beads|მძივ|აქვამარინ|სადაფ|ლაპის|მარგალიტ|ოფსიდიან|ამეთვისტ|ქარვა|თვალი|ჰემატიტ|ოპალ|როდონიტ|ჟანგი|ტურმალინ|jade|pearl|lapis|turquoise|agate|crystal/,
    'კერამიკა':   /კერამიკ|ceramic|თასი|ვაზა/,
    'ხის_ნაკეთობები': /ხის\s|ხისგან|wood|wooden/,
    'თოჯინები':   /თოჯინ|doll|plush/,
    'ყვავილები':   /ყვავილ|flower|ბუკეტ/,
    'სანთლები':   /სანთელ|candle|სანთლ/,
    'თიხა':       /თიხ|clay|პოლიმერ/,
    'დეკორი':     /დეკორ|decor|კედლის|მაგნიტ|ჩარჩო|საათ|პანო/,
    'ტექსტილი':   /ტექსტილ|textile|ნაქსოვი|knit|crochet/,
    'დანები':     /დანა|knife|ხანჯალ/,
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
      return { mainCategory: new ObjectId(sc.cat), mainCategoryEn: sc.catEn, subCategory: new ObjectId(sc.id), subCategoryEn: sc.en, category: 'ნახატები', detectedAs: 'სხვა_ნახატი (large 2D)' };
    }
  }

  const sc = SUBCATS['სხვა_ხელნაკეთი'];
  return { mainCategory: new ObjectId(sc.cat), mainCategoryEn: sc.catEn, subCategory: new ObjectId(sc.id), subCategoryEn: sc.en, category: 'ხელნაკეთი ნივთები', detectedAs: 'სხვა_ხელნაკეთი (fallback)' };
}

// ── Helpers ──
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

function extractSlugFromUrl(text) {
  const match = String(text || '').match(/soulart\.ge\/products?\/([\w-]+)/i);
  if (match && match[1] && !/^[a-f0-9]{24}$/.test(match[1])) return match[1];
  return null;
}

function parsePostMessage(message) {
  const product = {};
  const text = String(message || '');
  const lines = text.split('\n');

  const titleMatch = text.match(/📌\s*(.+)/);
  product.name = titleMatch ? titleMatch[1].trim() : 'უსათაურო';

  const descLines = [];
  let foundAuthor = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('✍️')) { foundAuthor = true; continue; }
    if (!foundAuthor) continue;
    const isStructured = line.startsWith('✅') || line.startsWith('🖼️') ||
      (line.startsWith('🎨') && line.includes('მასალა')) ||
      line.startsWith('📏') || line.startsWith('💰') ||
      line.startsWith('🔻') || line.startsWith('⏳') ||
      line.startsWith('🔗') || line.startsWith('👤') || line.startsWith('#');
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

// ── FB API ──
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
      if (data.error) { console.log(`  API error (attempt ${attempt + 1}): ${data.error.message}`); await sleep((attempt + 1) * 3000); continue; }
      return data;
    } catch (err) { console.log(`  Fetch error (attempt ${attempt + 1}): ${err.message}`); await sleep((attempt + 1) * 3000); }
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
  console.log(` (${allPosts.length} total)`);
  return allPosts;
}

async function fetchComments(postId) {
  try {
    const response = await axios.get(`${GRAPH_API}/${postId}/comments`, {
      params: { access_token: ACCESS_TOKEN, limit: 100 },
    });
    return response.data.data || [];
  } catch { return []; }
}

// ── Image handling ──
function downloadImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(imageUrl);
    const client = parsed.protocol === 'https:' ? https : http;
    client.get(imageUrl, { headers: { 'User-Agent': 'SoulArt/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function uploadToS3(buffer, key) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: buffer, ContentType: 'image/jpeg',
  }));
  return `https://${BUCKET}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${key}`;
}

// ── Translation ──
let translateFn = null;
async function initTranslate() {
  try {
    const mod = await import('google-translate-api-x');
    translateFn = mod.default || mod;
    console.log('✔ Translation module loaded');
  } catch (err) {
    console.log(`⚠️  Translation module not available: ${err.message}`);
  }
}

function isGeorgian(text) {
  return /[\u10A0-\u10FF]/.test(text);
}

async function translateText(text) {
  if (!translateFn || !text || !isGeorgian(text)) return text;
  try {
    const result = await translateFn(text, { from: 'ka', to: 'en' });
    return result.text || text;
  } catch {
    return text;
  }
}

async function translateMaterials(materials) {
  if (!materials || materials.length === 0) return [];
  const materialMap = {
    'აქვამარინი': 'Aquamarine',
    'სადაფი': 'Mother of Pearl',
    'ლაპის ლაზური': 'Lapis Lazuli',
    'ლაპისლაზური': 'Lapis Lazuli',
    'მარგალიტი': 'Pearl',
    'ოფსიდიანი': 'Obsidian',
    'ამეთვისტი': 'Amethyst',
    'ქარვა': 'Amber',
    'ჰემატიტი': 'Hematite',
    'ოპალი': 'Opal',
    'როდონიტი': 'Rhodonite',
    'ტურმალინი': 'Tourmaline',
    'აგათი': 'Agate',
    'ბაქარი': 'Copper',
    'ვერცხლი': 'Silver',
    'ოქრო': 'Gold',
    'ბრინჯაო': 'Bronze',
    'ტყავი': 'Leather',
    'თვალი': 'Stone',
    'მძივი': 'Beads',
    'ბისერი': 'Seed beads',
    'მინა': 'Glass',
    'პოლიმერული თიხა': 'Polymer clay',
    'ჟანგი': 'Rust',
    'ზეთი': 'Oil',
    'ტილო': 'Canvas',
    'აკრილი': 'Acrylic',
    'აკვარელი': 'Watercolor',
    'ფანქარი': 'Pencil',
    'ქვა': 'Stone',
    'ხე': 'Wood',
    'ნაჭერი': 'Fabric',
    'კრისტალი': 'Crystal',
  };
  const result = [];
  for (const mat of materials) {
    const lower = mat.trim().toLowerCase();
    const found = Object.entries(materialMap).find(([k]) => lower.includes(k.toLowerCase()));
    if (found) {
      result.push(found[1]);
    } else {
      const translated = await translateText(mat);
      result.push(translated);
    }
  }
  return result;
}

// ── Main ──
async function main() {
  console.log(`\n=== Import FB Posts: ${TARGET.displayName} (@${TARGET.slug}) ===`);
  console.log(`Email: ${TARGET.email}`);
  console.log(`Mode: ${APPLY ? '🔴 APPLY' : '🟢 DRY RUN'}\n`);

  await initTranslate();

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const usersCol = db.collection('users');
  const productsCol = db.collection('products');
  const portfolioCol = db.collection('portfolioposts');

  // Step 1: Find user
  const user = await usersCol.findOne({ email: TARGET.email.toLowerCase() });
  if (!user) {
    console.log(`❌ User not found: ${TARGET.email}`);
    await client.close();
    return;
  }
  console.log(`✔ Found user: ${user.name} (${user.email}), role: ${user.role}, slug: ${user.artistSlug || 'none'}`);

  // Promote to seller if not already
  if (user.role !== 'seller' || !user.artistSlug) {
    const updateData = {
      role: 'seller',
      artistSlug: TARGET.slug,
      storeName: TARGET.displayName,
    };
    if (APPLY) {
      await usersCol.updateOne({ _id: user._id }, { $set: updateData });
      console.log(`✅ Promoted to seller @${TARGET.slug}`);
    } else {
      console.log(`[DRY] Would promote to seller @${TARGET.slug}`);
    }
  }

  // Step 2: Fetch all FB posts
  const allPosts = await fetchAllPagePosts();
  const matches = allPosts
    .filter(p => p.message && extractAuthorSlug(p.message) === TARGET.slug)
    .sort((a, b) => new Date(a.created_time) - new Date(b.created_time));

  console.log(`\n── Found ${matches.length} FB posts by @${TARGET.slug} ──\n`);
  if (matches.length === 0) {
    console.log('No posts found. Check slug.');
    await client.close();
    return;
  }

  let imported = 0, skipped = 0, failed = 0;

  for (let i = 0; i < matches.length; i++) {
    const post = matches[i];
    try {
      const parsed = parsePostMessage(post.message);

      // Try to find product ID from post or comments
      let originalId = extractOriginalProductId(post.message);
      let slugFromUrl = null;
      if (!originalId) {
        slugFromUrl = extractSlugFromUrl(post.message);
      }
      if (!originalId && !slugFromUrl) {
        const comments = await fetchComments(post.id);
        for (const c of comments) {
          const cid = extractOriginalProductId(c.message);
          if (cid) { originalId = cid; break; }
          const cSlug = extractSlugFromUrl(c.message);
          if (cSlug) { slugFromUrl = cSlug; break; }
        }
      }

      // If we found a slug instead of ID, try to look up existing product
      if (!originalId && slugFromUrl) {
        const existingBySlug = await productsCol.findOne({ slug: slugFromUrl });
        if (existingBySlug) {
          originalId = existingBySlug._id.toString();
        }
      }

      if (!originalId) {
        console.log(`  [${i + 1}] "${parsed.name}" — ₾${parsed.price} — NO product ID found, SKIP`);
        skipped++;
        continue;
      }

      // Check if product already exists
      const exists = await productsCol.findOne({ _id: new ObjectId(originalId) });
      if (exists) {
        // Check if portfolio already exists
        const portfolioExists = await portfolioCol.findOne({ productId: new ObjectId(originalId) });
        if (!portfolioExists) {
          console.log(`  [${i + 1}] "${parsed.name}" — product EXISTS, but no portfolio. Creating portfolio...`);
          if (APPLY) {
            const portfolioDoc = {
              artistId: user._id,
              productId: exists._id,
              images: (exists.images || []).map((url, idx) => ({
                url,
                order: idx,
                sourceProductImageId: null,
                storageProvider: null,
                metadata: { source: 'product-image' },
              })),
              caption: exists.description || exists.name,
              tags: (exists.hashtags || []).slice(0, 20),
              isFeatured: false,
              isSold: typeof exists.countInStock === 'number' ? exists.countInStock <= 0 : false,
              hideBuyButton: exists.status !== 'APPROVED',
              likesCount: 0,
              commentsCount: 0,
              publishedAt: exists.createdAt || new Date(),
              archivedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            await portfolioCol.insertOne(portfolioDoc);
            console.log(`    ✅ Portfolio post created for existing product`);
          }
        } else {
          console.log(`  [${i + 1}] "${parsed.name}" — ALREADY EXISTS with portfolio, skip`);
        }
        skipped++;
        continue;
      }

      // Detect category
      const catInfo = detectCategory(parsed);

      // Translate
      const nameEn = await translateText(parsed.name);
      const descriptionEn = await translateText(parsed.description || parsed.name);
      const materialsEn = await translateMaterials(parsed.materials);

      if (!APPLY) {
        console.log(`  🟡 [${i + 1}] "${parsed.name}" → EN: "${nameEn}"`);
        console.log(`      Category: ${catInfo.category} → ${catInfo.detectedAs}`);
        console.log(`      Price: ₾${parsed.price} | Materials: ${parsed.materials.join(', ') || '-'} → EN: ${materialsEn.join(', ') || '-'}`);
        console.log(`      Images: ${extractImages(post).length} | ID: ${originalId}`);
        imported++;
        continue;
      }

      process.stdout.write(`  [${i + 1}] "${parsed.name}" ... `);

      // Upload images to S3
      const fbImages = extractImages(post);
      const s3Images = [];
      for (let imgIdx = 0; imgIdx < fbImages.length; imgIdx++) {
        try {
          const buffer = await downloadImage(fbImages[imgIdx]);
          const key = `products/${TARGET.slug}/${originalId}-${imgIdx}.jpg`;
          const s3Url = await uploadToS3(buffer, key);
          s3Images.push(s3Url);
        } catch (err) {
          console.log(`img-err: ${err.message}`);
          s3Images.push(fbImages[imgIdx]);
        }
      }

      // Build product document
      const now = new Date();
      const productDoc = {
        _id: new ObjectId(originalId),
        user: user._id,
        name: parsed.name,
        nameEn,
        brand: TARGET.displayName,
        description: parsed.description || parsed.name,
        descriptionEn: descriptionEn || nameEn,
        price: parsed.price || 0,
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
        materialsEn: materialsEn || [],
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
        facebookPostId: post.id,
        createdAt: new Date(post.created_time || Date.now()),
        updatedAt: now,
      };

      await productsCol.insertOne(productDoc);

      // Create portfolio post
      const portfolioDoc = {
        artistId: user._id,
        productId: new ObjectId(originalId),
        images: s3Images.map((url, idx) => ({
          url,
          order: idx,
          sourceProductImageId: null,
          storageProvider: null,
          metadata: { source: 'product-image' },
        })),
        caption: parsed.description || parsed.name,
        tags: (parsed.hashtags || []).slice(0, 20),
        isFeatured: false,
        isSold: false,
        hideBuyButton: false,
        likesCount: 0,
        commentsCount: 0,
        publishedAt: new Date(post.created_time || Date.now()),
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      await portfolioCol.insertOne(portfolioDoc);

      imported++;
      console.log(`OK → ${catInfo.detectedAs} | EN: "${nameEn}"`);
    } catch (err) {
      failed++;
      console.log(`  ❌ [${i + 1}] FAILED: ${err.message}`);
    }
  }

  console.log(`\n── Results ──`);
  console.log(`  ✅ Imported: ${imported}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Failed:   ${failed}`);
  
  if (!APPLY) console.log('\n🟡 DRY RUN. Run with --apply to execute.');

  await client.close();
  console.log('\nDone!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
