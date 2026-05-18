import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeamTransferRequestDocument = TeamTransferRequest & Document;

export enum TransferStatus {
  PENDING  = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true })
export class TeamTransferRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  fromEquipe: string;

  @Prop({ type: String, required: true })
  toEquipe: string;

  @Prop({ required: true })
  reason: string;

  @Prop({ type: String, enum: TransferStatus, default: TransferStatus.PENDING })
  status: TransferStatus;

  @Prop({ type: String, default: null })
  adminNote: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewedBy: Types.ObjectId | null;
}

export const TeamTransferRequestSchema = SchemaFactory.createForClass(TeamTransferRequest);
