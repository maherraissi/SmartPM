import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AeroPhase } from '../../user/schemas/user.schema';

export type ActivityDocument = Activity & Document;

@Schema({ timestamps: true })
export class Activity {
 @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
 projectId: Types.ObjectId | string;

 @Prop({ type: String, required: true })
 projectName: string;

 @Prop({ type: String, required: true })
 name: string; // The display name of the activity/phase

 @Prop({ type: String, enum: AeroPhase, required: true })
 phase: AeroPhase;

 // Track aggregated progress of all inner tasks
 @Prop({ type: Number, default: 0 })
 progressPercentage: number;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
