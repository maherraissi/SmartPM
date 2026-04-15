import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ComplianceAlertDocument = ComplianceAlert & Document;

export enum AlertType {
 UNCERTIFIED_MEMBER_ASSIGNED = 'UNCERTIFIED_MEMBER_ASSIGNED',
 AUTHOR_IS_REVIEWER     = 'AUTHOR_IS_REVIEWER',
 OVERDUE_REVIEW       = 'OVERDUE_REVIEW',
 MISSING_EVIDENCE      = 'MISSING_EVIDENCE',
 BLOCKED_TASK        = 'BLOCKED_TASK',
 FAILED_QUIZ         = 'FAILED_QUIZ',
 EXPIRED_CERTIFICATION    = 'EXPIRED_CERTIFICATION',
 AI_SERVICE_ISSUE      = 'AI_SERVICE_ISSUE',
 ACCOUNT_SUSPICIOUS_ACTIVITY = 'ACCOUNT_SUSPICIOUS_ACTIVITY',
 OVERDUE_TASK        = 'OVERDUE_TASK',
 TEAM_OVERLOAD        = 'TEAM_OVERLOAD',
}

export enum AlertSeverity {
 LOW   = 'LOW',
 MEDIUM  = 'MEDIUM',
 HIGH   = 'HIGH',
 CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
 OPEN   = 'OPEN',
 REVIEWED = 'REVIEWED',
 RESOLVED = 'RESOLVED',
 IGNORED = 'IGNORED',
}

@Schema({ timestamps: true, collection: 'compliance_alerts' })
export class ComplianceAlert {
 @Prop({ type: String, enum: AlertType, required: true })
 type: AlertType;

 @Prop({ type: String, enum: AlertSeverity, default: AlertSeverity.MEDIUM })
 severity: AlertSeverity;

 @Prop({ type: String, enum: AlertStatus, default: AlertStatus.OPEN })
 status: AlertStatus;

 @Prop({ required: true })
 message: string;

 @Prop()
 entityRef?: string; // e.g. 'User', 'Task', 'Review'

 @Prop({ type: Types.ObjectId })
 entityId?: Types.ObjectId;

 @Prop({ type: Types.ObjectId, ref: 'User' })
 affectedUserId?: Types.ObjectId;

 @Prop({ type: Types.ObjectId, ref: 'User' })
 resolvedBy?: Types.ObjectId;

 @Prop()
 resolvedAt?: Date;

 @Prop()
 notes?: string;
}

export const ComplianceAlertSchema = SchemaFactory.createForClass(ComplianceAlert);
ComplianceAlertSchema.index({ status: 1, severity: -1, createdAt: -1 });
ComplianceAlertSchema.index({ type: 1 });
