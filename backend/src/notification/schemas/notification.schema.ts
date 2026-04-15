import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
 @Prop({ type: Types.ObjectId, ref: 'User', required: true })
 recipientId: Types.ObjectId | string;

 @Prop({ required: true })
 title: string;

 @Prop({ required: true })
 message: string;

 @Prop({ default: false })
 isRead: boolean;

 @Prop()
 type: string; // 'TASK_ASSIGNED', 'REVIEW_REQUIRED', 'TASK_CLOSED'

 @Prop()
 link?: string; // To jump to the specific page
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
