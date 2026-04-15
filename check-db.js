const mongoose = require('mongoose');

async function check() {
  const uri = "mongodb://127.0.0.1:27017/smartpm";
  try {
    await mongoose.connect(uri);
    console.log("==========================================");
    console.log("🚀 SMARTPM DATABASE DIAGNOSTIC");
    console.log("Connected to:", mongoose.connection.name);
    console.log("==========================================");
    
    // We use a generic model to check the 'projects' collection
    const Project = mongoose.connection.db.collection('projects');
    const projectCount = await Project.countDocuments();
    
    console.log(`\n📊 Total Projects in DB: ${projectCount}`);
    
    const allProjects = await Project.find({}).sort({ createdAt: -1 }).toArray();
    console.log("\n📋 Project List:");
    if (allProjects.length === 0) {
      console.log("  (No projects found in the 'projects' collection)");
    } else {
        allProjects.forEach((p, i) => {
          console.log(`${i+1}. [${p.status}] ${p.name}`);
          console.log(`   ID: ${p._id}`);
          console.log(`   Created: ${p.createdAt}`);
          console.log("   --------------------------------------");
        });
    }

    const User = mongoose.connection.db.collection('users');
    const userCount = await User.countDocuments();
    console.log(`\n👥 Total Users in DB: ${userCount}`);
    
  } catch (err) {
    console.error("❌ Diagnostic Error:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected.");
  }
}

check().catch(console.error);

