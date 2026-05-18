const mongoose = require('mongoose');

const uri = "mongodb+srv://raissimaher:melek@cluster0.ihmh6wl.mongodb.net/smartpm?retryWrites=true&w=majority";

const userSchema = new mongoose.Schema({
  equipe: { type: String, default: '' },
  role: String
}, { strict: false });

const User = mongoose.model('User', userSchema, 'users');

async function main() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB.");

    const users = await User.find({});
    console.log(`Found ${users.length} users.`);

    const equipes = ['LLR', 'LLT', 'HLT'];
    
    let updatedCount = 0;
    
    for (let u of users) {
      if (!u.equipe) {
        // Assign sequentially based on updatedCount to balance
        u.equipe = equipes[updatedCount % equipes.length];
        await u.save();
        updatedCount++;
      }
    }

    console.log(`Successfully updated ${updatedCount} users with new equipes.`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

main();
