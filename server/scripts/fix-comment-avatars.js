// Fix existing auction comments - add user avatars
const mongoose = require('mongoose');
require('dotenv').config();

async function fixCommentAvatars() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('🔧 Fixing auction comment avatars...');

  // Get all auctions with comments
  const auctions = await db
    .collection('auctions')
    .find({
      'comments.0': { $exists: true },
    })
    .toArray();

  console.log(`Found ${auctions.length} auctions with comments`);

  let fixed = 0;

  for (const auction of auctions) {
    let needsUpdate = false;
    const updatedComments = [];

    for (const comment of auction.comments || []) {
      // Get user
      const user = await db.collection('users').findOne({
        _id: new mongoose.Types.ObjectId(comment.user.toString()),
      });

      let userAvatar = comment.userAvatar;

      if (!userAvatar && user) {
        // Determine avatar based on role
        if (user.role === 'seller') {
          userAvatar = user.storeLogo || user.profileImagePath || user.avatar;
        } else {
          userAvatar = user.profileImagePath || user.avatar || user.storeLogo;
        }

        if (userAvatar) {
          needsUpdate = true;
          console.log(
            `  ✅ Fixed avatar for ${comment.userName}: ${userAvatar.substring(0, 50)}...`,
          );
        }
      }

      updatedComments.push({
        ...comment,
        userAvatar: userAvatar || null,
      });
    }

    if (needsUpdate) {
      await db
        .collection('auctions')
        .updateOne(
          { _id: auction._id },
          { $set: { comments: updatedComments } },
        );
      fixed++;
    }
  }

  console.log(`\n✅ Fixed ${fixed} auctions with comment avatars`);

  await mongoose.disconnect();
}

fixCommentAvatars();
