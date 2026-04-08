import { Controller, Get, Patch, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard }   from '../guards/roles.guard';
import { Roles }        from '../decorators/roles.decorator';
import { AdminSettingsService } from './admin-settings.service';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSettingsController {
  constructor(private readonly svc: AdminSettingsService) {}

  @Get()
  get() { return this.svc.getSettings(); }

  @Patch()
  update(@Body() dto: any, @Req() req: any) {
    return this.svc.updateSettings(dto, req.user.userId, req.user.email, req.ip);
  }

  @Post('holidays')
  addHoliday(@Body('date') date: string, @Req() req: any) {
    return this.svc.addHoliday(date, req.user.userId, req.user.email, req.ip);
  }

  @Delete('holidays/:date')
  removeHoliday(@Param('date') date: string, @Req() req: any) {
    return this.svc.removeHoliday(date, req.user.userId, req.user.email, req.ip);
  }
}
