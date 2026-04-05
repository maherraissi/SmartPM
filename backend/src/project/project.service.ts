import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { Activity, ActivityDocument } from '../activity/schemas/activity.schema';
import { SubActivity, SubActivityDocument } from '../sub-activity/schemas/sub-activity.schema';
import { AeroPhase } from '../user/schemas/user.schema';

@Injectable()
export class ProjectService {
  private logger = new Logger(ProjectService.name);

  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(SubActivity.name) private subActivityModel: Model<SubActivityDocument>
  ) {}

  async deployMission(payload: any) {
    this.logger.log(`Deploying new Aerospace Mission: ${payload.name}`);
    
    // 1. Create Core Project
    const project = new this.projectModel({
      name: payload.name,
      description: payload.description,
      startDate: new Date(payload.startDate),
      targetEndDate: new Date(payload.endDate),
      // Dummy manager for early MVP 
      managerId: '000000000000000000000000' 
    });
    
    const savedProject = await project.save();

    // 2. Cascade Create Activities & SubActivities
    if (payload.activities && Array.isArray(payload.activities)) {
      for (const act of payload.activities) {
        // Enforce Enum Compatibility or map to CUSTOM
        const mappedPhase = ['HLR', 'LLR', 'CODE', 'LLT', 'HLT'].includes(act.id) ? act.id : AeroPhase.CUSTOM;

        const newActivity = new this.activityModel({
          projectId: savedProject._id,
          phase: mappedPhase 
        });
        const savedActivity = await newActivity.save();

        if (act.subs && Array.isArray(act.subs)) {
          for (const sub of act.subs) {
            const newSub = new this.subActivityModel({
              activityId: savedActivity._id,
              name: sub.name,
              isCompleted: false
            });
            await newSub.save();
          }
        }
      }
    }

    this.logger.log(`Mission Deployment SUCCESS: ${savedProject._id}`);
    return { success: true, projectId: savedProject._id };
  }
}
