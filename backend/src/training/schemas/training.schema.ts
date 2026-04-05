import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AeroPhase } from '../../user/schemas/user.schema';

export type TrainingDocument = Training & Document;

export enum ContentType {
  VIDEO = 'VIDEO',
  PDF = 'PDF',
  QUIZ = 'QUIZ'
}

@Schema({ timestamps: true })
export class Training {
  @Prop({ required: true })
  title: string;

  @Prop({ type: String, enum: AeroPhase, required: true })
  targetPhase: AeroPhase;

  @Prop({ type: String, enum: ContentType, required: true })
  contentType: ContentType;

  // S3 path, local URL, or external link
  @Prop({ required: true })
  resourceUrl: string;

  // Determines threshold logic, minimum 80% passing standard
  @Prop({ type: Number, default: 0 })
  passingScore: number; 
}

export const TrainingSchema = SchemaFactory.createForClass(Training);
