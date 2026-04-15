import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard }  from '../guards/roles.guard';
import { Roles }    from '../decorators/roles.decorator';
import { AdminAlertsService } from './admin-alerts.service';

@Controller('admin/alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminAlertsController {
 constructor(private readonly svc: AdminAlertsService) {}

 @Get()
 getAll(@Query() query: any) { return this.svc.getAll(query); }

 @Get('stats')
 getStats() { return this.svc.getStats(); }

 @Post()
 create(@Body() dto: any) { return this.svc.create(dto); }

 @Patch(':id/resolve')
 resolve(@Param('id') id: string, @Body('notes') notes: string, @Req() req: any) {
  return this.svc.resolve(id, req.user.userId, notes);
 }

 @Patch(':id/ignore')
 ignore(@Param('id') id: string) { return this.svc.ignore(id); }

 @Post('auto-detect')
 autoDetect() { return this.svc.autoDetectAlerts(); }
}
