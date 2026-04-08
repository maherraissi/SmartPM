import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard }   from '../guards/roles.guard';
import { Roles }        from '../decorators/roles.decorator';
import { AdminCertificationsService } from './admin-certifications.service';

@Controller('admin/certifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCertificationsController {
  constructor(private readonly svc: AdminCertificationsService) {}

  @Get('stats')
  getStats() { return this.svc.getCertificationStats(); }

  @Get('matrix')
  getMatrix() { return this.svc.getCompetencyMatrix(); }

  @Get('transfers')
  getTransfers(@Query('status') status: any) {
    return this.svc.getTransferRequests(status);
  }

  @Post('transfers')
  createTransfer(@Body() dto: any) {
    return this.svc.createTransferRequest(dto);
  }

  @Post(':userId/approve')
  approve(@Param('userId') id: string, @Body('phase') phase: string, @Req() req: any) {
    return this.svc.approveCertification(id, phase, req.user.userId, req.user.email, req.ip);
  }

  @Post(':userId/revoke')
  revoke(@Param('userId') id: string, @Body('phase') phase: string, @Req() req: any) {
    return this.svc.revokeCertification(id, phase, req.user.userId, req.user.email, req.ip);
  }

  @Patch('transfers/:id/approve')
  approveTransfer(@Param('id') id: string, @Req() req: any) {
    return this.svc.approveTransfer(id, req.user.userId, req.user.email, req.ip);
  }

  @Patch('transfers/:id/reject')
  rejectTransfer(@Param('id') id: string, @Body('adminNotes') notes: string, @Req() req: any) {
    return this.svc.rejectTransfer(id, notes, req.user.userId, req.user.email, req.ip);
  }
}
