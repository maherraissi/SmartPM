import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AeroPhase } from '../../user/schemas/user.schema';

export type TransferRequestDocument = TransferRequest & Document;

export enum TransferStatus {
  PENDING  = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true, collection: 'transfer_requests' })
export class TransferRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  requestedBy?: Types.ObjectId; // Manager who requested (or member themselves)

  @Prop({ type: String, enum: AeroPhase, required: true })
  fromTeam: AeroPhase;

  @Prop({ type: String, enum: AeroPhase, required: true })
  toTeam: AeroPhase;

  @Prop({ required: true })
  reason: string;

  @Prop({ type: String, enum: TransferStatus, default: TransferStatus.PENDING })
  status: TransferStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId; // Admin who approved/rejected

  @Prop()
  reviewedAt?: Date;

  @Prop()
  adminNotes?: string;

  // Certification proof
  @Prop({ type: [String], default: [] })
  certificationEvidence: string[];
}

export const TransferRequestSchema = SchemaFactory.createForClass(TransferRequest);
TransferRequestSchema.index({ status: 1, createdAt: -1 });
TransferRequestSchema.index({ memberId: 1 });
