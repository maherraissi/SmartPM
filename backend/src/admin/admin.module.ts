import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';

// Schemas
import { User, UserSchema }               from '../user/schemas/user.schema';
import { AuditLog, AuditLogSchema }           from './schemas/audit-log.schema';
import { PlatformSettings, PlatformSettingsSchema }   from './schemas/platform-settings.schema';
import { ComplianceAlert, ComplianceAlertSchema }    from './schemas/compliance-alert.schema';
import { AIUsageLog, AIUsageLogSchema }         from './schemas/ai-usage-log.schema';
import { TransferRequest, TransferRequestSchema }    from './schemas/transfer-request.schema';

// Controllers
import { AdminUsersController }     from './users/admin-users.controller';
import { AdminCertificationsController } from './certifications/admin-certifications.controller';
import { AdminAiMonitoringController }  from './ai-monitoring/admin-ai-monitoring.controller';
import { AdminAlertsController }     from './alerts/admin-alerts.controller';
import { AdminSettingsController }    from './settings/admin-settings.controller';
import { AdminGovernanceController }   from './governance/admin-governance.controller';

// Services
import { AdminUsersService }     from './users/admin-users.service';
import { AdminCertificationsService } from './certifications/admin-certifications.service';
import { AdminAiMonitoringService }  from './ai-monitoring/admin-ai-monitoring.service';
import { AdminAlertsService }     from './alerts/admin-alerts.service';
import { AdminSettingsService }    from './settings/admin-settings.service';
import { AdminGovernanceService }   from './governance/admin-governance.service';

// Auth
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';

@Module({
 imports: [
  PassportModule,
  MongooseModule.forFeature([
   { name: User.name,       schema: UserSchema       },
   { name: AuditLog.name,     schema: AuditLogSchema     },
   { name: PlatformSettings.name, schema: PlatformSettingsSchema },
   { name: ComplianceAlert.name, schema: ComplianceAlertSchema },
   { name: AIUsageLog.name,    schema: AIUsageLogSchema    },
   { name: TransferRequest.name, schema: TransferRequestSchema },
  ]),
 ],
 controllers: [
  AdminUsersController,
  AdminCertificationsController,
  AdminAiMonitoringController,
  AdminAlertsController,
  AdminSettingsController,
  AdminGovernanceController,
 ],
 providers: [
  AdminUsersService,
  AdminCertificationsService,
  AdminAiMonitoringService,
  AdminAlertsService,
  AdminSettingsService,
  AdminGovernanceService,
  JwtStrategy,
  RolesGuard,
 ],
 exports: [
  AdminAlertsService,
  AdminAiMonitoringService,
  AdminSettingsService,
 ],
})
export class AdminModule {}
