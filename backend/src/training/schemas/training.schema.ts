import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AeroPhase } from '../../user/schemas/user.schema';

export type TrainingDocument = Training & Document;

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

@Schema({ _id: false })
class Material {
  @Prop({ required: true })
  title: string;

  @Prop({ type: String, enum: ['VIDEO', 'PDF', 'DOCUMENT'], required: true })
  type: string;

  @Prop({ required: true })
  url: string;
}

const MaterialSchema = SchemaFactory.createForClass(Material);

@Schema({ _id: false })
class Lesson {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  resourceUrl: string;

  @Prop({ type: String, enum: ['VIDEO', 'PDF', 'DOCUMENT'], default: 'PDF' })
  resourceType: string;
}

const LessonSchema = SchemaFactory.createForClass(Lesson);

@Schema({ _id: false })
class QuizQuestion {
  @Prop({ required: true })
  question: string;

  @Prop({ type: [String], required: true })
  options: string[]; // 4 choices

  @Prop({ type: Number, required: true })
  correctIndex: number; // index of correct option (0-3)
}

const QuizQuestionSchema = SchemaFactory.createForClass(QuizQuestion);

// ─── Main Training Schema ──────────────────────────────────────────────────────

@Schema({ timestamps: true })
export class Training {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, enum: AeroPhase, required: true })
  targetPhase: AeroPhase;

  @Prop({ type: Number, default: 1 })
  durationWeeks: number;

  @Prop({ type: Number, default: 30 })
  quizDurationMinutes: number;

  @Prop({ type: Number, default: 80 })
  passingScore: number;

  @Prop({ type: [MaterialSchema], default: [] })
  materials: Material[];

  @Prop({ type: [LessonSchema], default: [] })
  lessons: Lesson[];

  @Prop({ type: [QuizQuestionSchema], default: [] })
  quiz: QuizQuestion[];
}

export const TrainingSchema = SchemaFactory.createForClass(Training);
