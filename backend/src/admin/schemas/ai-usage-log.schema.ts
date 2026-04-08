import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AIUsageLogDocument = AIUsageLog & Document;

export enum AIProvider {
  OLLAMA = 'ollama',
  GEMINI = 'gemini',
}

export enum AIRequestType {
  DELAY_PREDICTION    = 'DELAY_PREDICTION',
  REVIEWER_SUGGESTION = 'REVIEWER_SUGGESTION',
  RISK_DETECTION      = 'RISK_DETECTION',
  QUIZ_GENERATION     = 'QUIZ_GENERATION',
  COMPLIANCE_CHECK    = 'COMPLIANCE_CHECK',
  FEEDBACK_ANALYSIS   = 'FEEDBACK_ANALYSIS',
  GENERAL             = 'GENERAL',
}

@Schema({ timestamps: true, collection: 'ai_usage_logs' })
export class AIUsageLog {
  @Prop({ type: String, enum: AIProvider, required: true })
  provider: AIProvider;

  @Prop({ type: String, enum: AIRequestType, required: true })
  requestType: AIRequestType;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  requestedBy?: Types.ObjectId;

  @Prop({ default: false })
  success: boolean;

  @Prop()
  errorMessage?: string;

  @Prop({ default: 0 })
  tokensUsed: number;

  @Prop({ default: 0 })
  latencyMs: number;

  @Prop({ type: Number, min: 0, max: 5 })
  feedbackScore?: number; // Quality score 0-5 given by user

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const AIUsageLogSchema = SchemaFactory.createForClass(AIUsageLog);
AIUsageLogSchema.index({ provider: 1, createdAt: -1 });
AIUsageLogSchema.index({ requestType: 1, success: 1 });
AIUsageLogSchema.index({ createdAt: -1 }); // TTL-ready index
