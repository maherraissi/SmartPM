import { MongoClient, ObjectId } from 'mongodb';

async function check() {
 const uri = "mongodb://127.0.0.1:27017/smartpm";
 const client = new MongoClient(uri);
 try {
  await client.connect();
  const db = client.db("smartpm");
  const project = await db.collection("projects").findOne({ _id: new ObjectId("69d657f23314bf7c089b6730") });
  
  console.log("--- DIAGNOSTIC SMARTPM ---");
  console.log("Project ID: 69d657f23314bf7c089b6730");
  console.log("Status in DB:", project ? project.status : "NOT FOUND");
  console.log("Full Document:", JSON.stringify(project, null, 2));
  
  const allProjects = await db.collection("projects").find({}).toArray();
  console.log("\nTotal Projects in collection 'projects':", allProjects.length);
  allProjects.forEach(p => console.log(`- ${p.name}: ${p.status} (${p._id})`));
  
 } finally {
  await client.close();
 }
}

check().catch(console.error);
