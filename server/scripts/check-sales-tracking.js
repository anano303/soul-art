/**
 * Script to check SalesTracking collection data
 * Run: node scripts/check-sales-tracking.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkSalesTracking() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Check SalesTracking collection
    const trackingCollection = db.collection('salestrackings');
    const totalCount = await trackingCollection.countDocuments();
    console.log(`\n📊 Total tracking records: ${totalCount}`);

    if (totalCount === 0) {
      console.log('\n⚠️  No tracking data found!');
      console.log('This means either:');
      console.log(
        '  1. No one has visited the site with a sales manager ref link (SM_xxx)',
      );
      console.log('  2. The tracking system was just implemented');
      console.log('\nTo test, visit: https://soulart.ge?ref=SM_TESTCODE');
    } else {
      // Group by event type
      const eventTypes = await trackingCollection
        .aggregate([
          { $group: { _id: '$eventType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray();

      console.log('\n📈 Events by type:');
      eventTypes.forEach((e) => {
        console.log(`  ${e._id}: ${e.count}`);
      });

      // Group by sales manager
      const byManager = await trackingCollection
        .aggregate([
          { $group: { _id: '$salesRefCode', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ])
        .toArray();

      console.log('\n👤 Top sales managers by tracking events:');
      byManager.forEach((m) => {
        console.log(`  ${m._id}: ${m.count} events`);
      });

      // Recent events
      const recentEvents = await trackingCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();

      console.log('\n🕐 Recent tracking events:');
      recentEvents.forEach((e) => {
        console.log(
          `  ${e.eventType} | ${e.salesRefCode} | ${e.landingPage} | ${new Date(e.createdAt).toLocaleString()}`,
        );
      });
    }

    // Also check if any sales managers exist
    const usersCollection = db.collection('users');
    const salesManagers = await usersCollection.countDocuments({
      role: { $in: ['sales_manager', 'seller_sales_manager'] },
    });
    console.log(`\n👥 Total sales managers: ${salesManagers}`);

    // Check if they have ref codes
    const withRefCode = await usersCollection.countDocuments({
      role: { $in: ['sales_manager', 'seller_sales_manager'] },
      salesRefCode: { $exists: true, $ne: null },
    });
    console.log(`📎 Sales managers with ref codes: ${withRefCode}`);

    if (withRefCode > 0) {
      const managers = await usersCollection
        .find({
          role: { $in: ['sales_manager', 'seller_sales_manager'] },
          salesRefCode: { $exists: true, $ne: null },
        })
        .project({ name: 1, email: 1, salesRefCode: 1 })
        .limit(5)
        .toArray();

      console.log('\n🔗 Sample sales manager ref codes:');
      managers.forEach((m) => {
        console.log(`  ${m.name} (${m.email}): ${m.salesRefCode}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkSalesTracking();
