import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

/**
 * Commentaire — peut être rattaché à une Tache ou à un Projet
 * Relations (image) :
 *   Manager  (1) → Commentaire (*)
 *   Tache    (1) → Commentaire (*)
 */
@Schema({ timestamps: true })
export class Comment {
  // Auteur du commentaire (User : Manager ou Membre)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId | string;

  @Prop({ required: true })
  text: string;

  // Rattachement au Projet (optionnel)
  @Prop({ type: Types.ObjectId, ref: 'Project', default: null })
  projectId: Types.ObjectId | string | null;

  // Rattachement à la Tâche (optionnel — relation * de Tache vers Commentaire)
  @Prop({ type: Types.ObjectId, ref: 'Task', default: null })
  taskId: Types.ObjectId | string | null;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
