const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
async function testLogin() {
 try {
  await mongoose.connect('mongodb://127.0.0.1:27017/smartpm');
  const user = await mongoose.connection.db.collection('users').findOne({ email: 'manager@smartpm.com' });
  console.log("User found:", !!user);
  if (user) {
   console.log("passwordHash exists:", !!user.passwordHash);
   const isMatch = await bcrypt.compare('manager123', user.passwordHash);
   console.log("Bcrypt match:", isMatch);
  }
 } catch (e) {
  console.error(e);
 } finally {
  await mongoose.disconnect();
 }
}
testLogin();
