const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { Schema } = mongoose;

const userSchema = new Schema({
 email: String,
 passwordHash: String
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function testValidate() {
 try {
  await mongoose.connect('mongodb://127.0.0.1:27017/smartpm');
  const user = await User.findOne({ email: 'manager@smartpm.com' }).select('+passwordHash');
  console.log("User found via Mongoose:", !!user);
  if (user) {
   console.log("passwordHash exists via Mongoose:", !!user.passwordHash);
   const isMatch = await bcrypt.compare('manager123', user.passwordHash);
   console.log("Bcrypt match via Mongoose:", isMatch);
  }
 } catch (e) {
  console.error(e);
 } finally {
  await mongoose.disconnect();
 }
}
testValidate();
