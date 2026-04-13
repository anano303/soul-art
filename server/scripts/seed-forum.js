const { MongoClient, ObjectId } = require('mongodb');
const argon2 = require('argon2');

const MONGODB_URI =
  'mongodb+srv://soulartgeorgia_db_user:hzO24rdfnjaT6kWI@soulart.gacy33l.mongodb.net/?appName=SoulArt';

// Cloudinary demo account images (always available, supported by the frontend)
const ART_IMAGES = [
  'https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/nature-mountains',
  'https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/landscape-panorama',
  'https://res.cloudinary.com/demo/image/upload/v1/samples/animals/cat',
  'https://res.cloudinary.com/demo/image/upload/v1/samples/food/spices',
  'https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/beach-boat',
  'https://res.cloudinary.com/demo/image/upload/v1/samples/bike',
  'https://res.cloudinary.com/demo/image/upload/v1/samples/sheep',
  'https://res.cloudinary.com/demo/image/upload/v1/samples/cloudinary-group',
];

const FAKE_USERS = [
  { name: 'მარიამ ბერიძე', email: 'mariam.beridze@example.com' },
  { name: 'გიორგი კახიძე', email: 'giorgi.kakhidze@example.com' },
  { name: 'ნინო ჯავახიშვილი', email: 'nino.javakhishvili@example.com' },
  { name: 'დავით წერეთელი', email: 'davit.tsereteli@example.com' },
  { name: 'ანა გელაშვილი', email: 'ana.gelashvili@example.com' },
];

const FORUM_POSTS = [
  {
    content:
      'ვინ იცნობს ნიკო ფიროსმანის შემოქმედებას? ბოლო პერიოდში ძალიან დავინტერესდი მისი ნამუშევრებით. განსაკუთრებით მომწონს მისი ცხოველების გამოსახულებები — რამდენად მარტივი და ამავდროულად ღრმა ემოციის მატარებელი ნამუშევრებია. რომელია თქვენი საყვარელი ნახატი ფიროსმანისა?',
    tags: ['ნახატები'],
    imageIndex: 0,
    authorIndex: 0,
    comments: [
      {
        content:
          'ფიროსმანი საუკეთესოა! ჩემი ფავორიტი "მარგარიტაა" — ის ემოცია რომელსაც გადმოსცემს, განუმეორებელია.',
        authorIndex: 1,
      },
      {
        content:
          'ძალიან მიყვარს მისი "ვაზით დატვირთული ურემი". ქართული სოფლის სულისკვეთებას ასეთი სიზუსტით ვერავინ გადმოსცემს.',
        authorIndex: 3,
      },
    ],
  },
  {
    content:
      'დღეს ახალი ნახატი დავამთავრე — ზეთის საღებავებით. თემა არის თბილისის ძველი ქალაქი მზის ჩასვლისას. რჩევები მომეცით, რა შეიძლება გავაუმჯობესო? პირველად ვცდილობ ურბანულ ლანდშაფტს.',
    tags: ['ნახატები'],
    imageIndex: 1,
    authorIndex: 1,
    comments: [
      {
        content:
          'ძალიან ლამაზია! ფერების შერჩევა საოცარია. ცოტა მეტი კონტრასტი თუ დაამატებ ჩრდილებში, კიდევ უფრო გამოცოცხლდება.',
        authorIndex: 2,
      },
      {
        content:
          'მომწონს ატმოსფერო! ძველი თბილისის სულისკვეთება კარგად იგრძნობა.',
        authorIndex: 4,
      },
      {
        content:
          'ცა ძალიან კარგად გამოგსვლია. წინა პლანზე დეტალების მეტი დამუშავება კარგი იქნებოდა.',
        authorIndex: 0,
      },
    ],
  },
  {
    content:
      'ხელნაკეთი კერამიკული ჭიქები გავაკეთე ქართული ორნამენტებით. ყოველი ჭიქა უნიკალურია, ხელით არის მოხატული. თუ ვინმეს გაქვთ გამოცდილება კერამიკაში, მომწერეთ — მინდა ტექნიკის გაუმჯობესება.',
    tags: ['ხელნაკეთი ნივთები'],
    imageIndex: 3,
    authorIndex: 2,
    comments: [
      {
        content:
          'რა ლამაზია! ორნამენტები ძალიან ზუსტად გაქვს გაკეთებული. გამოწვა 1050°C-ზე ცადე, კარგ შედეგს მოგცემს.',
        authorIndex: 3,
      },
    ],
  },
  {
    content:
      'იმპრესიონიზმის მოყვარულები თუ ხართ? მონეს "შთაბეჭდილება. მზის ამოსვლა" ერთ-ერთი ჩემი საყვარელი ნახატია. როგორ ფიქრობთ, რომელი იმპრესიონისტი ხელოვანია ყველაზე გავლენიანი?',
    tags: ['ნახატები', 'სხვა'],
    imageIndex: 4,
    authorIndex: 3,
    comments: [
      {
        content:
          'ჩემთვის დეგა ნომერ პირველია! მისი ბალერინების სერია საოცარია.',
        authorIndex: 0,
      },
      {
        content:
          'მონე რა თქმა უნდა! "წყლის ზამბახები" ხელოვნების ისტორიაში ერთ-ერთი ყველაზე მნიშვნელოვანი სერიაა.',
        authorIndex: 4,
      },
    ],
  },
  {
    content:
      'ხელნაკეთი სანთლები ვაკეთებ სოიის ცვილისგან, ქართული ეთერზეთებით — ლავანდა, ევკალიპტი, ფიჭვი. ყოველი სანთელი 40 საათამდე იწვის. რა ტიპის არომატები გამოგივლიათ საუკეთესო? 🕯️',
    tags: ['ხელნაკეთი ნივთები', 'სხვა'],
    imageIndex: 5,
    authorIndex: 4,
    comments: [
      {
        content:
          'ლავანდა და ვანილის ნაზავი საოცარია! ცადე ციტრუსებთანაც კომბინაცია.',
        authorIndex: 1,
      },
      {
        content: 'სოიის ცვილი საუკეთესო არჩევანია! რამდენ ხანში გიმაგრდებათ?',
        authorIndex: 2,
      },
      {
        content:
          'ფიჭვის არომატი ზამთარში არის საუკეთესო. დარიჩინიც დაამატე — ძალიან თბილი ატმოსფეროა.',
        authorIndex: 0,
      },
    ],
  },
  {
    content:
      'აკვარელით პირველად ვცდილობ პორტრეტის ხატვას. რთულია ფერების კონტროლი — წყალი ყველაფერს ცვლის! გამოცდილი აკვარელისტების რჩევებს მოვისმენდი.',
    tags: ['ნახატები'],
    imageIndex: 6,
    authorIndex: 0,
    comments: [
      {
        content: 'აკვარელი მოთმინებას მოითხოვს! ფენა-ფენა იმუშავე, არ იჩქარო.',
        authorIndex: 3,
      },
      {
        content:
          'კანის ტონებისთვის ყვითელი ოქრა + კადმიუმ წითელი + ცოტა ულტრამარინი — ეს ბაზა კარგია.',
        authorIndex: 1,
      },
    ],
  },
  {
    content:
      'მინანქრის სამკაულებს ვქმნი — ყურთამფრქვევები, ბეჭდები, ყელსაბამები. ქართული მოტივებით ვამუშავებ — ჯვრები, ვაზი, ფრინველები. რომელი ტიპის სამკაული ყიდვადია ბოლო პერიოდში?',
    tags: ['ხელნაკეთი ნივთები'],
    imageIndex: 2,
    authorIndex: 3,
    comments: [
      {
        content:
          'მინიმალისტური დიზაინი ახლა ძალიან პოპულარულია. წვრილი ელეგანტური ნაჭრები კარგად იყიდება.',
        authorIndex: 2,
      },
      {
        content:
          'ეთნიკური მოტივები ტურისტებში ძალიან მოთხოვნადია! გააგრძელე ეგ მიმართულება.',
        authorIndex: 4,
      },
    ],
  },
  {
    content:
      'დღევანდელი არტ-თერაპიის სესიაზე ძალიან კარგი შედეგი მივიღე. არტ-თერაპია ნამდვილად სასწაულებს ახდენს — სტრესი და შფოთვა მყისიერად მცირდება. ვინმე სცადეთ?',
    tags: ['სხვა'],
    imageIndex: 7,
    authorIndex: 2,
    comments: [
      {
        content:
          'არტ-თერაპია ჩემთვის ცხოვრების შემცვლელი იყო! ახლა ყოველ კვირას ვხატავ.',
        authorIndex: 4,
      },
      {
        content:
          'მეც მინდა ვცადო! სად შეიძლება ჯგუფურ სესიაზე მოხვედრა თბილისში?',
        authorIndex: 1,
      },
    ],
  },
];

async function seedForumPosts() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const forumsCollection = db.collection('forums');
    const usersCollection = db.collection('users');

    // ძველი ფორუმ პოსტების წაშლა
    const deleted = await forumsCollection.deleteMany({});
    console.log(`🗑️  წაიშალა ${deleted.deletedCount} ძველი პოსტი`);

    // ფეიკ იუზერების შექმნა
    const fakePassword = await argon2.hash('TestUser123!', {
      type: argon2.argon2id,
      memoryCost: 2 ** 14,
      timeCost: 3,
      parallelism: 1,
    });

    const userIds = [];
    for (const fakeUser of FAKE_USERS) {
      const existing = await usersCollection.findOne({ email: fakeUser.email });
      if (existing) {
        userIds.push(existing._id);
        console.log(`  👤 ${fakeUser.name} — უკვე არსებობს`);
      } else {
        const result = await usersCollection.insertOne({
          name: fakeUser.name,
          email: fakeUser.email,
          password: fakePassword,
          role: 'user',
          knownDevices: [],
          followers: [],
          following: [],
          followersCount: 0,
          followingCount: 0,
          shippingAddresses: [],
          balance: 0,
          referralBalance: 0,
          salesCommissionBalance: 0,
          totalSalesCommissions: 0,
          totalEarnings: 0,
          totalReferrals: 0,
          profileViews: 0,
          artistReviewsCount: 0,
          artistDirectReviewsCount: 0,
          monthlyWithdrawals: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        userIds.push(result.insertedId);
        console.log(`  ✅ ${fakeUser.name} — შეიქმნა`);
      }
    }

    const now = new Date();
    const posts = FORUM_POSTS.map((post, index) => {
      const createdAt = new Date(
        now.getTime() - (FORUM_POSTS.length - index) * 2 * 24 * 60 * 60 * 1000,
      );

      const comments = (post.comments || []).map((comment, ci) => ({
        _id: new ObjectId(),
        user: userIds[comment.authorIndex],
        content: comment.content,
        parentId: null,
        replies: [],
        likes: Math.floor(Math.random() * 5),
        likesArray: [],
        createdAt: new Date(
          createdAt.getTime() + (ci + 1) * 3 * 60 * 60 * 1000,
        ),
        updatedAt: new Date(
          createdAt.getTime() + (ci + 1) * 3 * 60 * 60 * 1000,
        ),
      }));

      return {
        content: post.content,
        user: userIds[post.authorIndex],
        tags: post.tags,
        imagePath: ART_IMAGES[post.imageIndex],
        comments,
        likes: Math.floor(Math.random() * 15) + 1,
        likesArray: [],
        createdAt,
        updatedAt: createdAt,
      };
    });

    const result = await forumsCollection.insertMany(posts);
    console.log(`\n✅ ${result.insertedCount} ფორუმ პოსტი შეიქმნა!`);
    posts.forEach((p, i) => {
      const authorName = FAKE_USERS[FORUM_POSTS[i].authorIndex].name;
      console.log(
        `  📝 ${authorName}: ${p.tags.join(', ')} — ${p.comments.length} კომენტარი`,
      );
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

seedForumPosts();
