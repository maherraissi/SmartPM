import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId | string;

  @Prop({ required: true })
  text: string;

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  projectId: Types.ObjectId | string;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
