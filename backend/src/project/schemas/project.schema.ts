import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

export enum ProjectStatus {
 PLANNING = 'PLANNING',
 ACTIVE = 'ACTIVE',
 ON_HOLD = 'ON_HOLD',
 COMPLETED = 'COMPLETED',
 ARCHIVED = 'ARCHIVED',
}

@Schema({ timestamps: true })
export class Project {
 @Prop({ required: true })
 name: string;

 @Prop()
 description: string;

 @Prop({ type: Types.ObjectId, ref: 'User', required: true })
 managerId: Types.ObjectId | string;

 @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
 teamMembers: (Types.ObjectId | string)[];

 @Prop({ type: String, enum: ProjectStatus, default: ProjectStatus.PLANNING })
 status: ProjectStatus;

 @Prop()
 startDate: Date;

 @Prop()
 targetEndDate: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
