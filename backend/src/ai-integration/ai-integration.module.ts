import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AiIntegrationService } from './ai-integration.service';
import { AiIntegrationController } from './ai-integration.controller';
import { Project, ProjectSchema } from '../project/schemas/project.schema';
import { Task, TaskSchema } from '../task/schemas/task.schema';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
  ],
  providers: [AiIntegrationService, JwtStrategy],
  controllers: [AiIntegrationController],
  exports: [AiIntegrationService],
})
export class AiIntegrationModule {}
