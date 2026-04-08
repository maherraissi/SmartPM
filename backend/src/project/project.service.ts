import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument, ProjectStatus } from './schemas/project.schema';
import { Activity, ActivityDocument } from '../activity/schemas/activity.schema';
import { SubActivity, SubActivityDocument } from '../sub-activity/schemas/sub-activity.schema';
import { User, AeroPhase } from '../user/schemas/user.schema';
import { Task, TaskDocument, TaskStatus } from '../task/schemas/task.schema';

@Injectable()
export class ProjectService {
  private logger = new Logger(ProjectService.name);

  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(SubActivity.name) private subActivityModel: Model<SubActivityDocument>,
    @InjectModel(User.name) private userModel: Model<any>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>
  ) {}

  async deployMission(payload: any, managerId: string) {
    // ... (rest of deployMission logic)
    this.logger.log(`Deploying new Aerospace Mission: ${payload.name} by manager: ${managerId}`);
    
    const project = await this.projectModel.create({
      name: payload.name,
      description: payload.description,
      startDate: new Date(payload.startDate),
      targetEndDate: new Date(payload.endDate),
      managerId: new Types.ObjectId(managerId),
    });

    if (payload.activities && Array.isArray(payload.activities)) {
      for (const act of payload.activities) {
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
    const project = await this.projectModel.findById(id);
    if (!project) throw new NotFoundException('Project not found');
    project.status = status as ProjectStatus;
    await project.save();
    return { success: true, status: project.status };
  }

  async getManagerCockpit(managerId: string) {
    this.logger.log(`Fetching Cockpit Data for Manager: ${managerId}`);
    
    const projects = await this.projectModel.find({ managerId: new Types.ObjectId(managerId) }).sort({ createdAt: -1 }).limit(10).lean().exec();
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
      
      return {
        id: p._id,
        name: p.name,
        progress: pTotal > 0 ? Math.round((pClosed / pTotal) * 100) : 0,
        status: p.status || 'Active'
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

    return {
      activeProjects: activeProjectCount,
      delayedTasks: delayedTasks,
      pendingReviews: pendingReviews,
      blockedTasks: blockedTasks,
      teamMembers: members.length,
      aiRisks: blockedTasks,
      milestonesCompleted: closedTasks,
      utilizationPercentage: overallUtilization > 100 ? 100 : overallUtilization,
      projects: projectsData,
      team: teamData,
      reviews: reviewsData,
      alerts: alertsData,
      aiInsights: insightsData,
      certifications: certificationsData
    };
  }

  async getProjectStructure(projectId: string) {
    this.logger.log(`[DEBUG] Fetching structure for project: ${projectId}`);
    
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('ID de projet invalide');
    }

    const project = await this.projectModel.findById(projectId).lean().exec();
    if (!project) throw new NotFoundException('Project not found');

    const activities = await this.activityModel.find({ projectId: new Types.ObjectId(projectId) }).lean().exec();
    this.logger.log(`[DEBUG] Found ${activities.length} activities`);
    
    const subActivities = await this.subActivityModel.find({ projectId: new Types.ObjectId(projectId) }).lean().exec();
    this.logger.log(`[DEBUG] Found ${subActivities.length} sub-activities`);
    
    const subActivityIds = subActivities.map(sa => sa._id);
    const tasks = await this.taskModel.find({ subActivityId: { $in: subActivityIds } }).lean().exec();
    this.logger.log(`[DEBUG] Found ${tasks.length} tasks total`);

    const result = {
      project,
      activities: activities.map(act => ({
        ...act,
        subActivities: subActivities
          .filter(sa => sa.activityId.toString() === act._id.toString())
          .map(sa => ({
            ...sa,
            tasks: tasks.filter(t => t.subActivityId.toString() === sa._id.toString())
          }))
      }))
    };
    this.logger.log(`[DEBUG] Structure mapping complete`);
    return result;
  }
}
