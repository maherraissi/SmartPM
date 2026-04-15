const mongoose = require('mongoose');

async function testConnection() {
 const uri = 'mongodb://localhost:27017/smartpm';
 console.log('Connecting to:', uri);
 
 await mongoose.connect(uri);
 console.log('Connected!');
 
 const dbs = await mongoose.connection.db.admin().listDatabases();
 console.log('Existing databases:', dbs.databases.map(d => d.name));
 
 const collections = await mongoose.connection.db.listCollections().toArray();
 console.log('Collections in smartpm:', collections.map(c => c.name));
 
 const Project = mongoose.connection.db.collection('projects');
 const count = await Project.countDocuments();
 console.log('Documents in "projects" collection:', count);
 
 const projects = await Project.find({}).toArray();
 console.log('Projects content:', JSON.stringify(projects, null, 2));
 
 await mongoose.disconnect();
}

testConnection().catch(console.error);
