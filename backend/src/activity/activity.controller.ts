import { Controller, Get } from '@nestjs/common';
import { ActivityService } from './activity.service';

@Controller('activities')
export class ActivityController {
 constructor(private readonly activityService: ActivityService) {}

 @Get('templates')
 async getTemplates() {
  return this.activityService.getActivityTemplates();
 }
}
