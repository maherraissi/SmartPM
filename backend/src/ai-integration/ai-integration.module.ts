import { Module } from '@nestjs/common';
import { AiIntegrationService } from './ai-integration.service';
import { AiIntegrationController } from './ai-integration.controller';

@Module({
  providers: [AiIntegrationService],
  controllers: [AiIntegrationController]
})
export class AiIntegrationModule {}
