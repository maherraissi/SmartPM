
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  const uri = process.env.MONGODB_CLOUD_URI;
  console.log("Checking Cloud URI:", uri.replace(/:([^:@]+)@/, ':****@')); // Hide password
  
  try {
    const conn = await mongoose.createConnection(uri).asPromise();
    console.log("Connected to Cloud DB:", conn.name);
    
    const count = await conn.db.collection('projects').countDocuments();
    console.log(`\n📊 Total Projects in Cloud DB: ${count}`);
    
    const projects = await conn.db.collection('projects').find({}).toArray();
    projects.forEach(p => console.log(`  - ${p.name} (${p.status}) - Created: ${p.createdAt}`));

    await conn.close();
  } catch (err) {
    console.error("Cloud Error:", err.message);
  }
}

run();
