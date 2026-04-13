const { MongoClient } = require('mongodb');
const MONGODB_URI =
  'mongodb+srv://soulartgeorgia_db_user:hzO24rdfnjaT6kWI@soulart.gacy33l.mongodb.net/?appName=SoulArt';

(async () => {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const catsCol = db.collection('categories');
  const subsCol = db.collection('subcategories');

  // 1. კატეგორიები
  const cat1 = await catsCol.insertOne({
    name: 'ნახატი',
    nameEn: 'Paintings',
    description: 'ორიგინალური ნახატები ქართველი ხელოვანებისგან',
    descriptionEn: 'Original paintings from Georgian artists',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Category: ნახატი ->', cat1.insertedId);

  const cat2 = await catsCol.insertOne({
    name: 'ხელნაკეთი',
    nameEn: 'Handmade',
    description: 'უნიკალური ხელნაკეთი ნივთები',
    descriptionEn: 'Unique handmade items',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Category: ხელნაკეთი ->', cat2.insertedId);

  // 2. ნახატის ქვეკატეგორიები
  const paintingSubs = [
    { name: 'აბსტრაქცია', nameEn: 'Abstract' },
    { name: 'პეიზაჟი', nameEn: 'Landscape' },
    { name: 'პორტრეტი', nameEn: 'Portrait' },
    { name: 'შავ-თეთრი', nameEn: 'Black & White' },
    { name: 'ანიმაციური', nameEn: 'Animated' },
    { name: 'ციფრული ილუსტრაციები', nameEn: 'Digital Illustrations' },
    { name: 'მინიატურა', nameEn: 'Miniature' },
    { name: 'სხვა', nameEn: 'Other' },
  ];

  for (const sub of paintingSubs) {
    const r = await subsCol.insertOne({
      name: sub.name,
      nameEn: sub.nameEn,
      categoryId: cat1.insertedId,
      ageGroups: [],
      sizes: [],
      colors: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('  Sub:', sub.name, '->', r.insertedId);
  }

  // 3. ხელნაკეთის ქვეკატეგორიები
  const handmadeSubs = [
    { name: 'კერამიკა', nameEn: 'Ceramics' },
    { name: 'ხის ნაკეთობები', nameEn: 'Woodwork' },
    { name: 'სამკაულები', nameEn: 'Jewelry' },
    { name: 'ტექსტილი', nameEn: 'Textile' },
    { name: 'მინანქარი', nameEn: 'Enamel' },
    { name: 'სკულპტურები', nameEn: 'Sculptures' },
    { name: 'სხვა', nameEn: 'Other' },
  ];

  for (const sub of handmadeSubs) {
    const r = await subsCol.insertOne({
      name: sub.name,
      nameEn: sub.nameEn,
      categoryId: cat2.insertedId,
      ageGroups: [],
      sizes: [],
      colors: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('  Sub:', sub.name, '->', r.insertedId);
  }

  // 4. პროდუქტებს მივაბათ კატეგორიები
  const abstSub = await subsCol.findOne({
    name: 'აბსტრაქცია',
    categoryId: cat1.insertedId,
  });
  const paisSub = await subsCol.findOne({
    name: 'პეიზაჟი',
    categoryId: cat1.insertedId,
  });
  const portSub = await subsCol.findOne({
    name: 'პორტრეტი',
    categoryId: cat1.insertedId,
  });

  const productsCol = db.collection('products');

  const subMapping = {
    'ალუბალი და ნიღბები': abstSub._id,
    'მთა და მდინარე': paisSub._id,
    'სამი სახე': portSub._id,
    'ფერადი სიზმარი': abstSub._id,
    'ზღვა მზის ჩასვლისას': paisSub._id,
    'ხე და ორი სახე': portSub._id,
    'ტროპიკული სანაპირო': paisSub._id,
    'აყვავებული ხე': paisSub._id,
    'ზღვა მრგვალ ტილოზე': paisSub._id,
    'ტალღების ქალი': portSub._id,
  };

  const seller = await db
    .collection('users')
    .findOne({ email: 'beroshviliani100@gmail.com' });
  if (seller) {
    const allProducts = await productsCol.find({ user: seller._id }).toArray();
    for (const prod of allProducts) {
      const subId = subMapping[prod.name] || abstSub._id;
      await productsCol.updateOne(
        { _id: prod._id },
        {
          $set: {
            mainCategory: cat1.insertedId,
            mainCategoryEn: 'Paintings',
            subCategory: subId,
            category: 'ნახატი',
          },
        },
      );
      console.log('Updated product:', prod.name, '-> subCat:', subId);
    }
  }

  console.log('\nDone!');
  await client.close();
})();
