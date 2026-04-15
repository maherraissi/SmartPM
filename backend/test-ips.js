
const mongoose = require('mongoose');

async function test(host) {
  const uri = `mongodb://${host}:27017/smartpm`;
  console.log(`\n--- Testing ${host} ---`);
  try {
    const conn = await mongoose.createConnection(uri).asPromise();
    console.log(`Connected to: ${host}`);
    const dbs = await conn.db.admin().listDatabases();
    console.log(`Databases:`, dbs.databases.map(d => d.name).join(', '));
    const count = await conn.db.collection('projects').countDocuments();
    console.log(`Projects count in 'smartpm.projects': ${count}`);
    await conn.close();
  } catch (err) {
    console.log(`Failed to connect to ${host}: ${err.message}`);
  }
}

async function run() {
  await test('localhost');
  await test('127.0.0.1');
}

run();
