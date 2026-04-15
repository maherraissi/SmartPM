import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { Project, ProjectSchema } from './schemas/project.schema';
import { Activity, ActivitySchema } from '../activity/schemas/activity.schema';
import { SubActivity, SubActivitySchema } from '../sub-activity/schemas/sub-activity.schema';
import { User, UserSchema } from '../user/schemas/user.schema'; // 👈 Important
import { Task, TaskSchema } from '../task/schemas/task.schema';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';

import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    PassportModule,
    NotificationModule,
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: SubActivity.name, schema: SubActivitySchema },
      { name: User.name, schema: UserSchema },
      { name: Task.name, schema: TaskSchema }
    ])
  ],
  providers: [ProjectService, JwtStrategy],
  controllers: [ProjectController]
})
export class ProjectModule {}
