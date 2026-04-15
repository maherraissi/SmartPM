const { MongoClient } = require('mongodb');

async function run() {
 const uri = "mongodb://127.0.0.1:27017";
 const client = new MongoClient(uri);
 try {
  await client.connect();
  const dbs = await client.db().admin().listDatabases();
  console.log("DATABASES:");
  dbs.databases.forEach(db => {
    console.log(`- DB: ${db.name}`);
  });

  const smartDB = dbs.databases.find(d => d.name.toLowerCase() === 'smartpm');
  if (smartDB) {
    const db = client.db(smartDB.name);
    const collections = await db.listCollections().toArray();
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(` - Coll: ${coll.name} (${count} docs)`);
      if (count > 0 && (coll.name.toLowerCase() === 'projects' || coll.name.toLowerCase() === 'users')) {
        const sample = await db.collection(coll.name).findOne();
        console.log(`  Sample: ${JSON.stringify(sample)}`);
      }
    }
  }
 } catch (e) {
  console.error(e);
 } finally {
  await client.close();
 }
}
run();
