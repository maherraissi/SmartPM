import { Controller, Get, Post, Body, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { CommentService } from './comment.service';

@Controller('comments')
export class CommentController {
 constructor(private readonly commentService: CommentService) {}

 @Post()
 @UseGuards(JwtAuthGuard)
 create(@Req() req: any, @Body() body: { text: string; projectId?: string }) {
  return this.commentService.create(req.user.userId, body.text, body.projectId);
 }

 @Get()
 @UseGuards(JwtAuthGuard)
 findAll(@Query('projectId') projectId?: string) {
  return this.commentService.findAll(projectId);
 }
}
