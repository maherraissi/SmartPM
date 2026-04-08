import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument, TaskStatus } from './schemas/task.schema';

@Injectable()
export class TaskService {
  constructor(@InjectModel(Task.name) private taskModel: Model<TaskDocument>) {}

  async createTask(dto: any): Promise<Task | Task[]> {
    if (Array.isArray(dto)) {
      return Promise.all(dto.map(t => this.createTask(t) as Promise<Task>));
    }

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

    return newTask.save();
  }

  // =========================================================================
  // ENTERPRISE PATTERN: Idempotency Logic
  // Avoids double-execution when Manager retries or network fails.
  // =========================================================================
  async createTasksWithIdempotency(taskDtos: any[], idempotencyKey: string) {
    try {
      // 1. Verify if the identical transaction was already successfully processed
      const existing = await this.taskModel.find({ idempotencyKey });
      if (existing.length > 0) {
        console.log(`[IDEMPOTENCY] Network retry detected. Bypassing execution for key: ${idempotencyKey}`);
        return existing; // Safely return the cached result
      }

      // 2. Perform the operation idempotently
      const tasksToCreate = taskDtos.map(t => ({ ...t, idempotencyKey }));
      return await this.taskModel.insertMany(tasksToCreate);
      
    } catch (error) {
      if (error.code === 11000) { // MongoDB Unique constraint violation fallback
        return await this.taskModel.find({ idempotencyKey });
      }
      throw error;
    }
  }

  // =========================================================================
  // 1. COMPLIANCE ENGINE (DO-178C Independence Rule)
  // =========================================================================
  async assignReviewer(taskId: string, reviewerId: string): Promise<Task> {
    const task = await this.taskModel.findById(taskId);
    if (!task) throw new BadRequestException('Task not found');
    
    // GOLDEN RULE: Strict separation of roles
    if (task.authorId.toString() === reviewerId.toString()) {
      throw new BadRequestException('DO-178C Violation: The author of the task cannot act as its reviewer.');
    }

    task.reviewerId = new Types.ObjectId(reviewerId);
    task.status = TaskStatus.READY_FOR_REVIEW;
    
    return task.save();
  }

  // =========================================================================
  // 2. AUTOMATIC TIME SCHEDULER ENGINE (Company Standard: 7 hours/day)
  // Working Hours: 08:00 to 12:00 AND 14:00 to 17:00 (No Weekends)
  // =========================================================================
  calculateBusinessEndDate(startDate: Date, estimatedHours: number): Date {
    let current = new Date(startDate);
    let remainingHours = estimatedHours;

    while (remainingHours > 0) {
      const day = current.getDay();
      
      // Skip Weekends (0 = Sunday, 6 = Saturday)
      if (day === 0 || day === 6) {
        current.setDate(current.getDate() + 1);
        current.setHours(8, 0, 0, 0); // Jump to next morning
        continue;
      }

      const hour = current.getHours();
      
      if (hour < 8) {
        // Fast-forward to 08:00 AM
        current.setHours(8, 0, 0, 0);
      } else if (hour >= 12 && hour < 14) {
        // Fast-forward lunch break to 14:00 PM
        current.setHours(14, 0, 0, 0);
      } else if (hour >= 17) {
        // Shift over to the next day at 08:00 AM
        current.setDate(current.getDate() + 1);
        current.setHours(8, 0, 0, 0);
      } else {
        // We are deeply inside valid working hours! Consume 1 hour of work.
        current.setHours(current.getHours() + 1);
        remainingHours -= 1;
      }
    }
    
    return current;
  }

  async getMemberDashboard(memberId: string) {
    const memberObjectId = new Types.ObjectId(memberId);
    
    const [tasks, reviews] = await Promise.all([
      this.taskModel.find({ authorId: memberObjectId }).lean().exec(),
      this.taskModel.find({ reviewerId: memberObjectId }).lean().exec()
    ]);

    // Grouping tasks for "Today" (slots logic placeholder)
    const todayTasks = tasks.map(t => ({
      time: '08:00 - 12:00', // Map real start hours in real scenario
      name: t.title,
      type: 'Author',
      project: 'SmartPM',
      status: t.status === 'IN_PROGRESS' ? 'current' : 'upcoming'
    }));

    const reviewsToDone = reviews.map(r => ({
      colleague: 'Team', 
      task: r.title,
      project: 'SmartPM',
      comments: 0
    }));

    return {
      todayTasks,
      reviewsToDone,
      performanceStats: [
        { label: 'Tasks Done', value: tasks.filter(t => t.status === TaskStatus.CLOSED).length.toString(), icon: '✅' },
        { label: 'Avg Time', value: '4.5h', icon: '⏱️' },
        { label: 'Review Rate', value: '100%', icon: '📈' },
        { label: 'Quiz Score', value: 'N/A', icon: '🎓' }
      ]
    };
  }
}
