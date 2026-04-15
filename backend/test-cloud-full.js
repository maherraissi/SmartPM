
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  const uri = process.env.MONGODB_CLOUD_URI;
  
  try {
    const conn = await mongoose.createConnection(uri).asPromise();
    console.log("Connected to Cloud DB");
    
    const uCount = await conn.db.collection('users').countDocuments();
    console.log(`Users in Cloud: ${uCount}`);

    const pCount = await conn.db.collection('projects').countDocuments();
    console.log(`Projects in Cloud: ${pCount}`);

    await conn.close();
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
