#!/usr/bin/env node
/**
 * promote-and-import-fb-products.js
 *
 * Step 1: Promote confirmed email->slug matches to sellers
 * Step 2: Scan FB posts for those slugs
 * Step 3: Create products from FB posts with SMART category assignment
 *         based on title, description, materials, dimensions
 *
 * Usage:
 *   node scripts/promote-and-import-fb-products.js          # dry run
 *   node scripts/promote-and-import-fb-products.js --apply   # real run
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

// ──────────────────────────────────────────────
// 8 Confirmed exact matches (email name = FB author name)
// ──────────────────────────────────────────────
const CONFIRMED = [
  { email: 'tornike.xosikuridze@icloud.com',     slug: 'tokesi',               displayName: 'Tornike Xosikuridze' },
  { email: 'natiachijavadze@yahoo.com',           slug: 'natia-chijavadze',     displayName: 'Natia Chijavadze' },
  { email: 'keti.abulashvili.art@gmail.com',      slug: 'keti-abulashvili',     displayName: 'Keti Abulashvili' },
  { email: 'marinpura.studio@gmail.com',          slug: 'marin-pura',          displayName: 'Marin Pura' },
  { email: 'mumladzeliza22@gmail.com',            slug: 'liza-mumladze',        displayName: 'Liza Mumladze' },
  { email: 'pochkhidzenini288@gmail.com',         slug: 'nini-pochkhidze',      displayName: 'Nini Pochkhidze' },
  { email: 'vano.kravelidze@gmail.com',           slug: 'ioane-kravelidze',     displayName: 'Vano Kravelidze' },
  { email: 'ninofutkaradze98@gmail.com',          slug: 'plushiflora',          displayName: 'Nino Futkaradze' },
];

// ──────────────────────────────────────────────
// Category IDs from DB
// ──────────────────────────────────────────────
const CATS = {
  paintings: '68768f6f0b55154655a8e882',
  handmade:  '68768f850b55154655a8e88f',
};
const SUBCATS = {
  // paintings subcategories
  'აბსტრაქცია':     { id: '68768f990b55154655a8e89d', cat: CATS.paintings, en: 'Abstraction',   catEn: 'Painting' },
  'პეიზაჟი':        { id: '68769d0ba7672efd3181125a', cat: CATS.paintings, en: 'Landscape',     catEn: 'Painting' },
  'პორტრეტი':       { id: '68769d2da7672efd31811268', cat: CATS.paintings, en: 'Portrait',      catEn: 'Painting' },
  'ანიმაციური':     { id: '68769d44a7672efd31811277', cat: CATS.paintings, en: 'Animation',     catEn: 'Painting' },
  'გრაფიკა':        { id: '68769d59a7672efd31811285', cat: CATS.paintings, en: 'Graphics',      catEn: 'Painting' },
  'ციფრული':        { id: '68d8cd3f83c6d6636d570ec1', cat: CATS.paintings, en: 'Digital',       catEn: 'Painting' },
  'სხვა_ნახატი':    { id: '68d8cce983c6d6636d570e76', cat: CATS.paintings, en: 'Other',         catEn: 'Painting' },
  // handmade subcategories
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

// ──────────────────────────────────────────────
// Smart category detection from post content
// ──────────────────────────────────────────────
function detectCategory(parsed) {
  const text = [
    parsed.name || '',
    parsed.description || '',
    (parsed.hashtags || []).join(' '),
  ].join(' ').toLowerCase();

  const materialsText = (parsed.materials || []).join(' ').toLowerCase();
  const allText = text + ' ' + materialsText;

  // ── PRIORITY 1: Check if materials indicate PAINTING ──
  // If materials include canvas/acrylic/oil/watercolor etc, it's a painting
  // regardless of what the title says (e.g. "ყვავილები" title on canvas = painting, not handmade flowers)
  const paintingMaterials = /ზეთი|ტილო|აკრილ|აკვარელ|oil|canvas|acrylic|watercolor|გუაშ|პასტელ|pastel|gouache/;
  const isPaintingByMaterial = paintingMaterials.test(materialsText);

  if (isPaintingByMaterial || /ნახატ|painting|paint|ფერწერ/.test(allText)) {
    // Painting subcategory detection
    const paintingSignals = {
      'პეიზაჟი':    /პეიზაჟ|landscape|ბუნება|მთა|ზღვა|სოფელ|nature|mountain|sea|ტბა|lake/,
      'პორტრეტი':   /პორტრეტ|portrait|სახე|face|დედა|ქალი|ბავშვ|კაცი|ადამიან/,
      'აბსტრაქცია': /აბსტრაქ|abstract/,
      'ანიმაციური':  /ანიმაც|anime|cartoon|ანიმე|მულტ/,
      'გრაფიკა':    /გრაფიკ|graphic|sketch|ესკიზ|ტუში|ink|charcoal|ნახშირ/,
      'ციფრული':    /ციფრულ|digital|ipad|procreate|ილუსტრაც/,
    };

    for (const [subcat, regex] of Object.entries(paintingSignals)) {
      if (regex.test(text)) {
        const sc = SUBCATS[subcat];
        return {
          mainCategory: new ObjectId(sc.cat),
          mainCategoryEn: sc.catEn,
          subCategory: new ObjectId(sc.id),
          subCategoryEn: sc.en,
          category: 'ნახატები',
          detectedAs: subcat,
        };
      }
    }

    // Default painting subcategory
    const sc = SUBCATS['სხვა_ნახატი'];
    return {
      mainCategory: new ObjectId(sc.cat),
      mainCategoryEn: sc.catEn,
      subCategory: new ObjectId(sc.id),
      subCategoryEn: sc.en,
      category: 'ნახატები',
      detectedAs: 'სხვა_ნახატი (default painting)',
    };
  }

  // ── PRIORITY 2: HANDMADE - only if NOT painting materials ──
  const handmadeSignals = {
    'სამკაულები': /სამკაული|ბეჭედი|საყურე|სამაჯური|ყელსაბამი|bracelet|earring|necklace|ring|beads|მძივ/,
    'კერამიკა':   /კერამიკ|ceramic|თასი|ვაზა|ჭიქა|ჯამი|vase/,
    'ხის_ნაკეთობები': /ხის\s|ხისგან|wood|wooden/,
    'თოჯინები':   /თოჯინ|doll|plush|პლიუშ|რბილი\sსათამაშო/,
    'ყვავილები':   /ყვავილ|flower|ბუკეტ|საპნის\sყვავ/,
    'სანთლები':   /სანთელ|candle|სანთლ/,
    'თიხა':       /თიხ|clay|პოლიმერ/,
    'დეკორი':     /დეკორ|decor|კედლის|მაგნიტ|ჩარჩო|frame|ქოთანი|ხავს|საათ|clock|პანო/,
    'ტექსტილი':   /ტექსტილ|textile|ნაქსოვი|knit|crochet|ხელით\sნაქსოვი|ქსოვა|პლუშ/,
    'დანები':     /დანა|knife|ხანჯალ|dagger/,
  };

  for (const [subcat, regex] of Object.entries(handmadeSignals)) {
    if (regex.test(allText)) {
      const sc = SUBCATS[subcat];
      return {
        mainCategory: new ObjectId(sc.cat),
        mainCategoryEn: sc.catEn,
        subCategory: new ObjectId(sc.id),
        subCategoryEn: sc.en,
        category: 'ხელნაკეთი ნივთები',
        detectedAs: subcat,
      };
    }
  }

  // ── PRIORITY 3: Large 2D dimensions → likely painting ──
  if (parsed.dimensions && parsed.dimensions.width && parsed.dimensions.height && !parsed.dimensions.depth) {
    const area = parsed.dimensions.width * parsed.dimensions.height;
    if (area > 200) {
      const sc = SUBCATS['სხვა_ნახატი'];
      return {
        mainCategory: new ObjectId(sc.cat),
        mainCategoryEn: sc.catEn,
        subCategory: new ObjectId(sc.id),
        subCategoryEn: sc.en,
        category: 'ნახატები',
        detectedAs: 'სხვა_ნახატი (large 2D → painting)',
      };
    }
  }

  // Final fallback: handmade other
  const sc = SUBCATS['სხვა_ხელნაკეთი'];
  return {
    mainCategory: new ObjectId(sc.cat),
    mainCategoryEn: sc.catEn,
    subCategory: new ObjectId(sc.id),
    subCategoryEn: sc.en,
    category: 'ხელნაკეთი ნივთები',
    detectedAs: 'სხვა_ხელნაკეთი (fallback)',
  };
}

// ──────────────────────────────────────────────
// FB post parsing (reused from import-all-missing)
// ──────────────────────────────────────────────
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
    const isStructured =
      line.startsWith('✅') || line.startsWith('🖼️') ||
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
  product.materials = materialMatch
    ? materialMatch[1].split(',').map(s => s.trim()).filter(Boolean) : [];

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
    for (const sub of subs) {
      if (sub.media?.image?.src) images.push(sub.media.image.src);
    }
    if (subs.length === 0 && att.media?.image?.src) images.push(att.media.image.src);
  }
  if (images.length === 0 && post.full_picture) images.push(post.full_picture);
  return images;
}

// ──────────────────────────────────────────────
// FB API
// ──────────────────────────────────────────────
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
  while (scanned < MAX_SCAN) {
    const data = await fetchPosts(after);
    if (!data.data || data.data.length === 0) break;
    for (const post of data.data) { allPosts.push(post); scanned++; }
    if (data.paging?.cursors?.after && data.data.length > 0 && scanned < MAX_SCAN) {
      after = data.paging.cursors.after;
      await sleep(120);
    } else break;
  }
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

// ──────────────────────────────────────────────
// Image download + S3 upload
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────
async function main() {
  console.log(`\n=== Promote Sellers & Import FB Products ===`);
  console.log(`Mode: ${APPLY ? '🔴 APPLY' : '🟢 DRY RUN'}`);
  console.log(`Confirmed matches: ${CONFIRMED.length}\n`);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const usersCol = db.collection('users');
  const productsCol = db.collection('products');

  // ── STEP 1: Promote users to sellers ──
  console.log('═══ STEP 1: Promote to Sellers ═══\n');
  const sellerMap = {}; // slug -> { userId, storeName }

  for (const match of CONFIRMED) {
    const user = await usersCol.findOne({ email: match.email.toLowerCase() });
    if (!user) { console.log(`❌ ${match.email}: not found`); continue; }

    if (user.role === 'seller' && user.artistSlug === match.slug) {
      console.log(`✔ ${match.email}: already seller @${match.slug}`);
      sellerMap[match.slug] = { userId: user._id, storeName: match.displayName };
      continue;
    }

    const slugTaken = await usersCol.findOne({ artistSlug: match.slug, role: 'seller', _id: { $ne: user._id } });
    if (slugTaken) {
      console.log(`⚠️  ${match.email}: slug @${match.slug} taken by ${slugTaken.email}`);
      continue;
    }

    const nameParts = match.displayName.split(' ');
    const updateFields = {
      role: 'seller',
      artistSlug: match.slug,
      storeName: match.displayName,
      ownerFirstName: nameParts[0] || match.displayName,
      ownerLastName: nameParts.slice(1).join(' ') || '',
      sellerApprovedAt: new Date(),
      updatedAt: new Date(),
    };

    if (APPLY) {
      await usersCol.updateOne({ _id: user._id }, { $set: updateFields });
      console.log(`✅ ${match.email}: PROMOTED to seller @${match.slug}`);
    } else {
      console.log(`🟡 ${match.email}: WOULD promote to seller @${match.slug}`);
    }
    sellerMap[match.slug] = { userId: user._id, storeName: match.displayName };
  }

  const slugsToImport = Object.keys(sellerMap);
  console.log(`\nSellers ready: ${slugsToImport.length}\n`);

  if (slugsToImport.length === 0) {
    console.log('No sellers to import for. Exiting.');
    await client.close();
    return;
  }

  // ── STEP 2: Scan FB posts ──
  console.log('═══ STEP 2: Scan Facebook Posts ═══\n');
  console.log('Fetching Facebook page posts...');
  const allPosts = await fetchAllPagePosts();
  console.log(`Fetched ${allPosts.length} posts total\n`);

  // ── STEP 3: Import products ──
  console.log('═══ STEP 3: Import Products ═══\n');

  const grandSummary = [];

  for (const slug of slugsToImport) {
    const seller = sellerMap[slug];
    const matches = allPosts
      .filter(p => p.message && extractAuthorSlug(p.message) === slug)
      .sort((a, b) => new Date(a.created_time) - new Date(b.created_time));

    if (matches.length === 0) {
      console.log(`@${slug}: 0 FB posts found`);
      grandSummary.push({ slug, posts: 0, imported: 0, skipped: 0, failed: 0 });
      continue;
    }

    console.log(`\n── @${slug} (${matches.length} posts) ──`);

    const existingProducts = await productsCol.find(
      { user: seller.userId }, { projection: { _id: 1 } }
    ).toArray();
    const existingIds = new Set(existingProducts.map(p => String(p._id)));

    let imported = 0, skippedExisting = 0, skippedNoId = 0, conflicts = 0, failed = 0;
    const categoryBreakdown = {};

    for (let i = 0; i < matches.length; i++) {
      const post = matches[i];
      try {
        const parsed = parsePostMessage(post.message);

        // Extract product ID from post or comments
        let originalId = extractOriginalProductId(post.message);
        if (!originalId) {
          const comments = await fetchComments(post.id);
          for (const comment of comments) {
            const cid = extractOriginalProductId(comment.message);
            if (cid) { originalId = cid; break; }
          }
        }
        if (!originalId) { skippedNoId++; continue; }
        if (existingIds.has(originalId)) { skippedExisting++; continue; }

        // Check for ID conflict
        const existingById = await productsCol.findOne(
          { _id: new ObjectId(originalId) }, { projection: { _id: 1 } }
        );
        if (existingById) { conflicts++; continue; }

        // Smart category detection
        const catInfo = detectCategory(parsed);
        categoryBreakdown[catInfo.detectedAs] = (categoryBreakdown[catInfo.detectedAs] || 0) + 1;

        if (!APPLY) {
          console.log(`  🟡 [${i + 1}/${matches.length}] "${parsed.name}" → ${catInfo.detectedAs} | ₾${parsed.price} | ${parsed.materials.join(', ') || '-'} | ${parsed.dimensions ? `${parsed.dimensions.width}×${parsed.dimensions.height}` : '-'}`);
          imported++;
          existingIds.add(originalId);
          continue;
        }

        // Download & re-upload images
        process.stdout.write(`  [${i + 1}/${matches.length}] "${parsed.name}" ... `);
        const originalImages = extractImages(post);
        const s3Images = [];
        for (let imgIdx = 0; imgIdx < originalImages.length; imgIdx++) {
          try {
            const buffer = await downloadImage(originalImages[imgIdx]);
            const key = `products/${slug}-${originalId}-${imgIdx}.jpg`;
            const s3Url = await uploadToS3(buffer, key);
            s3Images.push(s3Url);
          } catch {
            s3Images.push(originalImages[imgIdx]);
          }
        }

        const doc = {
          _id: new ObjectId(originalId),
          user: seller.userId,
          name: parsed.name,
          brand: seller.storeName,
          description: parsed.description || parsed.name,
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
          deliveryType: 'SoulArt',
          materials: parsed.materials || [],
          materialsEn: [],
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
        existingIds.add(originalId);
        imported++;
        console.log(`OK → ${catInfo.detectedAs}`);
      } catch (err) {
        failed++;
        console.log(`FAILED: ${err.message}`);
      }
    }

    const summary = { slug, posts: matches.length, imported, skippedExisting, skippedNoId, conflicts, failed, categories: categoryBreakdown };
    grandSummary.push(summary);
    console.log(`  Summary: +${imported} imported, ${skippedExisting} existing, ${skippedNoId} no-id, ${conflicts} conflicts, ${failed} failed`);
    if (Object.keys(categoryBreakdown).length > 0) {
      console.log(`  Categories:`, categoryBreakdown);
    }
  }

  // ── GRAND SUMMARY ──
  console.log('\n\n═══ GRAND SUMMARY ═══');
  let totalImported = 0, totalPosts = 0;
  for (const s of grandSummary) {
    totalPosts += s.posts;
    totalImported += s.imported;
    console.log(`  @${s.slug}: ${s.posts} posts → ${s.imported} products | ${JSON.stringify(s.categories || {})}`);
  }
  console.log(`\nTotal: ${totalPosts} FB posts → ${totalImported} products`);
  if (!APPLY) console.log('\n🟡 DRY RUN. Run with --apply to execute.');

  await client.close();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
