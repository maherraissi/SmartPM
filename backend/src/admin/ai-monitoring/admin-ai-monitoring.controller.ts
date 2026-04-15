import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard }  from '../guards/roles.guard';
import { Roles }     from '../decorators/roles.decorator';
import { AdminAiMonitoringService } from './admin-ai-monitoring.service';

@Controller('admin/ai-monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminAiMonitoringController {
 constructor(private readonly svc: AdminAiMonitoringService) {}

 @Get('status')
 getStatus() { return this.svc.getFullStatus(); }

 @Get('stats')
 getStats() { return this.svc.getUsageStats(); }

 @Post('log')
 logRequest(@Body() dto: any) { return this.svc.logRequest(dto); }
}
