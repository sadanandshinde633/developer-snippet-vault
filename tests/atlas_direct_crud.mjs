import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { MongoClient, ObjectId } from 'mongodb';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found in env!');
  console.log('Connecting to MongoDB Atlas at:', uri.replace(/:[^@]+@/, ':***@'));

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db('snippet_vault');
  console.log('Connected! Database:', db.databaseName);

  const collection = db.collection('snippets');
  const testId = new ObjectId();
  const testSnippet = {
    _id: testId,
    userId: 'test-user-db-check-' + Date.now(),
    title: 'Atlas Direct Test Snippet',
    code: 'console.log("hello Atlas");',
    language: 'javascript',
    tags: ['#test', '#atlas'],
    summary: 'Test snippet for Atlas direct CRUD verification',
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // 1. CREATE
  console.log('1. [CREATE] Inserting snippet into MongoDB Atlas...');
  const insertRes = await collection.insertOne(testSnippet);
  console.log('   Inserted with ID:', insertRes.insertedId.toString());

  // 2. READ
  console.log('2. [READ] Reading snippet from MongoDB Atlas...');
  const found = await collection.findOne({ _id: testId });
  if (!found) throw new Error('Snippet not found in MongoDB after insert!');
  console.log('   Found snippet:', { id: found._id.toString(), title: found.title, code: found.code });

  // 3. UPDATE
  console.log('3. [UPDATE] Updating snippet in MongoDB Atlas...');
  await collection.updateOne(
    { _id: testId },
    { $set: { title: 'Atlas Direct Test Snippet UPDATED', code: 'console.log("updated code");', updatedAt: new Date() } }
  );
  const updated = await collection.findOne({ _id: testId });
  if (!updated || updated.title !== 'Atlas Direct Test Snippet UPDATED') {
    throw new Error('Snippet update failed in MongoDB!');
  }
  console.log('   Updated snippet:', { id: updated._id.toString(), title: updated.title, code: updated.code });

  // 4. DELETE
  console.log('4. [DELETE] Deleting snippet from MongoDB Atlas...');
  const delRes = await collection.deleteOne({ _id: testId });
  if (delRes.deletedCount !== 1) throw new Error('Delete failed in MongoDB!');
  console.log('   Deleted count:', delRes.deletedCount);

  const afterDel = await collection.findOne({ _id: testId });
  if (afterDel !== null) throw new Error('Snippet still exists after deletion!');
  console.log('   Verified snippet no longer exists in MongoDB Atlas.');

  await client.close();
  console.log('\n>>> ALL 4 DATABASE CRUD OPERATIONS PASSED ON MONGODB ATLAS! <<<\n');
}

run().catch((err) => {
  console.error('DATABASE CRUD CHECK FAILED:', err);
  process.exit(1);
});
