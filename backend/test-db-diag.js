
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  const uri = process.env.MONGODB_LOCAL_URI || "mongodb://localhost:27017/smartpm";
  console.log("Checking URI:", uri);
  
  try {
    await mongoose.connect(uri);
    console.log("Connected to database:", mongoose.connection.name);
    
    const dbs = await mongoose.connection.db.admin().listDatabases();
    console.log("Available databases:");
    dbs.databases.forEach(db => console.log(`- ${db.name}`));
    
    // Check 'projects' in current DB
    const projects = await mongoose.connection.db.collection('projects').find({}).toArray();
    console.log(`\nFound ${projects.length} projects in '${mongoose.connection.name}.projects':`);
    projects.forEach(p => console.log(`  - ${p.name} (ID: ${p._id})`));
    
    // Check 'SmartPM' (uppercase) explicitly
    const otherUri = uri.replace('/smartpm', '/SmartPM');
    if (otherUri !== uri) {
        console.log(`\nChecking alternative DB: ${otherUri}`);
        const conn2 = await mongoose.createConnection(otherUri).asPromise();
        const projects2 = await conn2.db.collection('projects').find({}).toArray();
        console.log(`Found ${projects2.length} projects in 'SmartPM.projects':`);
        projects2.forEach(p => console.log(`  - ${p.name} (ID: ${p._id})`));
        await conn2.close();
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
