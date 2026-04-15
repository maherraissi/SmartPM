import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubActivityDocument = SubActivity & Document;

@Schema({ timestamps: true })
export class SubActivity {
 @Prop({ type: Types.ObjectId, ref: 'Activity', required: true })
 activityId: Types.ObjectId | string;

 @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
 projectId: Types.ObjectId | string;

 @Prop({ type: String, required: true })
 projectName: string;

 // E.g., 'Creation', 'Review', 'Code Review'
 @Prop({ required: true })
 category: string; 

 @Prop({ type: Number, default: 0 })
 progressPercentage: number;

 @Prop({ type: [{ name: String, url: String }], default: [] })
 attachedFiles: { name: string; url: string }[];
}

export const SubActivitySchema = SchemaFactory.createForClass(SubActivity);
