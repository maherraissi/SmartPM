const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://raissimaher:melek@cluster0.ihmh6wl.mongodb.net/smartpm?retryWrites=true&w=majority')
  .then(async () => {
    const user = await mongoose.connection.db.collection('users').findOne({ 
      $or: [
        { username: /raissi/i }, 
        { email: /raissi/i }
      ] 
    });
    console.log('User found:', JSON.stringify(user));
    process.exit(0);
  });
