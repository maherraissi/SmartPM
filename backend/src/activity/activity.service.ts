import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActivityTemplate, ActivityTemplateDocument } from './schemas/activity-template.schema';
import { AeroPhase } from '../user/schemas/user.schema';

@Injectable()
export class ActivityService implements OnModuleInit {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectModel(ActivityTemplate.name) private activityTemplateModel: Model<ActivityTemplateDocument>,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Initializing DO-178C Activity Matrix Upsert...');
    await this.seedActivityTemplates();
  }

  private async seedActivityTemplates() {
    const predefinedTemplates = [
      { 
        phaseId: AeroPhase.LLR, 
        name: 'Low Level Requirements (LLR)',
        icon: '🧩',
        subActivities: [
          { id: 'LLR_ARCH', name: 'Architecture Design' },
          { id: 'LLR_REV',  name: 'Creation & Revue' },
          { id: 'LLR_CODE', name: 'Code Review' }
        ]
      },
      { 
        phaseId: AeroPhase.LLT, 
        name: 'Low Level Testing (LLT)',
        icon: '🧪',
        subActivities: [
          { id: 'LLT_CRV', name: 'Creation & Revue' }
        ]
      },
      { 
        phaseId: AeroPhase.HLT, 
        name: 'High Level Testing (HLT)',
        icon: '✈️',
        subActivities: [
          { id: 'HLT_TCH', name: 'Create Test Cases from HLR' },
          { id: 'HLT_DSC', name: 'Define Scenarios & Cases' }
        ]
      }
    ];

    try {
      const operations = predefinedTemplates.map(template => ({
        updateOne: {
          filter: { phaseId: template.phaseId },
          update: { $set: template },
          upsert: true
        }
      }));

      const result = await this.activityTemplateModel.bulkWrite(operations);
      this.logger.log(`✅ Activity Matrix successfully seeded/upserted in DB.`);
    } catch (error) {
      this.logger.error('❌ Failed to seed Activity Matrix.', error);
    }
  }

  // Future method: Retrieve these from DB for the Frontend Wizard
  async getActivityTemplates() {
    return this.activityTemplateModel.find().exec();
  }
}
