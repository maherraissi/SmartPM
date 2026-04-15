import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationService {
 constructor(
  @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
 ) {}

 async create(recipientId: string, title: string, message: string, type: string) {
  const notif = new this.notificationModel({
   recipientId: new Types.ObjectId(recipientId),
   title,
   message,
   type,
   isRead: false
  });
  return notif.save();
 }

 async getForUser(userId: string) {
  return this.notificationModel
   .find({ recipientId: new Types.ObjectId(userId) })
   .sort({ createdAt: -1 })
   .limit(20)
   .lean()
   .exec();
 }

 async markAsRead(notifId: string) {
  return this.notificationModel.findByIdAndUpdate(notifId, { isRead: true }).exec();
 }
}
