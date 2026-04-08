import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { ProjectService } from './project.service';

interface AuthRequest extends Request {
  user: { userId: string; email: string; role: string };
}

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('deploy')
  @UseGuards(JwtAuthGuard)
  deployMission(@Body() payload: any, @Req() req: AuthRequest) {
    return this.projectService.deployMission(payload, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getMyProjects(@Req() req: AuthRequest) {
    return this.projectService.getProjectsForUser(req.user.userId, req.user.role);
  }

  @Get('cockpit')
  @UseGuards(JwtAuthGuard)
  getCockpit(@Req() req: AuthRequest) {
    return this.projectService.getManagerCockpit(req.user.userId);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  archiveProject(@Param('id') id: string) {
    return this.projectService.updateProjectStatus(id, 'ARCHIVED');
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard)
  restoreProject(@Param('id') id: string) {
    return this.projectService.updateProjectStatus(id, 'PLANNING');
  }

  @Get(':id/structure')
  @UseGuards(JwtAuthGuard)
  getProjectStructure(@Param('id') id: string) {
    return this.projectService.getProjectStructure(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getProject(@Param('id') id: string) {
    return this.projectService.getProjectById(id);
  }
}
