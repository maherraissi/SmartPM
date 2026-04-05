import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument, TaskStatus } from './schemas/task.schema';

@Injectable()
export class TaskService {
  constructor(@InjectModel(Task.name) private taskModel: Model<TaskDocument>) {}

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
}
