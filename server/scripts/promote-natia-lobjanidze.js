#!/usr/bin/env node
/**
 * Promote natia.lobjanidze286@hum.tsu.edu.ge to seller @natialobzhanidze
 * and import their 1 FB post as a product.
 *
 * Usage:
 *   node scripts/promote-natia-lobjanidze.js          # dry run
 *   node scripts/promote-natia-lobjanidze.js --apply   # real run
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
  email: 'natia.lobjanidze286@hum.tsu.edu.ge',
  slug: 'natialobzhanidze',
  displayName: 'ნათია ლობჟანიძე',
  postId: '542501458957000_122168292452832848',
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
    for (const [subcat, regex] of Object.entries(signals)) {
      if (regex.test(text)) {
        const sc = SUBCATS[subcat];
        return { mainCategory: new ObjectId(sc.cat), mainCategoryEn: sc.catEn, subCategory: new ObjectId(sc.id), subCategoryEn: sc.en, category: 'ნახატები', detectedAs: subcat };
      }
    }
    const sc = SUBCATS['სხვა_ნახატი'];
    return { mainCategory: new ObjectId(sc.cat), mainCategoryEn: sc.catEn, subCategory: new ObjectId(sc.id), subCategoryEn: sc.en, category: 'ნახატები', detectedAs: 'სხვა_ნახატი' };
  }

  const handmadeSignals = {
    'სამკაულები': /სამკაული|ბეჭედი|საყურე|სამაჯური|ყელსაბამი|beads|მძივ/,
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
  for (const [subcat, regex] of Object.entries(handmadeSignals)) {
    if (regex.test(allText)) {
      const sc = SUBCATS[subcat];
      return { mainCategory: new ObjectId(sc.cat), mainCategoryEn: sc.catEn, subCategory: new ObjectId(sc.id), subCategoryEn: sc.en, category: 'ხელნაკეთი ნივთები', detectedAs: subcat };
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`\n=== Promote ${TARGET.email} → @${TARGET.slug} ===`);
  console.log(`Mode: ${APPLY ? '🔴 APPLY' : '🟢 DRY RUN'}\n`);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const usersCol = db.collection('users');
  const productsCol = db.collection('products');

  // Step 1: Find user and promote
  const user = await usersCol.findOne({ email: TARGET.email.toLowerCase() });
  if (!user) {
    console.log(`❌ User not found: ${TARGET.email}`);
    await client.close();
    return;
  }

  console.log(`Found user: ${user.name} (${user.email}), role: ${user.role}`);

  if (user.role !== 'seller' || !user.artistSlug) {
    const nameParts = TARGET.displayName.split(' ');
    const updateData = {
      role: 'seller',
      artistSlug: TARGET.slug,
      storeName: TARGET.displayName,
      firstName: nameParts[0] || TARGET.displayName,
      lastName: nameParts.slice(1).join(' ') || '',
    };
    
    if (APPLY) {
      await usersCol.updateOne({ _id: user._id }, { $set: updateData });
      console.log(`✅ Promoted/updated to seller @${TARGET.slug}`);
    } else {
      console.log(`[DRY] Would promote/update to seller @${TARGET.slug}`);
    }
  } else {
    console.log(`Already a seller with slug: @${user.artistSlug}`);
  }

  // Step 2: Fetch the specific FB post
  console.log(`\nFetching FB post ${TARGET.postId}...`);
  
  let post;
  try {
    const url = `${GRAPH_API}/${TARGET.postId}?fields=id,message,created_time,full_picture,attachments{media,subattachments{media}}&access_token=${ACCESS_TOKEN}`;
    const response = await axios.get(url);
    post = response.data;
  } catch (err) {
    console.log(`❌ Failed to fetch post: ${err.message}`);
    await client.close();
    return;
  }

  if (!post || !post.message) {
    console.log('❌ Post not found or has no message');
    await client.close();
    return;
  }

  console.log(`Post message preview: ${post.message.substring(0, 100)}...`);

  // Step 3: Parse and create product
  const parsed = parsePostMessage(post.message);
  const cat = detectCategory(parsed);
  const images = extractImages(post);

  console.log(`\n  📌 Name: ${parsed.name}`);
  console.log(`  📝 Description: ${(parsed.description || '').substring(0, 80)}...`);
  console.log(`  🎨 Materials: ${parsed.materials.join(', ') || 'none'}`);
  console.log(`  💰 Price: ${parsed.price}`);
  console.log(`  📁 Category: ${cat.category} → ${cat.detectedAs}`);
  console.log(`  🖼️ Images: ${images.length}`);

  if (!APPLY) {
    console.log('\n⚠️  DRY RUN - no changes. Use --apply to execute.');
    await client.close();
    return;
  }

  // Upload images to S3
  const s3Urls = [];
  for (let i = 0; i < images.length; i++) {
    try {
      const buf = await downloadImage(images[i]);
      const key = `products/${TARGET.slug}/${Date.now()}-${i}.jpg`;
      const s3Url = await uploadToS3(buf, key);
      s3Urls.push(s3Url);
      console.log(`  ✅ Image ${i + 1} uploaded`);
    } catch (err) {
      console.log(`  ⚠️  Image ${i + 1} failed: ${err.message}`);
    }
  }

  // Translate name/description via Google Translate
  let nameEn = parsed.name;
  let descriptionEn = parsed.description;
  try {
    const mod = await import('google-translate-api-x');
    const translate = mod.default || mod;
    const isGeorgian = (t) => /[\u10A0-\u10FF]/.test(t);
    if (isGeorgian(parsed.name)) {
      const r = await translate(parsed.name, { from: 'ka', to: 'en' });
      nameEn = r.text;
    }
    if (parsed.description && isGeorgian(parsed.description)) {
      const r = await translate(parsed.description, { from: 'ka', to: 'en' });
      descriptionEn = r.text;
    }
  } catch (err) {
    console.log(`  ⚠️  Translation fallback: ${err.message}`);
  }

  const now = new Date();
  const productDoc = {
    name: parsed.name,
    nameEn: nameEn,
    description: parsed.description || parsed.name,
    descriptionEn: descriptionEn || nameEn,
    price: parsed.price || 0,
    images: s3Urls,
    user: user._id,
    artistSlug: TARGET.slug,
    materials: parsed.materials,
    materialsEn: parsed.materials, // will be English if already, or Georgian
    mainCategory: cat.mainCategory,
    mainCategoryEn: cat.mainCategoryEn,
    subCategory: cat.subCategory,
    subCategoryEn: cat.subCategoryEn,
    isOriginal: parsed.isOriginal || false,
    dimensions: parsed.dimensions || {},
    hashtags: parsed.hashtags || [],
    status: 'active',
    stock: 1,
    facebookPostId: TARGET.postId,
    createdAt: now,
    updatedAt: now,
  };

  if (parsed.discountPercentage) {
    productDoc.discountPercentage = parsed.discountPercentage;
  }

  const result = await productsCol.insertOne(productDoc);
  console.log(`\n✅ Product created: ${result.insertedId}`);
  console.log(`   Name: ${parsed.name} → ${nameEn}`);
  console.log(`   Category: ${cat.category} / ${cat.detectedAs}`);

  await client.close();
  console.log('\nDone!');
}

main().catch(err => { console.error(err); process.exit(1); });
