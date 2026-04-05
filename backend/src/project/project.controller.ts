import { Controller, Post, Body } from '@nestjs/common';
import { ProjectService } from './project.service';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('deploy')
  async deployMission(@Body() payload: any) {
    return this.projectService.deployMission(payload);
  }
}
