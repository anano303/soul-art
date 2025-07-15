// Direct MongoDB script (no TypeScript/mongoose dependencies)

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function fixMongoIndexes() {
  // Get MongoDB connection string from env or use default
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
  console.log(`Connecting to MongoDB at ${mongoUri}`);

  const client = new MongoClient(mongoUri);

  try {
    // Connect to MongoDB
    await client.connect();
    console.log('Connected to MongoDB');

    // Get database name from connection string
    const dbName = mongoUri.split('/').pop()?.split('?')[0] || 'test';
    console.log(`Using database: ${dbName}`);

    const db = client.db(dbName);
    const categoriesCollection = db.collection('categories');

    // List all indexes
    console.log('Current indexes:');
    const indexes = await categoriesCollection.listIndexes().toArray();
    console.log(JSON.stringify(indexes, null, 2));

    // Drop all indexes except _id index
    for (const index of indexes) {
      if (index.name !== '_id_') {
        try {
          console.log(`Dropping index: ${index.name}`);
          await categoriesCollection.dropIndex(index.name);
          console.log(`Successfully dropped index: ${index.name}`);
        } catch (err) {
          console.error(`Error dropping index ${index.name}:`, err.message);
        }
      }
    }

    // Create new index on name field
    try {
      console.log('Creating new index on name field');
      await categoriesCollection.createIndex({ name: 1 }, { unique: true });
      console.log('Successfully created name index');
    } catch (err) {
      console.error('Error creating name index:', err.message);
    }

    // Verify indexes after changes
    console.log('Updated indexes:');
    const updatedIndexes = await categoriesCollection.listIndexes().toArray();
    console.log(JSON.stringify(updatedIndexes, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
fixMongoIndexes().catch(console.error);
