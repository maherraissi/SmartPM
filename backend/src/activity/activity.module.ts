import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { Activity, ActivitySchema } from './schemas/activity.schema';
import { ActivityTemplate, ActivityTemplateSchema } from './schemas/activity-template.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Activity.name, schema: ActivitySchema },
    { name: ActivityTemplate.name, schema: ActivityTemplateSchema }
  ])],
  providers: [ActivityService],
  controllers: [ActivityController]
})
export class ActivityModule {}
