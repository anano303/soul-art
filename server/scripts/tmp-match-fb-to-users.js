const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const fbSlugs = [
  { slug: 'httpswwwinstagramcomartekoek', authors: ['ARTEKO'], count: 28 },
  { slug: 'natia-chijavadze', authors: ['Natia Chijavadze'], count: 20 },
  { slug: 'kkl-beads', authors: ['KKL beads'], count: 20 },
  { slug: 'ninis-gift-shop', authors: ["Nini's gift shop"], count: 18 },
  { slug: 'httpswwwinstagramcombaruaruart', authors: ['მარიამ გოგოლაძე'], count: 18 },
  { slug: 'temod', authors: ['TemoD'], count: 14 },
  { slug: 'artist-11', authors: ['ხელნაკეთი კედლის საათები და პანოები'], count: 11 },
  { slug: 'mariam-kiparoidze', authors: ['Mariam kiparoidze'], count: 8 },
  { slug: 'artist-12', authors: ['ელენე'], count: 8 },
  { slug: 'irmatsindeliani-art', authors: ['Irma Tsindeliani'], count: 7 },
  { slug: 'gigauri', authors: ['mamuka gigauri'], count: 7 },
  { slug: 'miriani', authors: ['Miriani'], count: 7 },
  { slug: 'httpswwwfacebookcomshare17j9w1majemibext', authors: ['LeNi'], count: 7 },
  { slug: 'ninogudadzeart', authors: ['ნინო გუდაძე'], count: 7 },
  { slug: 'httpswwwfacebookcomshare14vtvvdw7mpmibex', authors: ['ნუცა კობახიძე'], count: 6 },
  { slug: 'ketos-art', authors: ['keto chekurishvili'], count: 5 },
  { slug: 'artist-21', authors: ['რუსუდანი', 'ისარი'], count: 5 },
  { slug: 'is-ari', authors: ['ისარი'], count: 5 },
  { slug: 'ekaterinesubelianiart', authors: ['EkaterineSubelianiArt'], count: 5 },
  { slug: 'liza-mumladze', authors: ['liza mumladze'], count: 5 },
  { slug: 'kristi-artspace', authors: ['Kristi artspace'], count: 5 },
  { slug: 'nonagvimradze', authors: ['ნონა ასლამაზიშვილი'], count: 5 },
  { slug: 'artist-4', authors: ['ნინი'], count: 4 },
  { slug: 'dona', authors: ['Madona Gigauri'], count: 4 },
  { slug: 'keto', authors: ['ქეთო ივანელაშვილი'], count: 4 },
  { slug: 'lumina', authors: ['lumina მინის სტუდია'], count: 4 },
  { slug: 'dvalidvali', authors: ['Tamara Dvali'], count: 4 },
  { slug: 'nini-pochkhidze', authors: ['Nini Pochkhidze'], count: 4 },
  { slug: 'artist-14ia', authors: ['ია'], count: 4 },
  { slug: 'ekaterinasart', authors: ['Ekaterine'], count: 3 },
  { slug: 'ioane-kravelidze', authors: ['იოანე კრაველიძე', 'ვანო კრაველიძე'], count: 3 },
  { slug: 'artist-20', authors: ['ირაკლი კერატიშვილი'], count: 3 },
  { slug: 'apas', authors: ['თემო'], count: 3 },
  { slug: 'tamari', authors: ['Tamari'], count: 3 },
  { slug: 'actress', authors: ['Actress'], count: 3 },
  { slug: 'mikavastudiogallery', authors: ['Mikava Studio Gallery'], count: 3 },
  { slug: 'tomalapatinagmailcom', authors: ['ტომა'], count: 3 },
  { slug: 'velora', authors: ['Velora'], count: 3 },
  { slug: 'artist-28', authors: ['მამუკა მირიანაშვილი'], count: 2 },
  { slug: 'sofiaarty', authors: ['ARTSOFI undefined'], count: 2 },
  { slug: 'omia', authors: ['Kakhaber Omiadze'], count: 2 },
  { slug: 'keti-abulashvili', authors: ['KETI ABULASHVILI'], count: 2 },
  { slug: 'mintnikusha', authors: ['ნიკოლოზ ასანიძე'], count: 2 },
  { slug: 'artist-22', authors: ['Beso Khabalashvili'], count: 2 },
  { slug: 'naniko-gigolashvili', authors: ['Naniko gigolashvili'], count: 2 },
  { slug: 'artist-19', authors: ['მარიამი'], count: 2 },
  { slug: 'plushiflora', authors: ['ნინო ფუტკარაძე'], count: 2 },
  { slug: 'natela', authors: ['ნათელა'], count: 2 },
  { slug: 'de-08', authors: ['D&E'], count: 2 },
  { slug: 'ninasdecorations', authors: ["Nina's Decorations"], count: 2 },
  { slug: 'keti-chechelashvili', authors: ['Keti Chechelashvili'], count: 2 },
  { slug: 'httpswwwinstagramcomkopalianiart', authors: ['kopalianiart'], count: 2 },
  { slug: 'leli-sartania', authors: ['Leli Sartania'], count: 2 },
  { slug: 'shalvatetrashvili', authors: ['შალვა თეთრაშვილი'], count: 2 },
  { slug: 'davidd', authors: ['დავით მელიქიშვილი'], count: 2 },
  { slug: 'sophospheri', authors: ['სოფოსფერი'], count: 1 },
  { slug: 'mariam', authors: ['Mariam'], count: 1 },
  { slug: 'geoart', authors: ['GeoArt'], count: 1 },
  { slug: 'bacho-shonia', authors: ['Bacho Shonia'], count: 1 },
  { slug: 'fennandart', authors: ['FennAndArt'], count: 1 },
  { slug: 'tikiart', authors: ['Tiki Halloway'], count: 1 },
  { slug: 'zazart', authors: ['zaza tsimakuridze'], count: 1 },
  { slug: 'ratigogshelidze', authors: ['რატი205'], count: 1 },
  { slug: 'tokesi', authors: ['Tornike Xosikuridze'], count: 1 },
  { slug: 'nino-abuladze-art', authors: ['Nino Abuladze art'], count: 1 },
  { slug: 'artist-23', authors: ['ქეთი მეტრეველი'], count: 1 },
  { slug: 'natialobzhanidze', authors: ['ნათია'], count: 1 },
  { slug: 'babi', authors: ['Babi'], count: 1 },
  { slug: 'artist-18', authors: ['ნუცი ივანოვი'], count: 1 },
  { slug: 'artist-15', authors: ['სალომეს შემოქმედება'], count: 1 },
  { slug: 'artist-14', authors: ['გია ქათალანძე'], count: 1 },
  { slug: 'bellge', authors: ['Bella Tsikaridze'], count: 1 },
  { slug: 'artist-13', authors: ['თორნიკე მაჭარაშვილი'], count: 1 },
  { slug: 'marin-pura', authors: ['Marin Pura'], count: 1 },
  { slug: 'harra', authors: ['Harra'], count: 1 },
  { slug: 'artist-10', authors: ['ნანიკო ჩახოიანი'], count: 1 },
  { slug: 'artist-9', authors: ['სალომე მონიავა'], count: 1 },
  { slug: 'artist-6', authors: ['დავითი გაბუნია'], count: 1 },
  { slug: 'artist-2', authors: ['ანაქიმერიძე'], count: 1 },
  { slug: 'thuna', authors: ['თუნა ხასია'], count: 1 },
];

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('test');

  const users = await db.collection('users').find(
    { role: { $in: ['seller', 'admin'] } },
    { projection: { slug: 1, name: 1, storeName: 1, email: 1 } }
  ).toArray();

  // Check which users already have products
  const productsByUser = await db.collection('products').aggregate([
    { $group: { _id: '$user', count: { $sum: 1 } } }
  ]).toArray();
  const userProductCount = {};
  productsByUser.forEach(p => { userProductCount[p._id.toString()] = p.count; });

  const norm = s => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

  const matches = [];

  for (const fb of fbSlugs) {
    const bestMatches = [];
    for (const user of users) {
      const uSlug = norm(user.slug);
      const uName = norm(user.name);
      const uStore = norm(user.storeName);
      const fbSlugN = norm(fb.slug);
      const fbAuthors = fb.authors.map(a => norm(a));

      let matchType = null;
      let priority = 99;

      // Slug exact match
      if (uSlug && fbSlugN === uSlug) { matchType = 'slug-exact'; priority = 1; }
      // Author name matches user name or store name exactly
      else if (fbAuthors.some(a => a && uName && a === uName)) { matchType = 'name-exact'; priority = 2; }
      else if (fbAuthors.some(a => a && uStore && a === uStore)) { matchType = 'store-exact'; priority = 2; }
      // Partial matches (require min length to avoid false positives)
      else if (fbAuthors.some(a => a && uName && a.length > 4 && (a.includes(uName) || uName.includes(a)))) { matchType = 'name-partial'; priority = 3; }
      else if (fbAuthors.some(a => a && uStore && a.length > 4 && uStore.length > 4 && (a.includes(uStore) || uStore.includes(a)))) { matchType = 'store-partial'; priority = 3; }
      // FB slug resembles user slug/name/store/email
      else if (uSlug && uSlug.length > 4 && fbSlugN.includes(uSlug)) { matchType = 'slug-contains'; priority = 4; }
      else if (user.email && fbSlugN.includes(norm(user.email).split('@')[0]) && norm(user.email).split('@')[0].length > 5) { matchType = 'email-in-slug'; priority = 4; }
      // storeName in slug
      else if (uStore && uStore.length > 4 && fbSlugN.includes(norm(uStore).replace(/\s/g, ''))) { matchType = 'store-in-slug'; priority = 4; }

      if (matchType) {
        bestMatches.push({
          userId: user._id.toString(),
          userSlug: user.slug,
          userName: user.name,
          userStore: user.storeName,
          userEmail: user.email,
          matchType,
          priority,
          userProducts: userProductCount[user._id.toString()] || 0,
        });
      }
    }

    if (bestMatches.length > 0) {
      bestMatches.sort((a, b) => a.priority - b.priority);
      matches.push({
        fb,
        userMatches: bestMatches.slice(0, 3),
      });
    }
  }

  console.log('=== MATCHES: FB Posts => Registered Users ===\n');
  for (const m of matches) {
    const best = m.userMatches[0];
    console.log(`FB: "${m.fb.slug}" (${m.fb.authors.join(', ')}) - ${m.fb.count} posts`);
    for (const u of m.userMatches) {
      console.log(`  => [${u.matchType}] ${u.userName} / store:"${u.userStore}" (${u.userEmail}) - has ${u.userProducts} products`);
    }
    console.log('');
  }

  console.log(`\nMatched: ${matches.length} / ${fbSlugs.length} FB slugs`);
  console.log(`Unmatched: ${fbSlugs.length - matches.length}`);

  await client.close();
}

main().catch(console.error);
