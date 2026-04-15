import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
const uri = process.env.MONGODB_CLOUD_URI || 'mongodb://localhost:27017/smartpm';

async function seed() {
 const client = new MongoClient(uri);
 try {
  await client.connect();
  const db = client.db();
  
  console.log('Clearing ALL collections...');
  await db.collection('users').deleteMany({});
  await db.collection('projects').deleteMany({});
  await db.collection('activities').deleteMany({});
  await db.collection('subactivities').deleteMany({});
  await db.collection('tasks').deleteMany({});

  console.log('Generating 10+ Users...');
  const users: any[] = [];
  const managerId = new ObjectId();
  users.push({ _id: managerId, firstName: 'Maher', lastName: 'Raissi', email: 'manager@smartpm.com', role: 'MANAGER', provider: 'local', certifications: [], isActive: true, createdAt: new Date() });
  
  const teamIds: any[] = [];
  const roles = [['HLR'], ['LLR', 'CODE'], ['CODE'], ['LLT'], ['HLT'], ['HLR', 'LLR', 'CODE', 'LLT', 'HLT']];
  for(let i=1; i<=11; i++) {
    const uid = new ObjectId();
    teamIds.push(uid);
    users.push({
      _id: uid,
      firstName: `Engineer${i}`,
      lastName: `Aero${i}`,
      email: `eng${i}@smartpm.com`,
      role: 'MEMBER',
      provider: 'local',
      certifications: roles[i % roles.length],
      isActive: true,
      createdAt: new Date()
    });
  }
  await db.collection('users').insertMany(users);

  console.log('Generating 10+ Projects...');
  const projects: any[] = [];
  const projectNames = [
    'Flight Control System DAL A', 'Navigation Display DAL C',
    'Engine Monitoring DAL B', 'Cabin Lighting DAL E',
    'Landing Gear Control DAL A', 'In-Flight Entertainment DAL D',
    'Weather Radar System DAL C', 'Auto-Pilot Core DAL A',
    'Fuel Management DAL B', 'Communications Radio DAL C',
    'Emergency Oxygen Control DAL A', 'Warning Annunciator DAL B'
  ];
  for(let p of projectNames) {
    projects.push({
      _id: new ObjectId(),
      name: p,
      description: `A compliant project: ${p}`,
      managerId: managerId,
      teamMembers: teamIds.slice(0, 5), // assign first 5 engineers
      status: ['PLANNING', 'ACTIVE', 'COMPLETED', 'ON_HOLD'][Math.floor(Math.random()*4)],
      startDate: new Date(),
      targetEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      createdAt: new Date()
    });
  }
  await db.collection('projects').insertMany(projects);

  console.log('Generating 10+ Activities (min 1 per project)...');
  const activities: any[] = [];
  for(let i=0; i<projects.length; i++) {
    activities.push({
      _id: new ObjectId(),
      projectId: projects[i]._id,
      title: `Phase de Spécifications Systèmes P${i}`,
      description: 'Capture des exigences haut niveau',
      status: 'ACTIVE',
      progress: Math.floor(Math.random() * 100),
      createdAt: new Date()
    });
    if(i < 5) { // Add some extra activities
      activities.push({
        _id: new ObjectId(),
        projectId: projects[i]._id,
        title: `Phase de Test et Verification P${i}`,
        description: 'Validation ',
        status: 'PLANNING',
        progress: 0,
        createdAt: new Date()
      });
    }
  }
  await db.collection('activities').insertMany(activities);

  console.log('Generating 10+ SubActivities...');
  const subActivities: any[] = [];
  for(let i=0; i<activities.length; i++) {
    for(let j=0; j<2; j++) {
      subActivities.push({
        _id: new ObjectId(),
        activityId: activities[i]._id,
        title: `Traitement ${j+1} - ${activities[i].title}`,
        description: 'Travail détaillé',
        status: 'TODO',
        progress: Math.floor(Math.random() * 50),
        createdAt: new Date()
      });
    }
  }
  await db.collection('subactivities').insertMany(subActivities);

  console.log('Generating 20+ Tasks (with proper separation of concerns)...');
  const tasks: any[] = [];
  const taskStates = ['TODO', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'REVIEWED', 'BLOCKED', 'CLOSED'];
  
  for(let i=0; i<subActivities.length; i++) {
    // Enforce Author != Reviewer
    let author = teamIds[i % teamIds.length];
    let reviewer = teamIds[(i+1) % teamIds.length];

    tasks.push({
      title: `Rédiger document HLR ${i}`,
      description: 'Rédaction selon la norme.',
      subActivityId: subActivities[i]._id,
      authorId: author,
      reviewerId: reviewer,
      status: taskStates[Math.floor(Math.random()*taskStates.length)],
      estimatedDuration: 40 + (i*2),
      actualDuration: i*5,
      plannedStartDate: new Date(),
      plannedEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      createdAt: new Date()
    });
    
    // Push a second task on some subactivities
    if (i % 2 === 0) {
       tasks.push({
        title: `Implémentation Code Vol ${i}`,
        description: 'Codage MISRA C++',
        subActivityId: subActivities[i]._id,
        authorId: reviewer, // Author and Rev swapped
        reviewerId: author,
        status: 'TODO',
        estimatedDuration: 120,
        actualDuration: 0,
        plannedStartDate: new Date(),
        plannedEndDate: new Date(),
        createdAt: new Date()
      });
    }
  }
  await db.collection('tasks').insertMany(tasks);

  console.log(`✅ DATABASE FULLY SEEDED!`);
  console.log(`Stats: ${users.length} Users, ${projects.length} Projects, ${activities.length} Activities, ${subActivities.length} SubActivities, ${tasks.length} Tasks.`);
  process.exit(0);
 } catch (err) {
  console.error('Seed Error:', err);
  process.exit(1);
 }
}

seed();
