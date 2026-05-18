import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserTrainingDocument = UserTraining & Document;

export enum UserTrainingStatus {
  ASSIGNED   = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED  = 'COMPLETED',
  FAILED     = 'FAILED',
}

@Schema({ timestamps: true })
export class UserTraining {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Training', required: true })
  trainingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedBy: Types.ObjectId | null; // null = self-assigned via transfer request

  @Prop({ type: String, enum: UserTrainingStatus, default: UserTrainingStatus.ASSIGNED })
  status: UserTrainingStatus;

  @Prop({ type: Number, default: 0 }) // 0-100
  progress: number;

  @Prop({ type: Number, default: null })
  quizScore: number | null;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;
}

export const UserTrainingSchema = SchemaFactory.createForClass(UserTraining);

// Compound unique index: one record per user per training
UserTrainingSchema.index({ userId: 1, trainingId: 1 }, { unique: true });
