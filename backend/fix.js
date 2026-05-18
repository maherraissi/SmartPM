const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://raissimaher:melek@cluster0.ihmh6wl.mongodb.net/smartpm?retryWrites=true&w=majority')
  .then(async () => {
    const tasks = await mongoose.connection.db.collection('tasks').find().toArray();
    let updated = 0;
    for (const t of tasks) {
      const updates = {};
      if (typeof t.subActivityId === 'string' && mongoose.Types.ObjectId.isValid(t.subActivityId)) {
        updates.subActivityId = new mongoose.Types.ObjectId(t.subActivityId);
      }
      if (typeof t.authorId === 'string' && mongoose.Types.ObjectId.isValid(t.authorId)) {
        updates.authorId = new mongoose.Types.ObjectId(t.authorId);
      }
      if (typeof t.reviewerId === 'string' && mongoose.Types.ObjectId.isValid(t.reviewerId)) {
        updates.reviewerId = new mongoose.Types.ObjectId(t.reviewerId);
      }
      if (typeof t.projectId === 'string' && mongoose.Types.ObjectId.isValid(t.projectId)) {
        updates.projectId = new mongoose.Types.ObjectId(t.projectId);
      }
      if (Object.keys(updates).length > 0) {
        await mongoose.connection.db.collection('tasks').updateOne({ _id: t._id }, { $set: updates });
        updated++;
      }
    }
    console.log('Fixed', updated, 'tasks.');
    process.exit(0);
  });
