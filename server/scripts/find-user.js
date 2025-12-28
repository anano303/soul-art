require('dotenv').config();
const { MongoClient } = require('mongodb');

async function findUser() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  // Find users with natia in name or username
  const users = await db
    .collection('users')
    .find({
      $or: [
        { username: { $regex: 'natia', $options: 'i' } },
        { name: { $regex: 'ნათია', $options: 'i' } },
      ],
    })
    .toArray();

  console.log('Found users:');
  users.forEach((u) =>
    console.log(
      u._id.toString(),
      u.name,
      'username:',
      u.username,
      'role:',
      u.role,
    ),
  );

  await client.close();
}

findUser().catch(console.error);
