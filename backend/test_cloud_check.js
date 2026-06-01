const mongoose = require('mongoose');
async function checkUser() {
 try {
  const cloudUri = 'mongodb+srv://raissimaher:melek@cluster0.ihmh6wl.mongodb.net/smartpm?retryWrites=true&w=majority';
  await mongoose.connect(cloudUri);
  const user = await mongoose.connection.db.collection('users').findOne({ email: 'raissi.maher@gmail.com' });
  console.log("User:", user);
 } catch (e) {
  console.error(e);
 } finally {
  await mongoose.disconnect();
 }
}
checkUser();
