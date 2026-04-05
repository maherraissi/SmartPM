import { Module } from '@nestjs/common';
import { SubActivityService } from './sub-activity.service';
import { SubActivityController } from './sub-activity.controller';

@Module({
  providers: [SubActivityService],
  controllers: [SubActivityController]
})
export class SubActivityModule {}
