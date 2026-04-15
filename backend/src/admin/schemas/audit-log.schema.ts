import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

export enum AuditAction {
 CREATE_USER    = 'CREATE_USER',
 UPDATE_USER    = 'UPDATE_USER',
 DEACTIVATE_USER  = 'DEACTIVATE_USER',
 ACTIVATE_USER   = 'ACTIVATE_USER',
 DELETE_USER    = 'DELETE_USER',
 RESET_PASSWORD   = 'RESET_PASSWORD',
 ASSIGN_ROLE    = 'ASSIGN_ROLE',
 APPROVE_CERT    = 'APPROVE_CERT',
 REVOKE_CERT    = 'REVOKE_CERT',
 APPROVE_TRANSFER  = 'APPROVE_TRANSFER',
 REJECT_TRANSFER  = 'REJECT_TRANSFER',
 UPDATE_SETTINGS  = 'UPDATE_SETTINGS',
 LOCK_ACCOUNT    = 'LOCK_ACCOUNT',
 UNLOCK_ACCOUNT   = 'UNLOCK_ACCOUNT',
}

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
 @Prop({ type: Types.ObjectId, ref: 'User', required: true })
 adminId: Types.ObjectId;

 @Prop({ required: true })
 adminEmail: string;

 @Prop({ type: String, enum: AuditAction, required: true })
 action: AuditAction;

 @Prop({ required: true })
 targetEntity: string; // e.g. 'User', 'Certification', 'TransferRequest'

 @Prop({ type: Types.ObjectId })
 targetId?: Types.ObjectId;

 @Prop({ type: Object })
 before?: Record<string, any>;

 @Prop({ type: Object })
 after?: Record<string, any>;

 @Prop()
 ipAddress?: string;

 @Prop()
 userAgent?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
// Index for fast admin audit queries
AuditLogSchema.index({ adminId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
