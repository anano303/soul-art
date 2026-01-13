const { MongoClient, ObjectId } = require('mongodb');

async function checkTrackingDetails() {
  const client = new MongoClient(
    process.env.MONGODB_URI ||
      'mongodb+srv://sabakhitaridze35:admin@cluster0.1jq3b.mongodb.net/nest?retryWrites=true&w=majority&appName=Cluster0',
  );

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('nest');

    // შევამოწმოთ tracking მონაცემის სტრუქტურა
    const trackings = await db
      .collection('salestrackings')
      .find({})
      .limit(5)
      .toArray();

    console.log('\n📊 Sample tracking records:');
    trackings.forEach((t, i) => {
      console.log(`\n--- Record ${i + 1} ---`);
      console.log('_id:', t._id);
      console.log('salesManager:', t.salesManager);
      console.log('salesRefCode:', t.salesRefCode);
      console.log('eventType:', t.eventType);
      console.log('createdAt:', t.createdAt);
    });

    // ვნახოთ ყველა salesManager ველი რა ტიპისაა
    const allSalesManagers = await db
      .collection('salestrackings')
      .distinct('salesManager');
    console.log('\n👥 All salesManager values in tracking:', allSalesManagers);

    // მოვძებნოთ sales manager ID 69615279491bc494a09e1f1b-ისთვის
    const targetId = '69615279491bc494a09e1f1b';

    // შევამოწმოთ სხვადასხვა ფორმატით
    console.log('\n🔍 Searching for manager:', targetId);

    // ObjectId-ით
    const countById = await db
      .collection('salestrackings')
      .countDocuments({ salesManager: new ObjectId(targetId) });
    console.log('Count by ObjectId:', countById);

    // სტრინგით
    const countByString = await db
      .collection('salestrackings')
      .countDocuments({ salesManager: targetId });
    console.log('Count by String:', countByString);

    // ამ manager-ის ref code
    const manager = await db
      .collection('users')
      .findOne({ _id: new ObjectId(targetId) });
    if (manager) {
      console.log('\nManager refCode:', manager.salesRefCode);

      // refCode-ით მოძებნა
      const countByRefCode = await db
        .collection('salestrackings')
        .countDocuments({ salesRefCode: manager.salesRefCode });
      console.log('Count by refCode:', countByRefCode);
    }

    // აგრეგაცია ეფექტურობისთვის
    console.log('\n📈 Aggregation test for this manager:');
    const agg = await db
      .collection('salestrackings')
      .aggregate([
        { $match: { salesManager: new ObjectId(targetId) } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
      ])
      .toArray();
    console.log('Aggregation result:', agg);

    // ერთი ჩანაწერი დეტალურად
    const sample = await db
      .collection('salestrackings')
      .findOne({ salesRefCode: 'SM_UQGM42CQ' });
    if (sample) {
      console.log('\n📋 Detailed sample record:');
      console.log(JSON.stringify(sample, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected');
  }
}

checkTrackingDetails();
