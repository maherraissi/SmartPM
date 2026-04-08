import { Controller, Get, UseGuards, Req, Post, Body } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { TaskService } from './task.service';

interface AuthRequest extends Request {
  user: { userId: string; email: string; role: string };
}

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  getDashboard(@Req() req: AuthRequest) {
    return this.taskService.getMemberDashboard(req.user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createTask(@Body() dto: any) {
    return this.taskService.createTask(dto);
  }
}
