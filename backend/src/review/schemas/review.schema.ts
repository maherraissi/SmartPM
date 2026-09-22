import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

export enum ReviewDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NEEDS_REWORK = 'NEEDS_REWORK',
}

/**
 * Review — relation 0..1 avec Tache (une tâche peut avoir au plus un review)
 * Le reviewer est un Membre différent de l'auteur de la tâche (rule métier)
 */
@Schema({ timestamps: true })
export class Review {
  // FK → Tache (1 review par tâche max)
  @Prop({ type: Types.ObjectId, ref: 'Task', required: true, unique: true })
  taskId: Types.ObjectId | string;

  // Reviewer = Membre (différent de l'auteur)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reviewerId: Types.ObjectId | string;

  @Prop({ type: String, enum: ReviewDecision, required: true })
  decision: ReviewDecision;

  @Prop({ required: true })
  comment: string;

  // Liens vers les preuves / documents de review
  @Prop({ type: [String], default: [] })
  evidenceLinks: string[];
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
