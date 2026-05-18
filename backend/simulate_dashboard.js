const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

mongoose.connect('mongodb+srv://raissimaher:melek@cluster0.ihmh6wl.mongodb.net/smartpm?retryWrites=true&w=majority')
  .then(async () => {
    const melek = await mongoose.connection.db.collection('users').findOne({ email: 'raissimelek70@gmail.com' });
    console.log('Melek _id:', melek._id.toString());
    
    // Simulate what the JWT payload would look like
    const token = jwt.sign(
      { email: melek.email, sub: melek._id, role: melek.role },
      'super-secret-key-aerospace-99'
    );
    const decoded = jwt.verify(token, 'super-secret-key-aerospace-99');
    console.log('JWT sub value:', decoded.sub);
    console.log('JWT sub type:', typeof decoded.sub);
    
    // Now simulate getMemberDashboard query
    const melekObjectId = new mongoose.Types.ObjectId(decoded.sub);
    console.log('Converted ObjectId:', melekObjectId.toString());
    
    const authorTasks = await mongoose.connection.db.collection('tasks').find({ 
      authorId: melekObjectId,
      status: { $ne: 'CLOSED' }
    }).toArray();
    console.log('Author tasks found:', authorTasks.length);
    authorTasks.forEach(t => console.log(' -', t.title, '| authorId:', t.authorId?.toString()));
    
    const reviewerTasks = await mongoose.connection.db.collection('tasks').find({ 
      reviewerId: melekObjectId,
      status: { $ne: 'CLOSED' }
    }).toArray();
    console.log('Reviewer tasks found:', reviewerTasks.length);
    
    process.exit(0);
  });
