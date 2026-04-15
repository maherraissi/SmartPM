
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  const uri = process.env.MONGODB_CLOUD_URI;
  try {
    const conn = await mongoose.createConnection(uri).asPromise();
    console.log("Connected to Cloud");
    const admin = conn.db.admin();
    const dbs = await admin.listDatabases();
    
    for (let d of dbs.databases) {
      console.log(`\n--- DB: ${d.name} ---`);
      const db = conn.useDb(d.name);
      const colls = await db.db.listCollections().toArray();
      for (let c of colls) {
        const count = await db.collection(c.name).countDocuments();
        if (count > 0) console.log(`  Collection: ${c.name} -> ${count} documents`);
      }
    }
    await conn.close();
  } catch (err) {
    console.error(err);
  }
}

run();
