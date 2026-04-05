import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubActivityService } from './sub-activity.service';
import { SubActivityController } from './sub-activity.controller';
import { SubActivity, SubActivitySchema } from './schemas/sub-activity.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: SubActivity.name, schema: SubActivitySchema }])],
  providers: [SubActivityService],
  controllers: [SubActivityController]
})
export class SubActivityModule {}
