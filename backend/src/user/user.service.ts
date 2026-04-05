import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async onModuleInit() {
    await this.seedAdmin();
  }

  private async seedAdmin() {
    const adminEmail = 'admin@smartpm.com';
    const adminUser = await this.userModel.findOne({ email: adminEmail });

    if (!adminUser) {
      this.logger.log('Creating default admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const newAdmin = new this.userModel({
        firstName: 'System',
        lastName: 'Admin',
        email: adminEmail,
        passwordHash: hashedPassword,
        role: UserRole.ADMIN,
        provider: 'local',
        isActive: true
      });

      await newAdmin.save();
      this.logger.log('Admin user created: admin@smartpm.com / admin123');
    }

    // Optional: Delete maher raissi if specified precisely, 
    // but better to just ensure admin exists for now to avoid accidental data loss.
    // await this.userModel.deleteOne({ email: 'maherraissi@gmail.com' }); 
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async create(userDto: any): Promise<UserDocument> {
    const newUser = new this.userModel(userDto);
    return newUser.save();
  }
}
