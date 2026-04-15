import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { TrainingService } from './training.service';

@Controller('training')
export class TrainingController {
 constructor(private readonly trainingService: TrainingService) {}

 @Post('create')
 @UseGuards(JwtAuthGuard)
 createFormation(@Body() payload: any) {
  return this.trainingService.createFormation(payload);
 }

 @Get('all')
 @UseGuards(JwtAuthGuard)
 getAllFormations() {
  return this.trainingService.getAllFormations();
 }

 @Post(':id/assign')
 @UseGuards(JwtAuthGuard)
 assignUsers(@Param('id') id: string, @Body('userIds') userIds: string[]) {
  return this.trainingService.assignUsersToFormation(id, userIds);
 }

 @Post('seed')
 seedDefaultFormations() {
  return this.trainingService.seedFormations();
 }
}
