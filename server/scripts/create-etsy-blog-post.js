/**
 * Inserts the Etsy launch announcement blog post (unpublished).
 *
 * Usage:
 *   node scripts/create-etsy-blog-post.js            # dry run (prints what would be inserted)
 *   node scripts/create-etsy-blog-post.js --apply    # insert into DB
 *   node scripts/create-etsy-blog-post.js --apply --cover=https://...  # custom cover image
 *
 * The post is created with isPublished=false — publish it from the blog
 * admin when launching (that's the announcement's launch switch).
 */
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function sanitizeMongoUri(uri) {
  if (!uri) return uri;
  return uri.trim().replace(/^['"]|['"]$/g, '');
}

const MONGODB_URI = sanitizeMongoUri(
  process.env.MONGODB_URI || process.env.DATABASE_URL,
);
const APPLY = process.argv.includes('--apply');
const COVER_ARG = process.argv.find((a) => a.startsWith('--cover='));

const POST = {
  postType: 'article',
  title: 'შენი ხელოვნება ახლა Etsy-ზეც — SoulArt-ის ახალი ინტეგრაცია',
  titleEn: "Your Art Is Now on Etsy Too — SoulArt's New Integration",
  subtitle:
    'განათავსე ნამუშევრები მსოფლიოს უდიდეს ხელნაკეთი ნივთების ბაზარზე ერთი ღილაკით',
  subtitleEn:
    "List your works on the world's largest handmade marketplace with one click",
  content: `დიდი სიახლე გვაქვს: SoulArt-ის ნამუშევრები ახლა Etsy-ზეც შეიძლება გაიყიდოს — მსოფლიოს უდიდეს ხელნაკეთი ნივთებისა და ხელოვნების ბაზარზე, სადაც ყოველდღიურად მილიონობით მყიდველი დადის.

როგორ მუშაობს? ძალიან მარტივად: შენს ნამუშევრებში ყველა დამტკიცებულ ნამუშევარს გაუჩნდა ნარინჯისფერი Etsy ღილაკი. დააჭირე, ნახე ზუსტად როგორ გამოჩნდება ნამუშევარი Etsy-ზე — ინგლისური აღწერით, ტეგებით და დოლარში გადაყვანილი ფასით — და დაადასტურე. ყველაფერ დანარჩენს SoulArt აკეთებს: თარგმანს, კატეგორიის შერჩევას, ფოტოების ატვირთვას და გამოქვეყნებას SoulArt-ის ოფიციალურ Etsy მაღაზიაში.

რა ღირს? Etsy ყოველ განთავსებაზე საკუთარ მოსაკრებელს იღებს, ამიტომ განთავსება მცირე ერთჯერად საფასურს მოითხოვს — გადახდა შესაძლებელია როგორც ბალანსიდან, ისე ბარათით. Etsy-ზე ნამუშევრის ფასი შენს ფასზე ოდნავ მეტია — ეს სხვაობა Etsy-ის საკომისიოებსა და ვალუტის კონვერტაციას ფარავს. მთავარი კი ის არის, რომ გაყიდვისას შენ მიიღებ ზუსტად იმდენს, რამდენსაც SoulArt-ზე გაყიდვისას მიიღებდი.

ახალი ნამუშევრის დამატებაც იგივე გზით მუშაობს — ატვირთე ნამუშევარი, დაელოდე დამტკიცებას და შემდეგ ერთი ღილაკით გაიტანე საერთაშორისო ბაზარზე.

სრული ინსტრუქცია და ღილაკები ქვემოთ მოცემულ ბმულზეა — სცადე ახლავე!`,
  contentEn: `Big news: SoulArt artworks can now be sold on Etsy — the world's largest marketplace for handmade goods and art, visited by millions of buyers every day.

How does it work? Very simply: every approved artwork in My Artworks now has an orange Etsy button. Click it, see exactly how your artwork will appear on Etsy — with an English description, tags and a USD price — and confirm. SoulArt does everything else: translation, category selection, photo uploads and publishing to SoulArt's official Etsy shop.

What does it cost? Etsy charges its own fee per listing, so publishing requires a small one-time fee — payable from your balance or by card. The Etsy price is slightly above your price — that difference covers Etsy's commissions and currency conversion. Most importantly: when your artwork sells, you earn exactly what you would earn from a SoulArt sale.

Adding a new artwork works the same way — upload it, wait for approval, and then take it to the international market with a single click.

The full guide and buttons are at the link below — try it now!`,
  // For articles, artistUsername doubles as the link URL
  artistUsername: '/etsy-guide',
  linkName: 'ნახე ინსტრუქცია და სცადე',
  linkNameEn: 'See the guide and try it',
  author: 'SoulArt',
  authorEn: 'SoulArt',
  images: [],
  isPublished: false, // publish from the blog admin at launch time
  views: 0,
};

async function main() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  try {
    // Don't insert twice
    const existing = await db
      .collection('blogposts')
      .findOne({ title: POST.title });
    if (existing) {
      console.log(
        `Post already exists: ${existing._id} (isPublished=${existing.isPublished})`,
      );
      console.log(`URL: /blog/${existing._id}`);
      return;
    }

    // createdBy is required — use the first admin user
    const admin = await db.collection('users').findOne({ role: 'admin' });
    if (!admin) {
      console.error('No admin user found for createdBy');
      process.exit(1);
    }

    // Cover image: --cover=... or borrow the latest post's cover as placeholder
    let coverImage = COVER_ARG ? COVER_ARG.split('=').slice(1).join('=') : null;
    if (!coverImage) {
      const latest = await db
        .collection('blogposts')
        .find({ coverImage: { $exists: true, $ne: '' } })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();
      coverImage = latest[0]?.coverImage || null;
      if (coverImage) {
        console.log(
          `(placeholder cover borrowed from latest post — swap it in the blog editor)`,
        );
      }
    }
    if (!coverImage) {
      console.error(
        'No cover image available — pass one with --cover=https://...',
      );
      process.exit(1);
    }

    const doc = {
      ...POST,
      coverImage,
      createdBy: admin._id,
      publishDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!APPLY) {
      console.log('--- DRY RUN (pass --apply to insert) ---');
      console.log(`createdBy: ${admin.email} (${admin._id})`);
      console.log(`coverImage: ${coverImage}`);
      console.log(`title: ${doc.title}`);
      console.log(`link: ${doc.artistUsername} (${doc.linkName})`);
      console.log(`isPublished: ${doc.isPublished}`);
      return;
    }

    const result = await db.collection('blogposts').insertOne(doc);
    console.log(`✅ Blog post inserted: ${result.insertedId}`);
    console.log(`URL (after publishing): /blog/${result.insertedId}`);
    console.log(
      'It is UNPUBLISHED — review it in Admin → Blog, set the cover image, and publish at launch.',
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
