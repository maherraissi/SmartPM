const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
async function update() {
 try {
  await mongoose.connect('mongodb://127.0.0.1:27017/smartpm');
  const hash = await bcrypt.hash('manager123', 12);
  await mongoose.connection.db.collection('users').updateOne({ email: 'manager@smartpm.com' }, { '$set': { passwordHash: hash } });
  console.log('Password updated for manager@smartpm.com to manager123');
 } catch (e) {
  console.error(e);
 } finally {
  await mongoose.disconnect();
 }
}
update();
