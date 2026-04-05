import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';
import { ActivityModule } from './activity/activity.module';
import { SubActivityModule } from './sub-activity/sub-activity.module';
import { FunctionTemplateModule } from './function-template/function-template.module';
import { TaskModule } from './task/task.module';
import { ReviewModule } from './review/review.module';
import { TrainingModule } from './training/training.module';
import { CertificationModule } from './certification/certification.module';
import { AiIntegrationModule } from './ai-integration/ai-integration.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // ENTERPRISE SECURITY: Network Rate Limiting against DDoS & Brute-Force
    ThrottlerModule.forRoot([{
      ttl: 60000, // Time to live (1 minute)
      limit: 100, // Max 100 hits per minute per IP
    }]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const env = configService.get<string>('DB_ENV') || 'local';
        const uri = env === 'cloud' 
          ? configService.get<string>('MONGODB_CLOUD_URI') 
          : configService.get<string>('MONGODB_LOCAL_URI');
        console.log(`🔌 Connecting to MongoDB in [${env.toUpperCase()}] mode.`);
        return { uri };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    ProjectModule,
    ActivityModule,
    SubActivityModule,
    FunctionTemplateModule,
    TaskModule,
    ReviewModule,
    TrainingModule,
    CertificationModule,
    AiIntegrationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      // Globally binding the Throttler to protect ALL routes simultaneously
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }
  ],
})
export class AppModule {}
