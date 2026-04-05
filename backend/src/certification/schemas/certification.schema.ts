import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AeroPhase } from '../../user/schemas/user.schema';

export type CertificationDocument = Certification & Document;

export enum CertificationStatus {
  PENDING_TRAINING = 'PENDING_TRAINING',
  AWAITING_ADMIN_APPROVAL = 'AWAITING_ADMIN_APPROVAL',
  CERTIFIED = 'CERTIFIED',
  REVOKED = 'REVOKED'
}

@Schema({ timestamps: true })
export class Certification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId | string;

  @Prop({ type: String, enum: AeroPhase, required: true })
  phase: AeroPhase;

  // Gating access logic mechanism
  @Prop({ type: String, enum: CertificationStatus, default: CertificationStatus.PENDING_TRAINING })
  status: CertificationStatus;
  
  @Prop({ type: Number, default: 0 })
  currentScore: number;
}

export const CertificationSchema = SchemaFactory.createForClass(Certification);
