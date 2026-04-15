import { MongoClient, ObjectId } from 'mongodb';

async function run() {
 const uri = "mongodb://localhost:27017/smartpm";
 const client = new MongoClient(uri);
 try {
  await client.connect();
  const db = client.db("smartpm");
  
  const projects = await db.collection("projects").find({}).toArray();
  console.log(`Total Projects: ${projects.length}`);
  projects.forEach(p => console.log(` - Project: ${p.name}, ManagerID: ${p.managerId}`));

  const users = await db.collection("users").find({}).toArray();
  console.log(`Total Users: ${users.length}`);
  users.forEach(u => console.log(` - User: ${u.email}, Role: ${u.role}, ID: ${u._id}`));

 } finally {
  await client.close();
 }
}

run().catch(console.error);
