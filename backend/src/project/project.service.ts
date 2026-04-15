import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument, ProjectStatus } from './schemas/project.schema';
import { Activity, ActivityDocument } from '../activity/schemas/activity.schema';
import { SubActivity, SubActivityDocument } from '../sub-activity/schemas/sub-activity.schema';
import { User, AeroPhase } from '../user/schemas/user.schema';
import { Task, TaskDocument, TaskStatus } from '../task/schemas/task.schema';

import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ProjectService {
 private logger = new Logger(ProjectService.name);

 constructor(
  @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  @InjectModel(SubActivity.name) private subActivityModel: Model<SubActivityDocument>,
  @InjectModel(User.name) private userModel: Model<any>,
  @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
  private notificationService: NotificationService
 ) {}

 async deployMission(payload: any, managerId: string) {
  this.logger.log(`[DEPLOY] Starting mission deployment: ${payload.name}`);
  this.logger.log(`[DEPLOY] Mode: ${process.env.DB_ENV || 'local'}`);
  this.logger.log(`[DEPLOY] Payload size: ${JSON.stringify(payload).length} bytes`);
  
  try {
   // Convert member IDs to ObjectIds
  const teamMembers = (payload.teamMembers || []).map(id => new Types.ObjectId(id));

  const project = await this.projectModel.create({
   name: payload.name,
   description: payload.description,
   startDate: new Date(payload.startDate),
   targetEndDate: new Date(payload.endDate),
   managerId: new Types.ObjectId(managerId),
   teamMembers: teamMembers,
   status: ProjectStatus.PLANNING
  });

  // Envoyer une notification à chaque membre
  if (this.notificationService && teamMembers.length > 0) {
   for (const memberId of teamMembers) {
    await this.notificationService.create(
     memberId.toString(),
     '🛡️ Nouvelle Affectation Projet',
     `Bonjour, vous avez été affecté au nouveau cycle de certification : ${project.name}.\n` +
     `Consultez votre dashboard pour voir vos premières missions.`,
     'PROJECT_ASSIGNMENT'
    );
   }
  }

  if (payload.activities && Array.isArray(payload.activities)) {
   for (const act of payload.activities) {
    // ... (existing mapping logic)
    const validPhases = ['HLR', 'LLR', 'CODE', 'LLT', 'HLT'];
    const mappedPhase: AeroPhase = validPhases.includes(act.id) ? (act.id as AeroPhase) : AeroPhase.CUSTOM;

    const newActivity = await this.activityModel.create({
     projectId: project._id,
     projectName: project.name,
     name: act.name,
     phase: mappedPhase,
    });

    if (act.subActivities && Array.isArray(act.subActivities)) {
     for (const sub of act.subActivities) {
      await this.subActivityModel.create({
       activityId: newActivity._id,
       projectId: project._id,
       projectName: project.name,
       category: sub.name,
      });
     }
    }
   }
  }

   return { success: true, projectId: project._id };
  } catch (err) {
   this.logger.error(`[DEPLOY] FATAL ERROR: ${err.message}`, err.stack);
   throw err;
  }
 }

 async getProjectsForUser(userId: string, role: string) {
  if (role === 'ADMIN' || role === 'MANAGER') {
   return this.projectModel.find().sort({ createdAt: -1 }).lean().exec();
  }
  return this.projectModel
   .find({ teamMembers: new Types.ObjectId(userId) })
   .sort({ createdAt: -1 })
   .lean()
   .exec();
 }

 async getProjectById(id: string) {
  const project = await this.projectModel.findById(id).lean().exec();
  if (!project) throw new NotFoundException('Project not found');
  return project;
 }

 async updateProjectStatus(id: string, status: string) {
  this.logger.log(`[STATUS UPDATE] Attempting to set Project ${id} to ${status}`);
  
  // Check if ID is valid ObjectId
  const query = Types.ObjectId.isValid(id) ? { _id: new Types.ObjectId(id) } : { _id: id };
  
  const project = await this.projectModel.findOneAndUpdate(
   query,
   { $set: { status: status as ProjectStatus } },
   { new: true } // Returns the modified document
  ).exec();

  if (!project) {
   this.logger.error(`[STATUS UPDATE] Project NOT FOUND with ID: ${id}`);
   throw new NotFoundException('Project not found');
  }

  this.logger.log(`[STATUS UPDATE] Persistent Change Confirmed: New Status is ${project.status}`);
  return { success: true, status: project.status };
 }

 async updateProject(id: string, payload: any) {
  this.logger.log(`[UPDATE] Updating Project: ${id}`);
  const updated = await this.projectModel.findByIdAndUpdate(id, { $set: payload }, { new: true });
  if (!updated) throw new NotFoundException('Project not found');
  return updated;
 }

 async getManagerCockpit(managerId: string, role?: string) {
  this.logger.log(`Fetching Cockpit Data for Manager: ${managerId} (Role: ${role})`);
  
  // Safely build the query
  let query: any = {};
  if (role === 'ADMIN' || role === 'MANAGER') {
   // Admins and Managers see everything in the dashboard context
   query = {};
  } else if (Types.ObjectId.isValid(managerId)) {
   query.$or = [
    { managerId: new Types.ObjectId(managerId) },
    { managerId: managerId }
   ];
  } else {
   query.managerId = managerId;
  }

  const projects = await this.projectModel.find(query).sort({ createdAt: -1 }).limit(20).lean().exec();
  const projectIds = projects.map(p => p._id);
  
  // Find all subactivities for these projects
  const subActivities = await this.subActivityModel.find({ projectId: { $in: projectIds } }).lean().exec();
  const subActivityIds = subActivities.map(sa => sa._id);

  // Find all tasks associated with these projects
  const tasks = await this.taskModel.find({ subActivityId: { $in: subActivityIds } }).lean().exec();

  // Gather all unique users involved in these projects or just global team
  // Better to fetch actual assigned members or fall back to general users
  let members = await this.userModel.find({ role: 'MEMBER' }).limit(10).lean().exec();

  this.logger.log(`Found ${projects.length} projects, ${tasks.length} tasks and ${members.length} members in DB.`);
  
  const activeProjectCount = projects.filter(p => p.status === ProjectStatus.ACTIVE || p.status === ProjectStatus.PLANNING).length;
  
  // Calculate global stats dynamically based on tasks
  const delayedTasks = tasks.filter(t => new Date() > new Date(t.plannedEndDate) && t.status !== TaskStatus.CLOSED).length;
  const pendingReviews = tasks.filter(t => t.status === TaskStatus.READY_FOR_REVIEW).length;
  const blockedTasks = tasks.filter(t => t.status === TaskStatus.BLOCKED).length;
  const closedTasks = tasks.filter(t => t.status === TaskStatus.CLOSED).length;
  const totalTasks = tasks.length;
  
  const overallUtilization = members.length > 0 && totalTasks > 0 
   ? Math.round((tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length / members.length) * 100)
   : 0;
   
  // Calculate progress per project
  const projectsData = projects.map(p => {
   const pSubActivities = subActivities.filter(sa => sa.projectId.toString() === p._id.toString());
   const pSubActivityIds = pSubActivities.map(sa => sa._id.toString());
   const pTasks = tasks.filter(t => pSubActivityIds.includes(t.subActivityId.toString()));
   
   const pTotal = pTasks.length;
   const pClosed = pTasks.filter(t => t.status === TaskStatus.CLOSED).length;
   
   console.log(`[DEBUG DB] Project: ${p.name}, Status in DB variable: ${p.status}, ID: ${p._id}`);
   return {
    id: p._id.toString(),
    name: p.name,
    progress: pTotal > 0 ? Math.round((pClosed / pTotal) * 100) : 0,
    status: p.status || ProjectStatus.PLANNING // Ensure a status exists
   };
  });

  // Calculate members utilization based on tasks assigned to authorId
  const teamData = members.map(m => {
   const mTasks = tasks.filter(t => t.authorId && t.authorId.toString() === m._id.toString());
   const mInProgress = mTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
   
   return {
    name: `${m.firstName} ${m.lastName}`,
    role: m.certifications?.[0] || 'Member',
    assignedTasks: mTasks.length,
    utilization: mTasks.length > 0 ? Math.round((mInProgress / mTasks.length) * 100) : 0,
    status: mInProgress > 0 ? 'busy' : 'available'
   };
  });

  const reviewsData = tasks
   .filter(t => t.status === TaskStatus.READY_FOR_REVIEW)
   .map(t => {
    const author = members.find(m => m._id.toString() === t.authorId?.toString());
    return {
     task: t.title,
     author: author ? `${author.firstName} ${author.lastName}` : 'Inconnu',
     time: t.actualDuration ? `${t.actualDuration}h` : '0h',
     status: 'Pending'
    };
   });

  const alertsData = delayedTasks > 0 
   ? [{ msg: `${delayedTasks} tâches sont en retard !`, type: 'danger' }] 
   : [{ msg: 'Toutes les tâches sont dans les temps.', type: 'info' }];

  const insightsData = [
   { msg: blockedTasks > 0 ? `⚠️ ${blockedTasks} risques bloquants détectés.` : `✅ Aucun risque bloquant détecté.`, severity: blockedTasks > 0 ? 'high' : 'low' },
   { msg: `✅ ${closedTasks} jalons complétés au total.`, severity: 'low' }
  ];

  const certificationsData = members.map(m => ({
   name: `${m.firstName} ${m.lastName}`,
   status: m.certifications?.length ? `${m.certifications[0]} eligible ✅` : 'Non certifié ❌'
  }));

  const traceabilityCount = subActivities.filter(sa => tasks.some(t => t.subActivityId.toString() === sa._id.toString())).length;
  const traceabilityPercentage = subActivities.length > 0 ? Math.round((traceabilityCount / subActivities.length) * 100) : 88;
  const compliancePercentage = tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'CLOSED').length / tasks.length) * 100) : 94;

  return {
   activeProjects: activeProjectCount,
   delayedTasks: delayedTasks,
   pendingReviews: pendingReviews,
   blockedTasks: blockedTasks,
   teamMembers: members.length,
   aiRisks: blockedTasks,
   milestonesCompleted: closedTasks,
   utilizationPercentage: overallUtilization > 100 ? 100 : overallUtilization,
   traceabilityCoverage: traceabilityPercentage,
   processCompliance: compliancePercentage,
   projects: projectsData,
   team: teamData,
   reviews: reviewsData,
   alerts: alertsData,
   aiInsights: insightsData,
  };
 }

 async getProjectStructure(projectId: string) {
  this.logger.log(`[SERVICE] getProjectStructure called for ID: ${projectId}`);
  
  if (!Types.ObjectId.isValid(projectId)) {
   this.logger.warn(`[SERVICE] Invalid Project ID format: ${projectId}`);
   throw new BadRequestException('ID de projet invalide');
  }

  try {
   const project = await this.projectModel.findById(projectId).lean().exec();
   if (!project) {
    this.logger.error(`[SERVICE] Project NOT FOUND for ID: ${projectId}`);
    throw new NotFoundException('Project not found');
   }

   this.logger.log(`[SERVICE] Project found: ${project.name}, fetching sub-items...`);
   
   // Fetch all related items in parallel for performance
   const [activities, subActivities] = await Promise.all([
    this.activityModel.find({ projectId: new Types.ObjectId(projectId) }).lean().exec(),
    this.subActivityModel.find({ projectId: new Types.ObjectId(projectId) }).lean().exec()
   ]);

   const subActivityIds = subActivities.map(sa => sa._id);
   const tasks = await this.taskModel.find({ subActivityId: { $in: subActivityIds } }).lean().exec();

   this.logger.log(`[SERVICE] Mapping ${activities.length} activities, ${subActivities.length} sub-activities, and ${tasks.length} tasks.`);

   const result = {
    project,
    activities: await Promise.all(activities.map(async (act) => {
     const actIdStr = act._id.toString();
     let subs = subActivities.filter(sa => sa.activityId && sa.activityId.toString() === actIdStr);
     
     // REPARATION AUTO : Si la phase est vide, on injecte les sous-activités standard
     if (subs.length === 0) {
      this.logger.warn(`[REPAIR] Activity ${act.phase} is empty for project ${project.name}. Initializing default structure...`);
      const defaultSubs = [
        { name: 'Creation & Revue', category: 'Creation & Revue' },
        { name: 'Code Review', category: 'Code Review' },
        { name: 'Architecture Design', category: 'Architecture Design' }
      ];
      
      for(const ds of defaultSubs) {
        const newSub = await this.subActivityModel.create({
         activityId: act._id,
         projectId: project._id,
         projectName: project.name,
         category: ds.category
        });
        subs.push(newSub.toObject());
      }
     }

     return {
      ...act,
      subActivities: subs.map(sa => {
       const saIdStr = sa._id.toString();
       return {
        ...sa,
        tasks: tasks.filter(t => t.subActivityId && t.subActivityId.toString() === saIdStr)
       };
      })
     };
    }))
   };
   
   this.logger.log(`[SERVICE] Final structure built for ${project.name}`);
   return result;
  } catch (error) {
   this.logger.error(`[SERVICE] Error in getProjectStructure: ${error.message}`, error.stack);
   throw error;
  }
 }

 async deleteProject(id: string) {
  this.logger.log(`[SERVICE] Deleting project and all associated data: ${id}`);
  const projectId = new Types.ObjectId(id);

  // Supprimer tout en cascade
  await Promise.all([
   this.taskModel.deleteMany({ projectId }),
   this.subActivityModel.deleteMany({ projectId }),
   this.activityModel.deleteMany({ projectId }),
   this.projectModel.findByIdAndDelete(projectId)
  ]);

  return { success: true };
 }
}
