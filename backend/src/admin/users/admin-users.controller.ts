import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard }  from '../guards/jwt-auth.guard';
import { RolesGuard }    from '../guards/roles.guard';
import { Roles }         from '../decorators/roles.decorator';
import { AdminUsersService } from './admin-users.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly svc: AdminUsersService) {}

  @Get('stats')
  getStats() {
    return this.svc.getDashboardStats();
  }

  @Get()
  findAll(@Query() query: any) {
    console.log('GET /admin/users triggered with query:', query);
    return this.svc.findAll(query);
  }

  @Get('debug-db')
  async debugDb() {
    const mongoose = require('mongoose');
    return {
      dbName: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      readyState: mongoose.connection.readyState,
      collections: Object.keys(mongoose.connection.collections)
    };
  }

  @Get('audit-logs')
  getAuditLogs(@Query('page') page: number, @Query('limit') limit: number) {
    return this.svc.getAuditLogs(page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: any, @Req() req: any) {
    const ip = req.ip;
    return this.svc.createUser(dto, req.user.userId, req.user.email, ip);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.svc.updateUser(id, dto, req.user.userId, req.user.email, req.ip);
  }

  @Patch(':id/role')
  assignRole(@Param('id') id: string, @Body('role') role: any, @Req() req: any) {
    return this.svc.assignRole(id, role, req.user.userId, req.user.email, req.ip);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string, @Req() req: any) {
    return this.svc.setActive(id, true, req.user.userId, req.user.email, req.ip);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @Req() req: any) {
    return this.svc.setActive(id, false, req.user.userId, req.user.email, req.ip);
  }

  @Patch(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body('newPassword') pass: string, @Req() req: any) {
    return this.svc.resetPassword(id, pass, req.user.userId, req.user.email, req.ip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string, @Req() req: any) {
    return this.svc.deleteUser(id, req.user.userId, req.user.email, req.ip);
  }
}
