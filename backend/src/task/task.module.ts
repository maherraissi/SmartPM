import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { Task, TaskSchema } from './schemas/task.schema';
import { SubActivity, SubActivitySchema } from '../sub-activity/schemas/sub-activity.schema';
import { Project, ProjectSchema } from '../project/schemas/project.schema';
import { NotificationModule } from '../notification/notification.module';

@Module({
 imports: [
  MongooseModule.forFeature([
   { name: Task.name, schema: TaskSchema },
   { name: SubActivity.name, schema: SubActivitySchema },
   { name: Project.name, schema: ProjectSchema }
  ]),
  NotificationModule
 ],
 providers: [TaskService],
 controllers: [TaskController]
})
export class TaskModule {}
