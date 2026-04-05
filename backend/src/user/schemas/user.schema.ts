import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER',
}

export enum AeroPhase {
  HLR = 'HLR',
  LLR = 'LLR',
  CODE = 'CODE',
  LLT = 'LLT',
  HLT = 'HLT'
}

@Schema({
  timestamps: true,
  toJSON: {
    transform: (doc, ret: any) => {
      // ENTERPRISE SECURITY: Never leak passwords or OAuth IDs to the frontend
      delete ret.passwordHash;
      delete ret.providerId;
      delete ret.__v;
      return ret;
    }
  }
})
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false })
  passwordHash?: string;

  // Enterprise Security fields for OAuth
  @Prop({ default: 'local' }) // values: local, google, github
  provider: string;

  @Prop()
  providerId?: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.MEMBER })
  role: UserRole;

  // The Competency Matrix: only certified members can work/review certain phases
  @Prop({ type: [String], enum: AeroPhase, default: [] })
  certifications: AeroPhase[];

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
