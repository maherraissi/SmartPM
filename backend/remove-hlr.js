const mongoose = require('mongoose');

const uri = "mongodb+srv://raissimaher:melek@cluster0.ihmh6wl.mongodb.net/smartpm?retryWrites=true&w=majority";

const userSchema = new mongoose.Schema({
  equipe: { type: String, default: '' }
}, { strict: false });

const User = mongoose.model('User', userSchema, 'users');

async function main() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB.");

    const result = await User.updateMany({ equipe: "HLR" }, { $set: { equipe: "HLT" } });
    console.log(`Successfully updated ${result.modifiedCount} users from HLR to HLT.`);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

main();
