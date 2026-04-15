import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AeroPhase } from '../../user/schemas/user.schema';

export type TrainingDocument = Training & Document;

@Schema({ _id: false })
class Material {
 @Prop({ required: true })
 title: string;

 @Prop({ type: String, enum: ['VIDEO', 'PDF', 'DOCUMENT'], required: true })
 type: string;

 @Prop({ required: true })
 url: string;
}

@Schema({ timestamps: true })
export class Training {
 @Prop({ required: true })
 title: string; // LLR, LLT, HLT, or Custom

 @Prop({ required: true })
 description: string;

 @Prop({ type: String, enum: AeroPhase, required: true })
 targetPhase: AeroPhase;

 @Prop({ type: Number, default: 1 }) // 1 or 2 weeks
 durationWeeks: number;

 @Prop({ type: Number, default: 30 }) // 30 or 45 minutes
 quizDurationMinutes: number;

 @Prop({ type: [Material], default: [] })
 materials: Material[];

 @Prop({ type: Number, default: 80 }) // 80% default pass
 passingScore: number;
}

export const TrainingSchema = SchemaFactory.createForClass(Training);
