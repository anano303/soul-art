import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function dropCodeIndex() {
  // Get the MongoDB URI from environment variables
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
  console.log(`Connecting to MongoDB at ${mongoUri}`);

  // Create a new MongoDB client
  const client = new MongoClient(mongoUri);

  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected to MongoDB server');

    // Extract database name from the connection string
    const dbName = mongoUri.split('/').pop()?.split('?')[0] || 'test';
    console.log(`Using database: ${dbName}`);

    // Get a reference to the database
    const db = client.db(dbName);

    // Get a reference to the categories collection
    const categoriesCollection = db.collection('categories');

    // List all indexes in the collection
    console.log('Current indexes:');
    const indexes = await categoriesCollection.listIndexes().toArray();
    console.log(JSON.stringify(indexes, null, 2));

    // Find the code_1 index
    const codeIndex = indexes.find(
      (index) =>
        index.name === 'code_1' ||
        (index.key && Object.keys(index.key).includes('code')),
    );

    if (codeIndex) {
      console.log(`Found code index to drop: ${codeIndex.name}`);
      // Drop the code_1 index
      await categoriesCollection.dropIndex(codeIndex.name);
      console.log(`Successfully dropped index: ${codeIndex.name}`);
    } else {
      console.log('No code index found. Trying a direct drop by name.');

      // Try to drop by name directly
      try {
        await categoriesCollection.dropIndex('code_1');
        console.log('Successfully dropped index: code_1');
      } catch (e) {
        console.log(
          'Failed to drop index by name, it might not exist:',
          e.message,
        );
      }
    }

    // Create any needed indexes
    try {
      await categoriesCollection.createIndex({ name: 1 }, { unique: true });
      console.log('Created index on name field');
    } catch (e) {
      console.log('Failed to create index on name field:', e.message);
    }

    // List updated indexes
    console.log('Updated indexes:');
    const updatedIndexes = await categoriesCollection.listIndexes().toArray();
    console.log(JSON.stringify(updatedIndexes, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
dropCodeIndex();
