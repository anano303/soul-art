const { MongoClient, ObjectId } = require('mongodb');

async function checkTrackingData() {
  const uri =
    'mongodb+srv://soulartani:Qazqaz111@soulart.b16ew.mongodb.net/test?retryWrites=true&w=majority&appName=SoulArt';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB (test database)');

    const db = client.db('test');

    // შევამოწმოთ tracking მონაცემის სტრუქტურა
    const trackings = await db
      .collection('salestrackings')
      .find({})
      .limit(3)
      .toArray();

    console.log('\n📊 Sample tracking records:');
    trackings.forEach((t, i) => {
      console.log(`\n--- Record ${i + 1} ---`);
      console.log('_id:', t._id);
      console.log(
        'salesManager:',
        t.salesManager,
        `(type: ${typeof t.salesManager})`,
      );
      console.log('salesRefCode:', t.salesRefCode);
      console.log('eventType:', t.eventType);
      console.log('createdAt:', t.createdAt);
    });

    // ვნახოთ ყველა salesManager ველი
    const allSalesManagers = await db
      .collection('salestrackings')
      .distinct('salesManager');
    console.log('\n👥 All salesManager values in tracking:', allSalesManagers);
    console.log('Number of distinct managers:', allSalesManagers.length);

    if (allSalesManagers.length > 0) {
      const firstManagerId = allSalesManagers[0];
      console.log('\n🔍 First manager ID:', firstManagerId);
      console.log('Type:', typeof firstManagerId);
      console.log('Is ObjectId:', firstManagerId instanceof ObjectId);

      // ამ manager-ის მონაცემები
      const manager = await db
        .collection('users')
        .findOne({ _id: firstManagerId });
      if (manager) {
        console.log('\n👤 Manager details:');
        console.log('Name:', manager.name);
        console.log('Email:', manager.email);
        console.log('Role:', manager.role);
        console.log('salesRefCode:', manager.salesRefCode);
      }

      // Count by manager
      const countByManager = await db
        .collection('salestrackings')
        .countDocuments({ salesManager: firstManagerId });
      console.log('\n📈 Tracking count for this manager:', countByManager);

      // აგრეგაცია
      const agg = await db
        .collection('salestrackings')
        .aggregate([
          { $match: { salesManager: firstManagerId } },
          { $group: { _id: '$eventType', count: { $sum: 1 } } },
        ])
        .toArray();
      console.log('\n📊 Event aggregation:', agg);

      // unique visitors
      const uniqueVisitors = await db
        .collection('salestrackings')
        .aggregate([
          {
            $match: {
              salesManager: firstManagerId,
              eventType: 'VISIT',
              visitorId: { $ne: null },
            },
          },
          { $group: { _id: '$visitorId' } },
          { $count: 'count' },
        ])
        .toArray();
      console.log('Unique visitors:', uniqueVisitors);
    }

    // Sales Managers list
    console.log('\n👥 All Sales Managers:');
    const salesManagers = await db
      .collection('users')
      .find({
        role: { $in: ['sales_manager', 'seller_sales_manager'] },
      })
      .toArray();

    for (const sm of salesManagers) {
      console.log(`\n  ID: ${sm._id}`);
      console.log(`  Name: ${sm.name}`);
      console.log(`  RefCode: ${sm.salesRefCode}`);

      // count tracking
      const count = await db.collection('salestrackings').countDocuments({
        salesManager: sm._id,
      });
      console.log(`  Tracking records: ${count}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkTrackingData();
