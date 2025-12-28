require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function fixPortfolio() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  // სწორი სურათი ამ პროდუქტისთვის
  const correctImage = 'https://res.cloudinary.com/dpgmovzur/image/upload/v1749826590/products/ggjhpdw7vy8k2rq9m2qy.jpg';

  const result = await db.collection('portfolioposts').updateOne(
    { _id: new ObjectId('694ff71d2cfb62c49454d285') },
    { 
      $set: { 
        title: 'უსახელო',
        description: 'ნახატი გადმოსცემს ბავშვურ გულწრფელობას, სითბოსა და სიჩუმეში ჩაკარგულ ოცნებას, თითქოს პატარა ზღაპრის ერთი კადრია.',
        updatedAt: new Date()
      } 
    }
  );
  
  console.log('✅ Portfolio post განახლდა:');
  console.log('   - title: უსახელო');
  console.log('   - Updated:', result.modifiedCount);

  // შევამოწმოთ
  const post = await db.collection('portfolioposts').findOne({ _id: new ObjectId('694ff71d2cfb62c49454d285') });
  console.log('\nCurrent post:');
  console.log('  Title:', post.title);
  console.log('  Image:', post.images?.[0]);
  console.log('  hideBuyButton:', post.hideBuyButton);

  await client.close();
}

fixPortfolio().catch(console.error);
