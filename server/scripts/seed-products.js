const { MongoClient, ObjectId } = require('mongodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const MONGODB_URI =
  'mongodb+srv://soulartgeorgia_db_user:hzO24rdfnjaT6kWI@soulart.gacy33l.mongodb.net/?appName=SoulArt';

const s3 = new S3Client({
  region: 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = 'soulart-s3';

const PAINTINGS_DIR = 'c:\\Users\\a.beroshvili\\Desktop\\ნახატები';

// Product info for each painting (mapped by index after sorting files)
const PRODUCTS = [
  {
    name: 'ალუბალი და ნიღბები',
    nameEn: 'Cherries and Masks',
    description:
      'ორიგინალური ზეთის ნახატი ტილოზე. სიურეალისტური კომპოზიცია ალუბლით და ნიღბებით, ფერადი და ემოციური. შესანიშნავი არჩევანია თანამედროვე ინტერიერისთვის.',
    descriptionEn:
      'Original oil painting on canvas. Surreal composition with cherries and masks, colorful and emotional.',
    price: 180,
    category: 'ნახატები',
    materials: ['ზეთი', 'ტილო'],
    materialsEn: ['Oil', 'Canvas'],
    dimensions: { width: 20, height: 25 },
  },
  {
    name: 'მთა და მდინარე',
    nameEn: 'Mountain and River',
    description:
      'ბუნების ლანდშაფტი — მთა, ტყე და მდინარე. ზეთის საღებავებით შესრულებული ტილოზე. ნახატი ავსებს სივრცეს სიმშვიდით და ბუნების ენერგიით.',
    descriptionEn:
      'Nature landscape — mountain, forest and river. Oil on canvas. Fills the space with tranquility and nature energy.',
    price: 220,
    category: 'ნახატები',
    materials: ['ზეთი', 'ტილო'],
    materialsEn: ['Oil', 'Canvas'],
    dimensions: { width: 20, height: 25 },
  },
  {
    name: 'სამი სახე',
    nameEn: 'Three Faces',
    description:
      'აბსტრაქტული პორტრეტი — სამი სახე ერთ ტილოზე. პიკასოს სტილით შესრულებული ფერადი კომპოზიცია. კუბისტური მიდგომა და ძლიერი ფერთა პალიტრა.',
    descriptionEn:
      'Abstract portrait — three faces on one canvas. Picasso-style colorful composition with cubist approach.',
    price: 250,
    category: 'ნახატები',
    materials: ['აკრილი', 'ტილო'],
    materialsEn: ['Acrylic', 'Canvas'],
    dimensions: { width: 30, height: 24 },
  },
  {
    name: 'ფერადი სიზმარი',
    nameEn: 'Colorful Dream',
    description:
      'სიურეალისტური ნახატი ფერადი ელემენტებით — სახლი, გემი, ბუნება და ადამიანის სილუეტი. სიზმრისებური ატმოსფერო და მრავალფეროვანი პალიტრა.',
    descriptionEn:
      'Surrealist painting with colorful elements — house, ship, nature and human silhouette. Dreamlike atmosphere.',
    price: 300,
    category: 'ნახატები',
    materials: ['აკრილი', 'ტილო'],
    materialsEn: ['Acrylic', 'Canvas'],
    dimensions: { width: 40, height: 30 },
  },
  {
    name: 'ზღვა მზის ჩასვლისას',
    nameEn: 'Sea at Sunset',
    description:
      'ზღვის ტალღები მზის ჩასვლისას, იალქნიანი გემი ჰორიზონტზე. ნახატი გადმოსცემს ზღვის ძალას და საღამოს სიმშვიდეს. ინტერიერის დეკორისთვის იდეალური.',
    descriptionEn:
      'Sea waves at sunset with sailboat on the horizon. Conveys the power of the sea and evening tranquility.',
    price: 280,
    category: 'ნახატები',
    materials: ['ზეთი', 'ტილო'],
    materialsEn: ['Oil', 'Canvas'],
    dimensions: { width: 40, height: 30 },
  },
  {
    name: 'ხე და ორი სახე',
    nameEn: 'Tree and Two Faces',
    description:
      'ფილოსოფიური ნახატი — ხის ტოტებში იმალება ორი ადამიანის სილუეტი. შემოდგომის ტონებში შესრულებული. სიმბოლური და ღრმა მნიშვნელობის მქონე ნამუშევარი.',
    descriptionEn:
      'Philosophical painting — two human silhouettes hidden in tree branches. Autumn tones. Symbolic and meaningful.',
    price: 350,
    category: 'ნახატები',
    materials: ['ზეთი', 'ტილო'],
    materialsEn: ['Oil', 'Canvas'],
    dimensions: { width: 40, height: 30 },
  },
  {
    name: 'ტროპიკული სანაპირო',
    nameEn: 'Tropical Coast',
    description:
      'ტროპიკული ზღვის ლანდშაფტი — პალმები, მთები, ლურჯი ზღვა და იალქნიანი გემი. ნახატი გადმოსცემს ზაფხულის სითბოს და სამოთხისებურ განწყობას.',
    descriptionEn:
      'Tropical seascape — palms, mountains, blue sea and sailboat. Summer warmth and paradise mood.',
    price: 200,
    category: 'ნახატები',
    materials: ['აკრილი', 'ტილო'],
    materialsEn: ['Acrylic', 'Canvas'],
    dimensions: { width: 40, height: 30 },
  },
  {
    name: 'აყვავებული ხე',
    nameEn: 'Blooming Tree',
    description:
      'გაზაფხულის ლანდშაფტი — ვარდისფერი აყვავებული ხე მწვანე მინდორზე. ნახატი ავსებს ოთახს სიცოცხლით, ფერებით და გაზაფხულის განწყობით.',
    descriptionEn:
      'Spring landscape — pink blooming tree on green meadow. Fills the room with life, colors and spring mood.',
    price: 190,
    category: 'ნახატები',
    materials: ['აკრილი', 'ტილო'],
    materialsEn: ['Acrylic', 'Canvas'],
    dimensions: { width: 25, height: 30 },
  },
  {
    name: 'ზღვა მრგვალ ტილოზე',
    nameEn: 'Sea on Round Canvas',
    description:
      'უნიკალური მრგვალი ტილო — ღამის ზღვა ფერადი ცით. ტალღები, მზისჩასვლის ანარეკლი და ფერადი წერტილები ქმნიან მაგიურ ატმოსფეროს.',
    descriptionEn:
      'Unique round canvas — night sea with colorful sky. Waves, sunset reflections and colorful dots create magical atmosphere.',
    price: 260,
    category: 'ნახატები',
    materials: ['აკრილი', 'ტილო'],
    materialsEn: ['Acrylic', 'Canvas'],
    dimensions: { width: 30, height: 30 },
    isOriginal: true,
  },
  {
    name: 'ტალღების ქალი',
    nameEn: 'Woman of Waves',
    description:
      'ქალის პორტრეტი ზღვის ტალღებით — თმა და წყალი ერთმანეთში ერწყმის. ძლიერი ფერები, დინამიური კომპოზიცია. თანამედროვე ხელოვნების შედევრი.',
    descriptionEn:
      'Woman portrait with sea waves — hair and water merge together. Strong colors, dynamic composition. Modern art masterpiece.',
    price: 320,
    category: 'ნახატები',
    materials: ['აკრილი', 'ტილო'],
    materialsEn: ['Acrylic', 'Canvas'],
    dimensions: { width: 25, height: 30 },
  },
];

async function uploadToS3(filePath, key) {
  const body = fs.readFileSync(filePath);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: 'image/jpeg',
    }),
  );
  return `https://${BUCKET}.s3.eu-north-1.amazonaws.com/${key}`;
}

async function main() {
  const files = fs
    .readdirSync(PAINTINGS_DIR)
    .filter(
      (f) => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'),
    )
    .sort();

  if (files.length !== PRODUCTS.length) {
    console.error(
      `File count (${files.length}) doesn't match product count (${PRODUCTS.length})`,
    );
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB');

  const db = client.db();
  const usersCol = db.collection('users');
  const productsCol = db.collection('products');

  const seller = await usersCol.findOne({
    email: 'beroshviliani100@gmail.com',
  });
  if (!seller) {
    console.error('Seller not found!');
    await client.close();
    return;
  }
  console.log(`Seller: ${seller.name} (${seller._id})\n`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const product = PRODUCTS[i];
    const filePath = path.join(PAINTINGS_DIR, file);
    const s3Key = `products/${Date.now()}-${i}-painting.jpg`;

    console.log(`📤 Uploading ${i + 1}/${files.length}: ${product.name}...`);
    const imageUrl = await uploadToS3(filePath, s3Key);
    console.log(`   ✅ ${imageUrl}`);

    const doc = {
      user: seller._id,
      name: product.name,
      nameEn: product.nameEn,
      brand: 'უცნობი',
      description: product.description,
      descriptionEn: product.descriptionEn,
      price: product.price,
      images: [imageUrl],
      category: product.category,
      countInStock: 1,
      status: 'APPROVED',
      reviews: [],
      rating: 0,
      numReviews: 0,
      hashtags: ['ნახატი', 'ხელოვნება', 'ტილო', 'ორიგინალი'],
      deliveryType: 'SoulArt',
      materials: product.materials,
      materialsEn: product.materialsEn,
      dimensions: product.dimensions,
      isOriginal: true,
      hideFromStore: false,
      viewCount: 0,
      variants: [],
      ageGroups: [],
      sizes: [],
      colors: [],
      colorsEn: [],
      discountPercentage: 0,
      referralDiscountPercent: 0,
      useArtistDefaultDiscount: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await productsCol.insertOne(doc);
    console.log(`   📝 Product ID: ${result.insertedId} — ₾${product.price}\n`);
  }

  console.log(`\n🎨 ${files.length} პროდუქტი წარმატებით შეიქმნა!`);
  await client.close();
}

main().catch(console.error);
