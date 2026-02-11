// Script to fix auction admin balance by recalculating from earnings
// Run: node scripts/fix-auction-admin-balance.js

require("dotenv").config();
const mongoose = require("mongoose");

async function fixAuctionAdminBalance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;

    // Get all auction admins
    const auctionAdmins = await db
      .collection("users")
      .find({ role: "auction_admin" })
      .toArray();

    console.log(`Found ${auctionAdmins.length} auction admins`);

    for (const admin of auctionAdmins) {
      console.log(`\n--- ${admin.email} ---`);

      // Get all earnings
      const allEarnings = await db
        .collection("auctionadminearnings")
        .find({ auctionAdminId: admin._id })
        .toArray();

      // Get available (not withdrawn) earnings
      const availableEarnings = await db
        .collection("auctionadminearnings")
        .find({ auctionAdminId: admin._id, isWithdrawn: false })
        .toArray();

      const totalEarnings = allEarnings.reduce(
        (sum, e) => sum + (e.auctionAdminEarnings || 0),
        0
      );
      const availableBalance = availableEarnings.reduce(
        (sum, e) => sum + (e.auctionAdminEarnings || 0),
        0
      );

      // Get pending withdrawals
      const pendingWithdrawals = await db
        .collection("auctionadminwithdrawals")
        .find({
          auctionAdminId: admin._id,
          status: "PENDING",
        })
        .toArray();

      const pendingAmount = pendingWithdrawals.reduce(
        (sum, w) => sum + (w.amount || 0),
        0
      );

      // Get total withdrawn
      const processedWithdrawals = await db
        .collection("auctionadminwithdrawals")
        .find({
          auctionAdminId: admin._id,
          status: "PROCESSED",
        })
        .toArray();

      const totalWithdrawn = processedWithdrawals.reduce(
        (sum, w) => sum + (w.amount || 0),
        0
      );

      console.log(`Current values in user document:`);
      console.log(`  auctionAdminBalance: ${admin.auctionAdminBalance || 0}`);
      console.log(
        `  auctionAdminPendingWithdrawal: ${admin.auctionAdminPendingWithdrawal || 0}`
      );
      console.log(
        `  auctionAdminTotalEarnings: ${admin.auctionAdminTotalEarnings || 0}`
      );
      console.log(
        `  auctionAdminTotalWithdrawn: ${admin.auctionAdminTotalWithdrawn || 0}`
      );

      console.log(`\nCalculated from database:`);
      console.log(`  Total earnings: ${totalEarnings.toFixed(2)}`);
      console.log(`  Available (not withdrawn): ${availableBalance.toFixed(2)}`);
      console.log(`  Pending withdrawal: ${pendingAmount.toFixed(2)}`);
      console.log(`  Total withdrawn: ${totalWithdrawn.toFixed(2)}`);

      // Update user with correct values
      await db.collection("users").updateOne(
        { _id: admin._id },
        {
          $set: {
            auctionAdminBalance: availableBalance,
            auctionAdminPendingWithdrawal: pendingAmount,
            auctionAdminTotalEarnings: totalEarnings,
            auctionAdminTotalWithdrawn: totalWithdrawn,
          },
        }
      );

      console.log(`\n✅ Updated user balance to: ${availableBalance.toFixed(2)} GEL`);
    }

    console.log("\n=== Done ===");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

fixAuctionAdminBalance();
