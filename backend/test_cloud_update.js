const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
async function updateCloud() {
 try {
  const cloudUri = 'mongodb+srv://raissimaher:melek@cluster0.ihmh6wl.mongodb.net/smartpm?retryWrites=true&w=majority';
  await mongoose.connect(cloudUri);
  console.log("Connected to cloud DB");
  const hash = await bcrypt.hash('manager123', 12);
  const result = await mongoose.connection.db.collection('users').updateOne(
   { email: 'manager@smartpm.com' },
   { $set: { passwordHash: hash } }
  );
  console.log('Update result:', result);
  console.log('Password updated for manager@smartpm.com to manager123 in CLOUD');
 } catch (e) {
  console.error(e);
 } finally {
  await mongoose.disconnect();
 }
}
updateCloud();
