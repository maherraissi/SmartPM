const mongoose = require('mongoose');

async function main() {
  const uri = 'mongodb://127.0.0.1:27017/smartpm';
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const projects = await db.collection('projects').find().toArray();
    console.log(`Found ${projects.length} projects`);
    if(projects.length > 0) {
      console.log(projects[0]);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(console.error);
