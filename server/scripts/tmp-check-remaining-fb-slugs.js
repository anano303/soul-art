const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function sanitizeMongoUri(uri) {
  return String(uri || '')
    .replace(/appName(?=&|$)/g, 'appName=SoulArt')
    .replace(/appName=&/g, 'appName=SoulArt&')
    .replace(/\?&/, '?')
    .replace(/&&/g, '&');
}

const MONGODB_URI = sanitizeMongoUri(process.env.MONGODB_URI || process.env.DATABASE_URL);

// All FB slugs from the scan
const FB_SLUGS = [
  { slug: 'httpswwwinstagramcomartekoek', author: 'ARTEKO', count: 28 },
  { slug: 'natia-chijavadze', author: 'Natia Chijavadze', count: 20 },
  { slug: 'kkl-beads', author: 'KKL beads', count: 20 },
  { slug: 'ninis-gift-shop', author: "Nini's gift shop", count: 18 },
  { slug: 'httpswwwinstagramcombaruaruart', author: 'მარიამ გოგოლაძე', count: 18 },
  { slug: 'temod', author: 'TemoD', count: 14 },
  { slug: 'artist-11', author: 'ხელნაკეთი კედლის საათები და პანოები', count: 11 },
  { slug: 'mariam-kiparoidze', author: 'Mariam kiparoidze', count: 8 },
  { slug: 'artist-12', author: 'ელენე', count: 8 },
  { slug: 'irmatsindeliani-art', author: 'Irma Tsindeliani', count: 7 },
  { slug: 'gigauri', author: 'mamuka gigauri', count: 7 },
  { slug: 'miriani', author: 'Miriani', count: 7 },
  { slug: 'httpswwwfacebookcomshare17j9w1majemibext', author: 'LeNi', count: 7 },
  { slug: 'ninogudadzeart', author: 'ნინო გუდაძე', count: 7 },
  { slug: 'httpswwwfacebookcomshare14vtvvdw7mpmibex', author: 'ნუცა კობახიძე', count: 6 },
  { slug: 'ketos-art', author: 'keto chekurishvili', count: 5 },
  { slug: 'artist-21', author: 'რუსუდანი / ისარი', count: 5 },
  { slug: 'is-ari', author: 'ისარი', count: 5 },
  { slug: 'ekaterinesubelianiart', author: 'EkaterineSubelianiArt', count: 5 },
  { slug: 'liza-mumladze', author: 'liza mumladze', count: 5 },
  { slug: 'kristi-artspace', author: 'Kristi artspace', count: 5 },
  { slug: 'nonagvimradze', author: 'ნონა ასლამაზიშვილი', count: 5 },
  { slug: 'artist-4', author: 'ნინი', count: 4 },
  { slug: 'dona', author: 'Madona Gigauri', count: 4 },
  { slug: 'keto', author: 'ქეთო ივანელაშვილი', count: 4 },
  { slug: 'lumina', author: 'lumina მინის სტუდია', count: 4 },
  { slug: 'dvalidvali', author: 'Tamara Dvali', count: 4 },
  { slug: 'nini-pochkhidze', author: 'Nini Pochkhidze', count: 4 },
  { slug: 'artist-14ia', author: 'ია', count: 4 },
  { slug: 'ekaterinasart', author: 'Ekaterine', count: 3 },
  { slug: 'ioane-kravelidze', author: 'იოანე კრაველიძე', count: 3 },
  { slug: 'artist-20', author: 'ირაკლი კერატიშვილი', count: 3 },
  { slug: 'apas', author: 'თემო', count: 3 },
  { slug: 'tamari', author: 'Tamari', count: 3 },
  { slug: 'actress', author: 'Actress', count: 3 },
  { slug: 'mikavastudiogallery', author: 'Mikava Studio Gallery', count: 3 },
  { slug: 'tomalapatinagmailcom', author: 'ტომა', count: 3 },
  { slug: 'velora', author: 'Velora', count: 3 },
  { slug: 'artist-28', author: 'მამუკა მირიანაშვილი', count: 2 },
  { slug: 'sofiaarty', author: 'ARTSOFI', count: 2 },
  { slug: 'omia', author: 'Kakhaber Omiadze', count: 2 },
  { slug: 'keti-abulashvili', author: 'KETI ABULASHVILI', count: 2 },
  { slug: 'mintnikusha', author: 'ნიკოლოზ ასანიძე', count: 2 },
  { slug: 'artist-22', author: 'Beso Khabalashvili', count: 2 },
  { slug: 'naniko-gigolashvili', author: 'Naniko gigolashvili', count: 2 },
  { slug: 'artist-19', author: 'მარიამი', count: 2 },
  { slug: 'plushiflora', author: 'ნინო ფუტკარაძე', count: 2 },
  { slug: 'natela', author: 'ნათელა', count: 2 },
  { slug: 'de-08', author: 'D&E', count: 2 },
  { slug: 'ninasdecorations', author: "Nina's Decorations", count: 2 },
  { slug: 'keti-chechelashvili', author: 'Keti Chechelashvili', count: 2 },
  { slug: 'httpswwwinstagramcomkopalianiart', author: 'kopalianiart', count: 2 },
  { slug: 'leli-sartania', author: 'Leli Sartania', count: 2 },
  { slug: 'shalvatetrashvili', author: 'შალვა თეთრაშვილი', count: 2 },
  { slug: 'davidd', author: 'დავით მელიქიშვილი', count: 2 },
  { slug: 'sophospheri', author: 'სოფოსფერი', count: 1 },
  { slug: 'mariam', author: 'Mariam', count: 1 },
  { slug: 'geoart', author: 'GeoArt', count: 1 },
  { slug: 'bacho-shonia', author: 'Bacho Shonia', count: 1 },
  { slug: 'fennandart', author: 'FennAndArt', count: 1 },
  { slug: 'tikiart', author: 'Tiki Halloway', count: 1 },
  { slug: 'zazart', author: 'zaza tsimakuridze', count: 1 },
  { slug: 'ratigogshelidze', author: 'რატი205', count: 1 },
  { slug: 'tokesi', author: 'Tornike Xosikuridze', count: 1 },
  { slug: 'nino-abuladze-art', author: 'Nino Abuladze art', count: 1 },
  { slug: 'artist-23', author: 'ქეთი მეტრეველი', count: 1 },
  { slug: 'natialobzhanidze', author: 'ნათია', count: 1 },
  { slug: 'babi', author: 'Babi', count: 1 },
  { slug: 'artist-18', author: 'ნუცი ივანოვი', count: 1 },
  { slug: 'artist-15', author: 'სალომეს შემოქმედება', count: 1 },
  { slug: 'artist-14', author: 'გია ქათალანძე', count: 1 },
  { slug: 'bellge', author: 'Bella Tsikaridze', count: 1 },
  { slug: 'artist-13', author: 'თორნიკე მაჭარაშვილი', count: 1 },
  { slug: 'marin-pura', author: 'Marin Pura', count: 1 },
  { slug: 'harra', author: 'Harra', count: 1 },
  { slug: 'artist-10', author: 'ნანიკო ჩახოიანი', count: 1 },
  { slug: 'artist-9', author: 'სალომე მონიავა', count: 1 },
  { slug: 'artist-6', author: 'დავითი გაბუნია', count: 1 },
  { slug: 'artist-2', author: 'ანაქიმერიძე', count: 1 },
  { slug: 'thuna', author: 'თუნა ხასია', count: 1 },
];

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  // Get all sellers (role=seller) with their artistSlug
  const sellers = await db.collection('users').find(
    { role: 'seller' },
    { projection: { artistSlug: 1, name: 1, email: 1 } }
  ).toArray();
  
  const sellerSlugs = new Set(sellers.map(s => (s.artistSlug || '').toLowerCase()));
  
  // Also check products - which slugs have products already
  const productSlugs = await db.collection('products').distinct('artistSlug');
  const productSlugSet = new Set(productSlugs.map(s => (s || '').toLowerCase()));
  
  // Also check by user reference - products linked to sellers
  const sellerIds = sellers.map(s => s._id);
  const productsWithUser = await db.collection('products').aggregate([
    { $match: { user: { $in: sellerIds } } },
    { $group: { _id: '$user', count: { $sum: 1 } } }
  ]).toArray();
  const sellersWithProducts = new Set(productsWithUser.map(p => p._id.toString()));
  
  const migrated = [];
  const remaining = [];
  
  for (const entry of FB_SLUGS) {
    const slugLower = entry.slug.toLowerCase();
    const hasSeller = sellerSlugs.has(slugLower);
    const hasProducts = productSlugSet.has(slugLower);
    
    // Check if the seller has products via user ObjectId
    let sellerHasProducts = false;
    if (hasSeller) {
      const seller = sellers.find(s => (s.artistSlug || '').toLowerCase() === slugLower);
      if (seller && sellersWithProducts.has(seller._id.toString())) {
        sellerHasProducts = true;
      }
    }
    
    if (hasSeller && (hasProducts || sellerHasProducts)) {
      migrated.push({ ...entry, status: 'MIGRATED' });
    } else if (hasSeller && !hasProducts && !sellerHasProducts) {
      remaining.push({ ...entry, status: 'SELLER_EXISTS_NO_PRODUCTS' });
    } else {
      remaining.push({ ...entry, status: 'NO_SELLER' });
    }
  }
  
  // Summary
  const totalPosts = FB_SLUGS.reduce((sum, e) => sum + e.count, 0);
  const migratedPosts = migrated.reduce((sum, e) => sum + e.count, 0);
  const remainingPosts = remaining.reduce((sum, e) => sum + e.count, 0);
  
  console.log('=== სტატისტიკა ===');
  console.log(`სულ FB ავტორები: ${FB_SLUGS.length}`);
  console.log(`სულ FB პოსტები: ${totalPosts}`);
  console.log('');
  console.log(`✅ უკვე მიგრირებული ავტორები: ${migrated.length} (${migratedPosts} პოსტი)`);
  console.log(`❌ დარჩენილი (მოსაძიებელი): ${remaining.length} (${remainingPosts} პოსტი)`);
  
  console.log('\n=== ✅ მიგრირებული (წასაშლელები) ===');
  migrated.sort((a, b) => b.count - a.count);
  for (const m of migrated) {
    console.log(`  ${m.slug} — ${m.author} (${m.count} posts)`);
  }
  
  console.log('\n=== ❌ დარჩენილი (მოსაძიებელი) ===');
  remaining.sort((a, b) => b.count - a.count);
  for (const r of remaining) {
    const tag = r.status === 'SELLER_EXISTS_NO_PRODUCTS' ? '[სელერი არის, პროდუქტი არა]' : '[სელერი არ არის]';
    console.log(`  ${r.slug} — ${r.author} (${r.count} posts) ${tag}`);
  }
  
  // Output JSON for remaining
  console.log('\n=== დარჩენილი JSON ===');
  console.log(JSON.stringify(remaining.map(r => ({
    slug: r.slug,
    author: r.author,
    count: r.count,
    status: r.status
  })), null, 2));
  
  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
