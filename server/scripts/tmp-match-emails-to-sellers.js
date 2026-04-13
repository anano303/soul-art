const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function sanitizeMongoUri(uri) {
  return String(uri || '')
    .replace(/appName(?=&|$)/g, 'appName=SoulArt')
    .replace(/appName=&/g, 'appName=SoulArt&')
    .replace(/\?&/, '?')
    .replace(/&&/g, '&');
}

const MONGODB_URI = sanitizeMongoUri(process.env.MONGODB_URI || process.env.DATABASE_URL);

const fbArtists = [
  { slug: 'natia-chijavadze', name: 'Natia Chijavadze' },
  { slug: 'temod', name: 'TemoD' },
  { slug: 'mariam-kiparoidze', name: 'Mariam kiparoidze' },
  { slug: 'irmatsindeliani-art', name: 'Irma Tsindeliani' },
  { slug: 'gigauri', name: 'mamuka gigauri' },
  { slug: 'miriani', name: 'Miriani' },
  { slug: 'ninogudadzeart', name: 'nino gudadze' },
  { slug: 'ketos-art', name: 'keto chekurishvili' },
  { slug: 'liza-mumladze', name: 'liza mumladze' },
  { slug: 'kristi-artspace', name: 'Kristi artspace' },
  { slug: 'nonagvimradze', name: 'nona aslamazishvili' },
  { slug: 'dona', name: 'Madona Gigauri' },
  { slug: 'keto', name: 'keto ivanelashvili' },
  { slug: 'nini-pochkhidze', name: 'Nini Pochkhidze' },
  { slug: 'dvalidvali', name: 'Tamara Dvali' },
  { slug: 'ioane-kravelidze', name: 'ioane kravelidze' },
  { slug: 'keti-abulashvili', name: 'KETI ABULASHVILI' },
  { slug: 'mintnikusha', name: 'nikoloz asanidze' },
  { slug: 'naniko-gigolashvili', name: 'Naniko gigolashvili' },
  { slug: 'plushiflora', name: 'nino futkaradze' },
  { slug: 'natela', name: 'natela' },
  { slug: 'marin-pura', name: 'Marin Pura' },
  { slug: 'ratigogshelidze', name: 'rati gogshelidze' },
  { slug: 'tokesi', name: 'Tornike Xosikuridze' },
  { slug: 'natialobzhanidze', name: 'natia lobzhanidze' },
  { slug: 'tomalapatinagmailcom', name: 'toma lapatina' },
  { slug: 'omia', name: 'Kakhaber Omiadze' },
  { slug: 'ekaterinasart', name: 'Ekaterine' },
  { slug: 'tamari', name: 'Tamari' },
  { slug: 'leli-sartania', name: 'Leli Sartania' },
  { slug: 'sophospheri', name: 'sofospheri' },
  { slug: 'sofiaarty', name: 'ARTSOFI' },
  { slug: 'fennandart', name: 'FennAndArt' },
  { slug: 'zazart', name: 'zaza tsimakuridze' },
  { slug: 'nino-abuladze-art', name: 'Nino Abuladze' },
  { slug: 'mikavastudiogallery', name: 'Mikava Studio Gallery' },
  { slug: 'bacho-shonia', name: 'Bacho Shonia' },
  { slug: 'geoart', name: 'GeoArt' },
  { slug: 'actress', name: 'Actress' },
  { slug: 'lumina', name: 'lumina' },
  { slug: 'velora', name: 'Velora' },
  { slug: 'tikiart', name: 'Tiki Halloway' },
  { slug: 'bellge', name: 'Bella Tsikaridze' },
  { slug: 'davidd', name: 'davit melikishvili' },
  { slug: 'shalvatetrashvili', name: 'shalva tetrashvili' },
  { slug: 'apas', name: 'temo' },
  { slug: 'ekaterinesubelianiart', name: 'Ekaterine Subeliani' },
  { slug: 'de-08', name: 'D and E' },
  { slug: 'ninasdecorations', name: 'Nina decorations' },
  { slug: 'keti-chechelashvili', name: 'Keti Chechelashvili' },
  { slug: 'nino-abuladze-art', name: 'Nino Abuladze' },
];

(async () => {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  const sellers = await db.collection('users').find(
    { role: 'seller', artistSlug: { $exists: true, $ne: null } },
    { projection: { email: 1, name: 1, storeName: 1, artistSlug: 1 } }
  ).toArray();

  const recentUsers = await db.collection('users').find(
    { role: 'user', createdAt: { $gte: new Date('2026-04-10T00:00:00Z') } },
    { projection: { email: 1, name: 1 } }
  ).toArray();

  const sellerSlugs = new Set(sellers.map(s => (s.artistSlug || '').toLowerCase()));

  console.log(`Recent users: ${recentUsers.length}`);
  console.log(`Existing sellers: ${sellers.length}\n`);
  console.log('=== Potential Seller Matches ===\n');

  const matches = [];
  for (const user of recentUsers) {
    const email = user.email.toLowerCase();
    const emailLocal = email.split('@')[0].replace(/[._+\-\d]/g, '');

    for (const fb of fbArtists) {
      const slugClean = fb.slug.replace(/-/g, '').toLowerCase();
      const nameClean = fb.name.toLowerCase().replace(/[^a-z]/g, '');
      const nameWords = fb.name.toLowerCase().split(/\s+/).filter(w => w.length >= 3);

      let matched = false;

      // Email local part contains slug or vice versa
      if (emailLocal.length >= 4 && (emailLocal.includes(slugClean) || slugClean.includes(emailLocal))) matched = true;
      // Email local contains full name
      if (emailLocal.length >= 4 && emailLocal.includes(nameClean)) matched = true;
      // Name words in email
      if (nameWords.some(w => w.length >= 4 && emailLocal.includes(w))) matched = true;
      // Slug in email (with @)
      if (email.includes(fb.slug.replace(/-/g, ''))) matched = true;

      if (matched) {
        const alreadySeller = sellerSlugs.has(fb.slug.toLowerCase());
        matches.push({ email: user.email, slug: fb.slug, fbName: fb.name, alreadySeller });
      }
    }
  }

  // Dedupe by email
  const seen = new Set();
  const unique = matches.filter(m => {
    if (seen.has(m.email + m.slug)) return false;
    seen.add(m.email + m.slug);
    return true;
  });

  unique.sort((a, b) => (a.alreadySeller ? 1 : 0) - (b.alreadySeller ? 1 : 0));

  for (const m of unique) {
    const status = m.alreadySeller ? '  (slug taken)' : '  >>> POTENTIAL SELLER';
    console.log(`  ${m.email}  ->  @${m.slug} (${m.fbName})${status}`);
  }

  console.log(`\nTotal potential matches: ${unique.length}`);
  console.log(`Need upgrade: ${unique.filter(m => !m.alreadySeller).length}`);

  await client.close();
})();
