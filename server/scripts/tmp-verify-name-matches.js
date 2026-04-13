const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;

// Email -> slug -> FB author name mapping
const MATCHES = [
  { email: 'natiachijavadze@yahoo.com',          slug: 'natia-chijavadze',     fbName: 'Natia Chijavadze' },
  { email: 'qeti.chekurishvili@gmail.com',        slug: 'ketos-art',            fbName: 'keto chekurishvili' },
  { email: 'mumladzeliza22@gmail.com',            slug: 'liza-mumladze',        fbName: 'liza mumladze' },
  { email: 'pochkhidzenini288@gmail.com',         slug: 'nini-pochkhidze',      fbName: 'Nini Pochkhidze' },
  { email: 'keti.abulashvili.art@gmail.com',      slug: 'keti-abulashvili',     fbName: 'KETI ABULASHVILI' },
  { email: 'ratigogshelidze@gmail.com',           slug: 'ratigogshelidze',      fbName: 'რატი205' },
  { email: 'tornike.xosikuridze@icloud.com',     slug: 'tokesi',               fbName: 'Tornike Xosikuridze' },
  { email: 'vano.kravelidze@gmail.com',           slug: 'ioane-kravelidze',     fbName: 'იოანე კრაველიძე / ვანო კრაველიძე' },
  { email: 'tomalapatina@gmail.com',              slug: 'tomalapatinagmailcom', fbName: 'ტომა' },
  { email: 'natia.lobjanidze286@hum.tsu.edu.ge', slug: 'natialobzhanidze',     fbName: 'ნათია' },
  { email: 'marinpura.studio@gmail.com',          slug: 'marin-pura',          fbName: 'Marin Pura' },
  { email: 'ninofutkaradze98@gmail.com',          slug: 'plushiflora',          fbName: 'ნინო ფუტკარაძე' },
  { email: 'asanidze122@gmail.com',               slug: 'mintnikusha',          fbName: 'ნიკოლოზ ასანიძე' },
  { email: 'cisiaomiadze@yahoo.com',              slug: 'omia',                 fbName: 'Kakhaber Omiadze' },
];

(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  console.log('=== NAME COMPARISON: DB user name vs FB post author name ===\n');
  
  const exactMatches = [];
  const partialMatches = [];
  const noMatch = [];

  for (const m of MATCHES) {
    const user = await db.collection('users').findOne({ email: m.email.toLowerCase() });
    if (!user) {
      console.log(`${m.email} -> NOT FOUND IN DB`);
      noMatch.push(m);
      continue;
    }

    const dbName = (user.name || '').trim();
    const fbName = m.fbName;
    
    // Exact match (case insensitive)
    const exact = dbName.toLowerCase() === fbName.toLowerCase();
    
    // Check if FB name contains multiple options (e.g. "იოანე კრაველიძე / ვანო კრაველიძე")
    const fbNames = fbName.split('/').map(n => n.trim().toLowerCase());
    const anyExact = fbNames.some(fn => fn === dbName.toLowerCase());
    
    // Partial: all words in one appear in the other
    const dbWords = dbName.toLowerCase().split(/\s+/).filter(Boolean);
    const fbWords = fbName.toLowerCase().split(/[\s/]+/).filter(Boolean);
    const partialFwd = dbWords.every(w => fbWords.some(fw => fw.includes(w) || w.includes(fw)));
    const partialRev = fbWords.filter(w => w !== '/').some(w => dbWords.some(dw => dw.includes(w) || w.includes(dw)));
    
    const status = exact || anyExact ? 'EXACT' : (partialFwd || partialRev) ? 'PARTIAL' : 'NO MATCH';
    
    console.log(`${m.email}`);
    console.log(`  DB: "${dbName}" | FB: "${fbName}" | ${status}`);
    console.log(`  role: ${user.role} | slug: ${user.artistSlug || '-'}`);
    
    if (status === 'EXACT') exactMatches.push({ ...m, dbName, userId: String(user._id), role: user.role });
    else if (status === 'PARTIAL') partialMatches.push({ ...m, dbName, userId: String(user._id), role: user.role });
    else noMatch.push({ ...m, dbName, userId: String(user._id), role: user.role });
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Exact matches: ${exactMatches.length}`);
  exactMatches.forEach(m => console.log(`  ✅ ${m.email} | DB:"${m.dbName}" = FB:"${m.fbName}" | slug:${m.slug}`));
  
  console.log(`\nPartial matches: ${partialMatches.length}`);
  partialMatches.forEach(m => console.log(`  🟡 ${m.email} | DB:"${m.dbName}" ~ FB:"${m.fbName}" | slug:${m.slug}`));
  
  console.log(`\nNo match: ${noMatch.length}`);
  noMatch.forEach(m => console.log(`  ❌ ${m.email} | DB:"${m.dbName || '?'}" ≠ FB:"${m.fbName}" | slug:${m.slug}`));

  await client.close();
})();
