import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import * as mongoose from 'mongoose';

@Injectable()
export class UserService implements OnModuleInit {
 private readonly logger = new Logger(UserService.name);

 constructor(
  @InjectModel(User.name) private userModel: Model<UserDocument>,
  private configService: ConfigService,
 ) {}

 async onModuleInit() {
  await this.seedAdmin();
 }

 private async seedAdmin() {
  const adminEmail = 'admin@smartpm.com';
  const exists = await this.userModel.findOne({ email: adminEmail });
  if (!exists) {
   const hash = await bcrypt.hash('admin123', 10);
   await this.userModel.create({
    firstName: 'System', lastName: 'Admin',
    email: adminEmail, passwordHash: hash,
    role: UserRole.ADMIN, provider: 'local', isActive: true
   });
   this.logger.log('✅ Admin account created: admin@smartpm.com / admin123');
  }
 }

 async findAll() {
  return this.userModel.find({}, '-passwordHash -providerId -__v').exec();
 }

 async updateRole(id: string, role: UserRole) {
  return this.userModel.findByIdAndUpdate(
   id, { role }, { new: true, projection: '-passwordHash -providerId -__v' }
  ).exec();
 }

 async deleteUser(id: string) {
  return this.userModel.findByIdAndDelete(id).exec();
 }

 async findByEmail(email: string): Promise<UserDocument | null> {
  return this.userModel.findOne({ email }).exec();
 }


}
