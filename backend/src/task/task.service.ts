import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument, TaskStatus } from './schemas/task.schema';
import { SubActivity, SubActivityDocument } from '../sub-activity/schemas/sub-activity.schema';
import { Project, ProjectDocument, ProjectStatus } from '../project/schemas/project.schema';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(SubActivity.name) private subModel: Model<SubActivityDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private notificationService: NotificationService
  ) {}

  async createTask(dto: any): Promise<Task | Task[]> {
    if (Array.isArray(dto)) {
      return Promise.all(dto.map(t => this.createTask(t) as Promise<Task>));
    }

    const sub = await this.subModel.findById(dto.subActivityId).lean().exec();
    const projectName = sub?.projectName || 'Projet Inconnu';
    const categoryName = sub?.category || 'Général';

    const authorId = dto.authorId ? dto.authorId.toString() : '';
    const reviewerId = dto.reviewerId ? dto.reviewerId.toString() : '';

    if (authorId && reviewerId && authorId === reviewerId) {
      throw new BadRequestException("Violation DO-178C: L'auteur ne peut pas être le réviseur.");
    }

    const startDate = dto.plannedStartDate ? new Date(dto.plannedStartDate as string) : new Date();
    const endDate = dto.plannedEndDate 
      ? new Date(dto.plannedEndDate as string) 
      : this.calculateBusinessEndDate(startDate, (dto.estimatedDuration as number) || 1);

    const newTask = new this.taskModel({
      ...dto,
      plannedStartDate: startDate,
      plannedEndDate: endDate,
      status: TaskStatus.TODO,
    });

    const savedTask = await newTask.save();
    
    // NOTIFICATION : Alerter l'auteur avec toutes les infos
    if (authorId) {
      const msg = `🚀 Nouvelle mission assignée !\n` +
                 `Projet: ${projectName}\n` +
                 `Module: ${categoryName}\n` +
                 `Tâche: ${dto.title}\n` +
                 `Échéance: ${new Date(endDate).toLocaleDateString()}\n` +
                 `Charge estimée: ${dto.estimatedDuration}h`;
                 
      await this.notificationService.create(
        authorId,
        '🚀 Nouvelle Tâche DO-178C',
        msg,
        'TASK_ASSIGNED'
      );
    }

    return savedTask;
  }

  async createTasksWithIdempotency(taskDtos: any[], idempotencyKey: string) {
    try {
      const existing = await this.taskModel.find({ idempotencyKey });
      if (existing.length > 0) return existing;

      const tasksToCreate = taskDtos.map(t => ({ ...t, idempotencyKey }));
      const savedTasks = await this.taskModel.insertMany(tasksToCreate);

      // Notify owners for all created tasks
      for (const t of savedTasks) {
        if (t.authorId) {
          await this.notificationService.create(
            t.authorId.toString(),
            'Nouvelle Mission',
            `Nouvelle tâche générée : ${t.title}`,
            'TASK_ASSIGNED'
          );
        }
      }
      return savedTasks;

    } catch (error: any) {
      if (error.code === 11000) return await this.taskModel.find({ idempotencyKey });
      throw error;
    }
  }

  async updateStatus(taskId: string, status: TaskStatus, memberId: string): Promise<Task> {
    const task = await this.taskModel.findById(taskId);
    if (!task) throw new BadRequestException('Tâche non trouvée');

    // Validation des droits
    const isAuthor = task.authorId.toString() === memberId;
    const isReviewer = task.reviewerId?.toString() === memberId;

    if (!isAuthor && !isReviewer) {
      throw new BadRequestException("Vous n'êtes pas autorisé à modifier cette tâche.");
    }

    task.status = status;
    const saved = await task.save();

    // Logique de notification auto
    if (status === TaskStatus.READY_FOR_REVIEW && isAuthor && task.reviewerId) {
       await this.notificationService.create(
         task.reviewerId.toString(),
         '🏁 Tâche prête pour Revue',
         `L'auteur a terminé la tâche : ${task.title}. Votre revue est attendue.`,
         'REVIEW_REQUIRED'
       );
    }

    return saved;
  }

  async assignReviewer(taskId: string, reviewerId: string): Promise<Task> {
    const task = await this.taskModel.findById(taskId);
    if (!task) throw new BadRequestException('Task not found');
    
    if (task.authorId.toString() === reviewerId.toString()) {
      throw new BadRequestException('DO-178C Violation: The author of the task cannot act as its reviewer.');
    }

    task.reviewerId = new Types.ObjectId(reviewerId);
    task.status = TaskStatus.READY_FOR_REVIEW;
    
    const savedTask = await task.save();

    // NOTIFICATION : Alerter le réviseur
    await this.notificationService.create(
      reviewerId,
      'Revue Requise',
      `Une nouvelle revue est attendue pour la tâche : ${task.title}`,
      'REVIEW_REQUIRED'
    );

    return savedTask;
  }

  calculateBusinessEndDate(startDate: Date, estimatedHours: number): Date {
    let current = new Date(startDate);
    let remainingHours = estimatedHours;

    while (remainingHours > 0) {
      const day = current.getDay();
      if (day === 0 || day === 6) {
        current.setDate(current.getDate() + 1);
        current.setHours(8, 0, 0, 0);
        continue;
      }

      const hour = current.getHours();
      if (hour < 8) current.setHours(8, 0, 0, 0);
      else if (hour >= 12 && hour < 14) current.setHours(14, 0, 0, 0);
      else if (hour >= 17) {
        current.setDate(current.getDate() + 1);
        current.setHours(8, 0, 0, 0);
      } else {
        current.setHours(current.getHours() + 1);
        remainingHours -= 1;
      }
    }
    return current;
  }

  async getMemberDashboard(memberId: string) {
    const memberObjectId = new Types.ObjectId(memberId);
    
    const [authorTasks, reviewerTasks, myProjects] = await Promise.all([
      this.taskModel.find({ authorId: memberObjectId, status: { $ne: TaskStatus.CLOSED } })
        .populate('subActivityId')
        .lean()
        .exec(),
      this.taskModel.find({ reviewerId: memberObjectId, status: TaskStatus.READY_FOR_REVIEW })
        .populate('subActivityId')
        .lean()
        .exec(),
      this.projectModel.find({ teamMembers: memberObjectId, status: { $ne: ProjectStatus.ARCHIVED } })
        .lean()
        .exec()
    ]);

    const todayTasks = authorTasks.map(t => ({
      id: t._id,
      time: t.plannedStartDate ? new Date(t.plannedStartDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ASAP',
      name: t.title,
      type: 'Author',
      project: (t as any).subActivityId?.projectName || 'SmartPM',
      status: t.status === TaskStatus.IN_PROGRESS ? 'current' : 'upcoming',
      duration: t.estimatedDuration
    }));

    const reviewsToDone = reviewerTasks.map(r => ({
      id: r._id,
      colleague: 'Collègue', 
      task: r.title,
      project: (r as any).subActivityId?.projectName || 'SmartPM',
      comments: 0
    }));

    const formattedProjects = myProjects.map(p => ({
      id: p._id,
      name: p.name,
      description: p.description,
      status: p.status,
      membersCount: p.teamMembers?.length || 0,
      endDate: p.targetEndDate
    }));

    return {
      todayTasks,
      reviewsToDone,
      myProjects: formattedProjects,
      performanceStats: [
        { label: 'Projets Actifs', value: myProjects.length.toString(), icon: '📁' },
        { label: 'Tâches à faire', value: (authorTasks.filter(t => t.status !== TaskStatus.CLOSED).length).toString(), icon: '✅' },
        { label: 'Taux de Revue', value: '100%', icon: '📈' },
        { label: 'Certifications', value: (myProjects.length > 0 ? '2' : '1'), icon: '🎓' }
      ]
    };
  }

  async getProjectTasks(projectId: string, memberId: string) {
    const projId = new Types.ObjectId(projectId);
    const mId = new Types.ObjectId(memberId);

    const subActivities = await this.subModel.find({ projectId: projId }).lean().exec();
    const subIds = subActivities.map(s => s._id);

    const tasks = await this.taskModel.find({
      subActivityId: { $in: subIds },
      $or: [{ authorId: mId }, { reviewerId: mId }]
    })
    .populate('subActivityId')
    .lean()
    .exec();

    return tasks.map(t => ({
      id: t._id,
      title: t.title,
      status: t.status,
      category: (t as any).subActivityId?.category || 'Général',
      role: t.authorId.toString() === memberId ? 'Auteur' : 'Réviseur',
      deadline: t.plannedEndDate,
      duration: t.estimatedDuration
    }));
  }
}
