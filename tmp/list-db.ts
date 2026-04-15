import { MongoClient } from 'mongodb';

async function run() {
 const uri = "mongodb://127.0.0.1:27017";
 const client = new MongoClient(uri);
 try {
  await client.connect();
  
  // 1. List Databases
  const dbs = await client.db().admin().listDatabases();
  console.log("--- DATABASES FOUND ---");
  dbs.databases.forEach(db => console.log(` - ${db.name}`));

  // 2. Check "smartpm" or "SmartPM"
  const dbName = dbs.databases.find(d => d.name.toLowerCase() === 'smartpm')?.name || 'smartpm';
  console.log(`\n--- ACCESSING DB: ${dbName} ---`);
  const db = client.db(dbName);
  const collections = await db.listCollections().toArray();
  console.log(`Collections: ${collections.map(c => c.name).join(', ')}`);

  for (const coll of collections) {
    const count = await db.collection(coll.name).countDocuments();
    console.log(` - Collection [${coll.name}]: ${count} docs`);
    if (count > 0 && (coll.name === 'projects' || coll.name === 'users' || coll.name === 'Projects' || coll.name === 'Users')) {
      const sample = await db.collection(coll.name).findOne();
      console.log(`  Sample Doc: ${JSON.stringify(sample)}`);
    }
  }

 } finally {
  await client.close();
 }
}

run().catch(console.error);
