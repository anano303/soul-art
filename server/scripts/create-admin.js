const { MongoClient } = require('mongodb');
const argon2 = require('argon2');

const MONGODB_URI =
  'mongodb+srv://soulartgeorgia_db_user:hzO24rdfnjaT6kWI@soulart.gacy33l.mongodb.net/?appName=SoulArt';

async function createAdmin() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const usersCollection = db.collection('users');

    // Check if admin already exists
    const existing = await usersCollection.findOne({
      email: 'admin@soulart.ge',
    });
    if (existing) {
      console.log('Admin user already exists!');
      return;
    }

    // Hash password with Argon2id (same config as the app)
    const hashedPassword = await argon2.hash('Qazqaz1!', {
      type: argon2.argon2id,
      memoryCost: 2 ** 14, // 16 MiB
      timeCost: 3,
      parallelism: 1,
    });

    const adminUser = {
      name: 'Admin',
      email: 'admin@soulart.ge',
      password: hashedPassword,
      role: 'admin',
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
    };

    const result = await usersCollection.insertOne(adminUser);
    console.log('Admin user created successfully!');
    console.log('ID:', result.insertedId);
    console.log('Email: admin@soulart.ge');
    console.log('Role: admin');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

createAdmin();
