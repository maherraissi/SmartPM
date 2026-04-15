import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { Request } from 'express';

interface AuthRequest extends Request {
  user: { userId: string; email: string; role: string };
}

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getNotifications(@Req() req: AuthRequest) {
    return this.notificationService.getForUser(req.user.userId);
  }

  @Post(':id/read')
  @UseGuards(JwtAuthGuard)
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }
}
