import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  READY_FOR_REVIEW = 'READY_FOR_REVIEW',
  REVIEWED = 'REVIEWED',
  BLOCKED = 'BLOCKED',
  CLOSED = 'CLOSED'
}

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  // Link upwards to SubActivity -> Activity -> Project
  @Prop({ type: Types.ObjectId, ref: 'SubActivity', required: true })
  subActivityId: Types.ObjectId | string;

  // Enforces Author != Reviewer rule
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId | string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewerId: Types.ObjectId | string;

  @Prop({ type: String, enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  // Automatic Scheduling fields
  @Prop({ type: Number, required: true }) // Estimate in hours
  estimatedDuration: number;

  @Prop({ type: Number, default: 0 }) // Real spent time in hours
  actualDuration: number;

  @Prop()
  plannedStartDate: Date;

  @Prop()
  plannedEndDate: Date;

  @Prop()
  actualStartDate: Date;

  @Prop()
  actualEndDate: Date;

  @Prop({ type: [String], default: [] })
  evidenceLinks: string[]; // PDFs, links, etc.

  // Enterprise Idempotency Pattern: Prevents network retries from duplicating tasks
  @Prop({ unique: true, sparse: true })
  idempotencyKey?: string;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
