import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AeroPhase } from '../../user/schemas/user.schema';

export type ActivityTemplateDocument = ActivityTemplate & Document;

@Schema({ timestamps: true })
export class ActivityTemplate {
  @Prop({ type: String, enum: AeroPhase, required: true, unique: true })
  phaseId: AeroPhase;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  icon: string;

  @Prop({ type: [{ id: String, name: String }] })
  subActivities: { id: string; name: string }[];
}

export const ActivityTemplateSchema = SchemaFactory.createForClass(ActivityTemplate);
