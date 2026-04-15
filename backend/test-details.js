
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  const uri = process.env.MONGODB_LOCAL_URI || "mongodb://localhost:27017/smartpm";
  const projectId = "69dcb5a8df8ee5e36b4a7fdf";
  
  try {
    await mongoose.connect(uri);
    console.log("Connected to database:", mongoose.connection.name);
    
    const project = await mongoose.connection.db.collection('projects').findOne({ _id: new mongoose.Types.ObjectId(projectId) });
    console.log(`\nProject Detail:`, project);
    
    const activities = await mongoose.connection.db.collection('activities').find({ projectId: new mongoose.Types.ObjectId(projectId) }).toArray();
    console.log(`\nFound ${activities.length} activities:`);
    activities.forEach(a => console.log(`  - ${a.name} (${a.phase})`));
    
    const subActivities = await mongoose.connection.db.collection('subactivities').find({ projectId: new mongoose.Types.ObjectId(projectId) }).toArray();
    console.log(`\nFound ${subActivities.length} sub-activities:`);
    subActivities.forEach(s => console.log(`  - ${s.category} (ActivityID: ${s.activityId})`));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
