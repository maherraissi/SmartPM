import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { SubActivityService } from './sub-activity.service';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';

@Controller('sub-activity')
export class SubActivityController {
 constructor(private readonly subService: SubActivityService) {}

 @Post(':id/attach')
 @UseGuards(JwtAuthGuard)
 attachFile(@Param('id') id: string, @Body() body: { name: string, url: string }) {
  return this.subService.attachFile(id, body);
 }
}
