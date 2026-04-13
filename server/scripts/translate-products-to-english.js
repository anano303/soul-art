const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Dynamic import for ESM module
let translate;
async function loadTranslate() {
  const mod = await import('google-translate-api-x');
  translate = mod.default || mod;
}

function sanitizeMongoUri(uri) {
  return String(uri || '')
    .replace(/appName(?=&|$)/g, 'appName=SoulArt')
    .replace(/appName=&/g, 'appName=SoulArt&')
    .replace(/\?&/, '?')
    .replace(/&&/g, '&');
}

const MONGODB_URI = sanitizeMongoUri(process.env.MONGODB_URI || process.env.DATABASE_URL);
const DRY_RUN = !process.argv.includes('--apply');

// ============ STATIC TRANSLATION MAPS ============

const CATEGORY_MAP = {
  // Main categories
  'ნახატები': 'Paintings',
  'ხელნაკეთი ნივთები': 'Handmade Items',
  'ტანსაცმელი': 'Clothing',
  'აქსესუარები': 'Accessories',
  'ფეხსაცმელი': 'Footwear',
  'საცურაო': 'Swimwear',
  'სხვა': 'Other',

  // Painting subcategories
  'აბსტრაქცია': 'Abstract',
  'პეიზაჟი': 'Landscape',
  'პორტრეტი': 'Portrait',
  'შავ-თეთრი': 'Black & White',
  'ანიმაციური': 'Animation',
  'ციფრული ილუსტრაციები': 'Digital Illustrations',
  'მინიატურა': 'Miniature',

  // Handmade subcategories
  'კერამიკა': 'Ceramics',
  'ხის ნაკეთობები': 'Woodwork',
  'სამკაულები': 'Jewelry',
  'ტექსტილი': 'Textile',
  'მინანქარი': 'Enamel',
  'სკულპტურები': 'Sculptures',
  'დეკორი': 'Decor',
  'ყვავილები': 'Flowers',
  'სანთლები': 'Candles',

  // Clothing subcategories
  'მაისურები': 'T-Shirts',
  'კაბები': 'Dresses',
  'ჰუდები': 'Hoodies',

  // Accessories subcategories
  'კეპები': 'Caps',
  'პანამები': 'Panama Hats',

  // Footwear subcategories
  'სპორტული': 'Sport',
  'ყოველდღიური': 'Casual',

  // Swimwear subcategories
  'საცურაო კოსტუმები': 'Swimsuits',
};

// Materials translation map (from existing migration script)
const MATERIAL_MAP = {
  'ტილო': 'Canvas',
  'ტილოზე': 'On canvas',
  'ტილოს': 'Canvas',
  'აკრილი': 'Acrylic',
  'აკრილის': 'Acrylic',
  'აკრილით': 'With acrylic',
  'ზეთი': 'Oil paint',
  'ზეთის': 'Oil',
  'ზეთით': 'With oil',
  'ზეთის საღებავი': 'Oil paint',
  'ფანქარი': 'Pencil',
  'ფანქრის': 'Pencil',
  'ფანქრით': 'With pencil',
  'მუყაო': 'Cardboard',
  'მუყაოზე': 'On cardboard',
  'ხე': 'Wood',
  'ხის': 'Wood',
  'ხეზე': 'On wood',
  'ხისგან': 'From wood',
  'აკვარელი': 'Watercolor',
  'აკვარელით': 'With watercolor',
  'ქაღალდი': 'Paper',
  'ქაღალდზე': 'On paper',
  'ქაღალდის': 'Paper',
  'კოლაჟი': 'Collage',
  'პასტელი': 'Pastel',
  'ტემპერა': 'Tempera',
  'გუაში': 'Gouache',
  'ტუში': 'Ink',
  'მელანი': 'Ink',
  'ქსოვილი': 'Fabric',
  'ტექსტილი': 'Textile',
  'თიხა': 'Clay',
  'თიხით': 'With clay',
  'შავი თიხა': 'Black clay',
  'კერამიკა': 'Ceramic',
  'ფაიფური': 'Porcelain',
  'ბრინჯაო': 'Bronze',
  'ლითონი': 'Metal',
  'ლითონით': 'With metal',
  'მინა': 'Glass',
  'მინაზე': 'On glass',
  'ქვა': 'Stone',
  'ქვით': 'With stone',
  'შერეული ტექნიკა': 'Mixed media',
  'შერეული მასალა': 'Mixed materials',
  'შერეული მასალები': 'Mixed materials',
  'ზეთი ტილოზე': 'Oil on canvas',
  'აკრილი ტილოზე': 'Acrylic on canvas',
  'აკვარელი ქაღალდზე': 'Watercolor on paper',
  'ფანქარი ქაღალდზე': 'Pencil on paper',
  'აკვარელი ტილოზე': 'Watercolor on canvas',
  'ფანქარი ტილოზე': 'Pencil on canvas',
  'ციფრული': 'Digital',
  'ნაჭერი': 'Cloth',
  'ტექსტურული პასტა': 'Texture paste',
  'ბამბა': 'Cotton',
  'ბამბის ძაფი': 'Cotton yarn',
  'მასტერხინი': 'Palette knife',
  'შიმერები': 'Shimmers',
  'კალამი': 'Pen',
  'ჩარჩო': 'Frame',
  'ვატმანი': 'Whatman paper',
  'ბისერები': 'Beads',
  'მძივები': 'Beads',
  'აკრილის საღებავი': 'Acrylic paint',
  'ეპოქსი': 'Epoxy',
  'კრისტალები': 'Crystals',
  'რეზინი': 'Resin',
  'ფურცელი': 'Sheet',
  'ქვეჩარჩოზე': 'On subframe',
  'ოქროს ფირფიტები': 'Gold leaf',
  'პოტალი': 'Gold leaf',
  'ხელნაკეთი თიხა': 'Handmade clay',
  'ტყავი': 'Leather',
  'ბატიკა': 'Batik',
  'ცვილი': 'Wax',
  'პარაფინი': 'Paraffin',
  'სოიის ცვილი': 'Soy wax',
  'ნაბდი': 'Felt',
  'მარგალიტი': 'Pearl',
  'მარგალიტის და შუშის მძივები': 'Pearl and glass beads',
  'თექა': 'Felt',
  'სპრეი': 'Spray',
  'გრაფიტი': 'Graphite',
  'ცარცი': 'Chalk',
  'მარკერი': 'Marker',
  'სანთელი': 'Candle',
  'არომატული სანთელი': 'Aromatic candle',
  'პლასტელინი': 'Plasticine',
  'პოლიმერული თიხა': 'Polymer clay',
  'საღებავი': 'Paint',
  'ლაქი': 'Lacquer',
  'ძაფი': 'Thread',
  'ბუნებრივი ქვა': 'Natural stone',
  'ვერცხლი': 'Silver',
  'ოქრო': 'Gold',
  'ბრილიანტი': 'Diamond',
  'რკინა': 'Iron',
  'ალუმინი': 'Aluminum',
  'ფოლადი': 'Steel',
  'სპილენძი': 'Copper',
  'აბრეშუმი': 'Silk',
  'სელი': 'Linen',
  'მატყლი': 'Wool',
};

// Color translation map
const COLOR_MAP = {
  'შავი': 'Black',
  'თეთრი': 'White',
  'წითელი': 'Red',
  'ლურჯი': 'Blue',
  'მწვანე': 'Green',
  'ყვითელი': 'Yellow',
  'ნაცრისფერი': 'Gray',
  'ვარდისფერი': 'Pink',
  'იისფერი': 'Purple',
  'ყავისფერი': 'Brown',
  'ნარინჯისფერი': 'Orange',
  'ოქროსფერი': 'Gold',
  'ვერცხლისფერი': 'Silver',
  'ბეჟი': 'Beige',
  'სხვა': 'Other',
};

function isGeorgian(text) {
  if (!text) return false;
  // Georgian Unicode range: U+10A0-U+10FF (Mkhedruli + Asomtavruli)
  return /[\u10A0-\u10FF]/.test(text);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Translate using static map, fallback to API
function translateMaterial(mat) {
  const trimmed = (mat || '').trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  
  // Check static map (case-insensitive)
  for (const [ka, en] of Object.entries(MATERIAL_MAP)) {
    if (ka.toLowerCase() === lower) return en;
  }
  return null; // will use API
}

function translateCategory(cat) {
  if (!cat || typeof cat !== 'string') return null;
  const trimmed = cat.trim();
  return CATEGORY_MAP[trimmed] || null;
}

function translateColor(clr) {
  if (!clr || typeof clr !== 'string') return null;
  const trimmed = clr.trim();
  return COLOR_MAP[trimmed] || null;
}

// Batch translate via Google Translate API
async function batchTranslate(texts) {
  if (!texts.length) return [];
  
  // Deduplicate
  const unique = [...new Set(texts)];
  const results = {};
  
  // Process in batches of 20 to avoid rate limiting
  for (let i = 0; i < unique.length; i += 20) {
    const batch = unique.slice(i, i + 20);
    try {
      const res = await translate(batch, { from: 'ka', to: 'en' });
      const arr = Array.isArray(res) ? res : [res];
      arr.forEach((r, idx) => {
        results[batch[idx]] = r.text;
      });
    } catch (err) {
      console.error(`  Translation batch error at ${i}: ${err.message}`);
      // Fallback: try one by one
      for (const text of batch) {
        try {
          await sleep(500);
          const r = await translate(text, { from: 'ka', to: 'en' });
          results[text] = r.text;
        } catch (e2) {
          console.error(`  Single translation failed for "${text.substring(0, 30)}...": ${e2.message}`);
          results[text] = text; // Keep original as fallback
        }
      }
    }
    if (i + 20 < unique.length) {
      await sleep(300); // Rate limit between batches
    }
  }
  
  return texts.map(t => results[t] || t);
}

async function main() {
  await loadTranslate();
  
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (use --apply to write)' : 'APPLY'}`);
  console.log('Connecting to MongoDB...');
  
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  // Find all products
  const allProducts = await db.collection('products').find({}).toArray();
  console.log(`Total products in DB: ${allProducts.length}`);
  
  // Find products that need translation
  const needsTranslation = allProducts.filter(p => {
    const missingName = !p.nameEn && p.name && isGeorgian(p.name);
    const missingDesc = !p.descriptionEn && p.description && isGeorgian(p.description);
    const missingMaterials = (!p.materialsEn || p.materialsEn.length === 0) && p.materials && p.materials.length > 0 && p.materials.some(m => isGeorgian(m));
    const missingMainCat = !p.mainCategoryEn && p.mainCategory && isGeorgian(p.mainCategory);
    const missingSubCat = !p.subCategoryEn && p.subCategory && isGeorgian(p.subCategory);
    const missingColors = (!p.colorsEn || p.colorsEn.length === 0) && p.colors && p.colors.length > 0 && p.colors.some(c => isGeorgian(c));
    return missingName || missingDesc || missingMaterials || missingMainCat || missingSubCat || missingColors;
  });
  
  console.log(`Products needing translation: ${needsTranslation.length}`);
  
  if (needsTranslation.length === 0) {
    console.log('All products already have English translations!');
    await client.close();
    return;
  }
  
  // Collect all texts that need API translation
  const textsForAPI = { names: [], descriptions: [], materials: [] };
  
  // Phase 1: Static translations + collect API-needed texts
  const updates = [];
  
  for (const product of needsTranslation) {
    const update = { _id: product._id, fields: {} };
    
    // Name
    if (!product.nameEn && product.name && isGeorgian(product.name)) {
      textsForAPI.names.push({ productId: product._id, text: product.name });
    }
    
    // Description
    if (!product.descriptionEn && product.description && isGeorgian(product.description)) {
      textsForAPI.descriptions.push({ productId: product._id, text: product.description });
    }
    
    // Materials - try static first
    if ((!product.materialsEn || product.materialsEn.length === 0) && product.materials && product.materials.length > 0) {
      const matTranslations = [];
      const matNeedAPI = [];
      for (const mat of product.materials) {
        const staticTrans = translateMaterial(mat);
        if (staticTrans) {
          matTranslations.push(staticTrans);
        } else if (isGeorgian(mat)) {
          matNeedAPI.push(mat);
          matTranslations.push(null); // placeholder
        } else {
          matTranslations.push(mat); // already English
        }
      }
      update.materialsParts = { translations: matTranslations, needAPI: matNeedAPI, original: product.materials };
    }
    
    // Categories - static only
    if (!product.mainCategoryEn && product.mainCategory) {
      const trans = translateCategory(product.mainCategory);
      if (trans) update.fields.mainCategoryEn = trans;
    }
    if (!product.subCategoryEn && product.subCategory) {
      const trans = translateCategory(product.subCategory);
      if (trans) update.fields.subCategoryEn = trans;
    }
    
    // Colors - static only
    if ((!product.colorsEn || product.colorsEn.length === 0) && product.colors && product.colors.length > 0) {
      const colorTranslations = product.colors.map(c => translateColor(c) || c);
      if (colorTranslations.some((c, i) => c !== product.colors[i])) {
        update.fields.colorsEn = colorTranslations;
      }
    }
    
    updates.push(update);
  }
  
  // Phase 2: API translations for names and descriptions
  console.log(`\nAPI translation needed:`);
  console.log(`  Names: ${textsForAPI.names.length}`);
  console.log(`  Descriptions: ${textsForAPI.descriptions.length}`);
  
  // Collect unique materials needing API
  const allMatNeedAPI = new Set();
  for (const u of updates) {
    if (u.materialsParts) {
      u.materialsParts.needAPI.forEach(m => allMatNeedAPI.add(m));
    }
  }
  console.log(`  Materials (unique): ${allMatNeedAPI.size}`);
  
  // Translate names
  if (textsForAPI.names.length > 0) {
    console.log('\nTranslating names...');
    const nameTexts = textsForAPI.names.map(n => n.text);
    const nameResults = await batchTranslate(nameTexts);
    const nameMap = {};
    textsForAPI.names.forEach((n, i) => {
      nameMap[n.productId.toString()] = nameResults[i];
    });
    for (const u of updates) {
      if (nameMap[u._id.toString()]) {
        u.fields.nameEn = nameMap[u._id.toString()];
      }
    }
    console.log(`  Done: ${nameResults.length} names translated`);
  }
  
  // Translate descriptions
  if (textsForAPI.descriptions.length > 0) {
    console.log('\nTranslating descriptions...');
    const descTexts = textsForAPI.descriptions.map(d => d.text);
    const descResults = await batchTranslate(descTexts);
    const descMap = {};
    textsForAPI.descriptions.forEach((d, i) => {
      descMap[d.productId.toString()] = descResults[i];
    });
    for (const u of updates) {
      if (descMap[u._id.toString()]) {
        u.fields.descriptionEn = descMap[u._id.toString()];
      }
    }
    console.log(`  Done: ${descResults.length} descriptions translated`);
  }
  
  // Translate materials that weren't in static map
  if (allMatNeedAPI.size > 0) {
    console.log('\nTranslating materials via API...');
    const matTexts = [...allMatNeedAPI];
    const matResults = await batchTranslate(matTexts);
    const matAPIMap = {};
    matTexts.forEach((t, i) => { matAPIMap[t] = matResults[i]; });
    
    // Fill in material translations
    for (const u of updates) {
      if (u.materialsParts) {
        const filled = u.materialsParts.translations.map((t, i) => {
          if (t === null) {
            return matAPIMap[u.materialsParts.original[i]] || u.materialsParts.original[i];
          }
          return t;
        });
        u.fields.materialsEn = filled;
      }
    }
    console.log(`  Done: ${allMatNeedAPI.size} material terms translated`);
  } else {
    // Fill in materials that were all static
    for (const u of updates) {
      if (u.materialsParts && !u.materialsParts.needAPI.length) {
        u.fields.materialsEn = u.materialsParts.translations;
      }
    }
  }
  
  // Phase 3: Apply updates
  const toApply = updates.filter(u => Object.keys(u.fields).length > 0);
  console.log(`\n=== Summary ===`);
  console.log(`Products to update: ${toApply.length}`);
  
  let countByField = { nameEn: 0, descriptionEn: 0, materialsEn: 0, mainCategoryEn: 0, subCategoryEn: 0, colorsEn: 0 };
  for (const u of toApply) {
    for (const f of Object.keys(u.fields)) {
      if (countByField[f] !== undefined) countByField[f]++;
    }
  }
  console.log('Fields being translated:');
  for (const [field, count] of Object.entries(countByField)) {
    if (count > 0) console.log(`  ${field}: ${count}`);
  }
  
  // Show samples
  console.log('\n=== Samples (first 5) ===');
  for (const u of toApply.slice(0, 5)) {
    const prod = needsTranslation.find(p => p._id.toString() === u._id.toString());
    console.log(`\n  Product: ${prod.name}`);
    if (u.fields.nameEn) console.log(`    nameEn: ${u.fields.nameEn}`);
    if (u.fields.descriptionEn) console.log(`    descriptionEn: ${u.fields.descriptionEn.substring(0, 100)}...`);
    if (u.fields.materialsEn) console.log(`    materialsEn: ${JSON.stringify(u.fields.materialsEn)}`);
    if (u.fields.mainCategoryEn) console.log(`    mainCategoryEn: ${u.fields.mainCategoryEn}`);
    if (u.fields.subCategoryEn) console.log(`    subCategoryEn: ${u.fields.subCategoryEn}`);
    if (u.fields.colorsEn) console.log(`    colorsEn: ${JSON.stringify(u.fields.colorsEn)}`);
  }
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN - no changes written. Use --apply to save.');
  } else {
    console.log('\nWriting to database...');
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < toApply.length; i++) {
      const u = toApply[i];
      try {
        // Clean up materialsParts before $set
        const setFields = { ...u.fields };
        await db.collection('products').updateOne(
          { _id: u._id },
          { $set: setFields }
        );
        success++;
        if ((i + 1) % 50 === 0) {
          console.log(`  Progress: ${i + 1}/${toApply.length}`);
        }
      } catch (err) {
        failed++;
        console.error(`  Failed to update ${u._id}: ${err.message}`);
      }
    }
    
    console.log(`\n✅ Done! Updated: ${success}, Failed: ${failed}`);
  }
  
  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
