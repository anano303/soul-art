// Create Auction Admin Settings
const mongoose = require('mongoose');
require('dotenv').config();

async function createSettings() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Find admin user to set as auction admin
  const admin = await db.collection('users').findOne({
    role: 'admin',
  });

  if (!admin) {
    console.log('❌ No admin user found');
    return;
  }

  console.log('👑 Found admin:', admin._id, admin.email);

  // Check if settings already exist
  const existing = await db.collection('auctionadminsettings').findOne({});
  
  if (existing) {
    console.log('⚠️ Settings already exist:', existing);
    
    // Update with admin user
    await db.collection('auctionadminsettings').updateOne(
      { _id: existing._id },
      {
        $set: {
          auctionAdminUserId: admin._id,
          auctionAdminCommissionPercent: 30,
          updatedAt: new Date(),
        },
      },
    );
    console.log('✅ Updated auction admin settings');
  } else {
    // Create new settings
    await db.collection('auctionadminsettings').insertOne({
      auctionAdminUserId: admin._id,
      auctionAdminCommissionPercent: 30,
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Created auction admin settings');
  }

  // Verify
  const settings = await db.collection('auctionadminsettings').findOne({});
  console.log('\n📋 Current Settings:');
  console.log(JSON.stringify(settings, null, 2));

  await mongoose.disconnect();
}

createSettings();
