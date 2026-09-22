import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

/**
 * Notification (Notif) — relation User (1) → Notif (*)
 * Un User (Manager ou Membre) reçoit des notifications.
 * Le Manager peut déclencher des notifications vers les Membres.
 */
@Schema({ timestamps: true })
export class Notification {
  // Destinataire de la notification
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipientId: Types.ObjectId | string;

  // Expéditeur (Manager ou système — null = système automatique)
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  senderId: Types.ObjectId | string | null;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  type: string; // 'TASK_ASSIGNED', 'REVIEW_REQUIRED', 'TASK_CLOSED', 'DEMANDE_APPROUVEE'

  @Prop()
  link?: string; // Pour naviguer vers la page concernée
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
