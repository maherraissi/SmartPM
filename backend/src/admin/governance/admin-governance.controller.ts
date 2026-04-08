import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard }   from '../guards/roles.guard';
import { Roles }        from '../decorators/roles.decorator';
import { AdminGovernanceService } from './admin-governance.service';

@Controller('admin/governance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminGovernanceController {
  constructor(private readonly svc: AdminGovernanceService) {}

  @Get('kpis')
  getKPIs() { return this.svc.getDashboardKPIs(); }

  @Get('snapshot')
  getSnapshot() { return this.svc.getGovernanceSnapshot(); }
}
