import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlatformSettingsDocument = PlatformSettings & Document;

@Schema({ timestamps: true, collection: 'platform_settings' })
export class PlatformSettings {
  // Singleton key — only one settings document should exist
  @Prop({ default: 'global', unique: true })
  key: string;

  // Working Hours
  @Prop({ default: '08:00' }) workDayStart: string;
  @Prop({ default: '12:00' }) morningEnd: string;
  @Prop({ default: '14:00' }) afternoonStart: string;
  @Prop({ default: '17:00' }) workDayEnd: string;

  // Default Task Duration (in hours)
  @Prop({ default: 2 }) defaultTaskDurationHours: number;

  // Weekend Days (0 = Sunday, 6 = Saturday)
  @Prop({ type: [Number], default: [0, 6] }) weekendDays: number[];

  // Holidays list [YYYY-MM-DD]
  @Prop({ type: [String], default: [] }) holidays: string[];

  // Notification Rules
  @Prop({ default: true })  notifyOnOverdueTask: boolean;
  @Prop({ default: true })  notifyOnCertExpiry: boolean;
  @Prop({ default: 7 })     certExpiryWarningDays: number;
  @Prop({ default: true })  notifyOnTransferRequest: boolean;
  @Prop({ default: true })  notifyOnFailedQuiz: boolean;

  // AI Policies
  @Prop({ default: true })  aiDelayPredictionEnabled: boolean;
  @Prop({ default: true })  aiReviewerSuggestionEnabled: boolean;
  @Prop({ default: true })  aiRiskDetectionEnabled: boolean;
  @Prop({ default: 'ollama' }) aiProvider: string; // 'ollama' | 'gemini' | 'both'
  @Prop({ default: 100 })   aiMonthlyTokenBudget: number; // in thousands

  // GitHub Integration
  @Prop({ default: false }) githubIntegrationEnabled: boolean;
  @Prop() githubOrg?: string;
  @Prop() githubToken?: string;

  // Backup
  @Prop({ default: false }) autoBackupEnabled: boolean;
  @Prop({ default: 'daily' }) backupFrequency: string; // 'daily' | 'weekly'
  @Prop() backupDestination?: string;
}

export const PlatformSettingsSchema = SchemaFactory.createForClass(PlatformSettings);
