// Script to list all users and their roles
// Usage: node scripts/list-users.js

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function listUsers() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db();
    const usersCollection = db.collection('users');

    // Find all users
    const users = await usersCollection.find({}, {
      projection: { email: 1, name: 1, role: 1, ownerFirstName: 1, ownerLastName: 1 }
    }).toArray();

    console.log('=== ALL USERS ===\n');
    
    users.forEach((user, index) => {
      const name = user.ownerFirstName && user.ownerLastName 
        ? `${user.ownerFirstName} ${user.ownerLastName}`
        : user.name || 'No name';
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${name}`);
      console.log(`   Role: ${user.role || 'user'}`);
      console.log('');
    });

    console.log(`Total: ${users.length} users`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

listUsers();
