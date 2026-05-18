const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://raissimaher:melek@cluster0.ihmh6wl.mongodb.net/smartpm?retryWrites=true&w=majority')
  .then(async () => {
    const user = await mongoose.connection.db.collection('users').findOne({ firstName: /melek/i });
    if (!user) { console.log("User not found"); process.exit(0); }
    console.log('User ID:', user._id, user.firstName, user.lastName);
    const tasks = await mongoose.connection.db.collection('tasks').find({ 
      $or: [
        { authorId: user._id }, 
        { reviewerId: user._id }
      ] 
    }).toArray();
    console.log('Tasks found:', tasks.length);
    tasks.forEach(t => {
      console.log(`Task: ${t.title} | Status: ${t.status} | Author: ${t.authorId?.toString() === user._id.toString() ? 'YES' : 'NO'} | Reviewer: ${t.reviewerId?.toString() === user._id.toString() ? 'YES' : 'NO'}`);
    });
    process.exit(0);
  });
