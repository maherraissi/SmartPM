import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AeroPhase } from '../../user/schemas/user.schema';

export type FunctionTemplateDocument = FunctionTemplate & Document;

@Schema({ timestamps: true })
export class FunctionTemplate {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  // e.g. "LLR", "HLT"... To filter templates easily based on the context
  @Prop({ type: String, enum: AeroPhase, required: true })
  targetPhase: AeroPhase;

  // e.g., "Creation", "Review", "Architecture"
  @Prop({ required: true })
  category: string;

  @Prop({ type: Number, required: true }) // Default estimation to pre-fill tasks
  defaultEstimatedDuration: number;
}

export const FunctionTemplateSchema = SchemaFactory.createForClass(FunctionTemplate);
