import {
  Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole } from '../../user/schemas/user.schema';
import { AuditLog, AuditLogDocument, AuditAction } from '../schemas/audit-log.schema';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectModel(User.name)  private userModel: Model<UserDocument>,
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLogDocument>,
  ) {}

  // ─── Dashboard KPI ─────────────────────────────────────────────────────────
  async getDashboardStats() {
    const [total, byRole] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
    ]);
    const roleMap: Record<string, number> = {};
    byRole.forEach(r => { roleMap[r._id] = r.count; });
    return {
      totalUsers:   total,
      admins:       roleMap['ADMIN']   || 0,
      managers:     roleMap['MANAGER'] || 0,
      members:      roleMap['MEMBER']  || 0,
    };
  }

  // ─── List Users (with search + filter) ─────────────────────────────────────
  async findAll(query: {
    search?: string;
    role?: string;
    isActive?: string;
    page?: number;
    limit?: number;
  }) {
    const filter: any = {};
    if (query.search) {
      const rx = new RegExp(query.search, 'i');
      filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }];
    }
    if (query.role) filter.role = query.role;
    if (query.isActive !== undefined && query.isActive !== '') {
      filter.isActive = query.isActive === 'true';
    }

    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const skip  = (page - 1) * limit;

    try {
      const [users, total] = await Promise.all([
        this.userModel.find(filter, '-passwordHash -providerId -__v')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.userModel.countDocuments(filter).exec(),
      ]);

      return { 
        users, 
        total, 
        page, 
        pages: Math.ceil(total / limit) || 1 
      };
    } catch (e: any) {
      console.error("Error in findAll:", e);
      throw e;
    }
  }

  // ─── Get Single User ────────────────────────────────────────────────────────
  async findOne(id: string) {
    const user = await this.userModel.findById(id, '-passwordHash -providerId').lean();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ─── Create User ────────────────────────────────────────────────────────────
  async createUser(
    dto: { firstName: string; lastName: string; email: string; password: string; role: UserRole },
    adminId: string, adminEmail: string, ip: string,
  ) {
    const exists = await this.userModel.findOne({ email: dto.email });
    if (exists) throw new ConflictException('Email already registered');

    if (dto.password && dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({ ...dto, passwordHash, provider: 'local' });

    await this.auditModel.create({
      adminId: new Types.ObjectId(adminId), adminEmail,
      action: AuditAction.CREATE_USER,
      targetEntity: 'User', targetId: user._id,
      after: { email: dto.email, role: dto.role },
      ipAddress: ip,
    });
    return user;
  }

  // ─── Update User ────────────────────────────────────────────────────────────
  async updateUser(
    id: string, dto: Partial<{ firstName: string; lastName: string; team: string }>,
    adminId: string, adminEmail: string, ip: string,
  ) {
    const before = await this.userModel.findById(id, '-passwordHash').lean();
    if (!before) throw new NotFoundException('User not found');

    const updated = await this.userModel.findByIdAndUpdate(id, dto, {
      new: true, projection: '-passwordHash -providerId',
    });

    await this.auditModel.create({
      adminId: new Types.ObjectId(adminId), adminEmail,
      action: AuditAction.UPDATE_USER,
      targetEntity: 'User', targetId: new Types.ObjectId(id),
      before, after: dto, ipAddress: ip,
    });
    return updated;
  }

  // ─── Assign Role ────────────────────────────────────────────────────────────
  async assignRole(
    id: string, role: UserRole,
    adminId: string, adminEmail: string, ip: string,
  ) {
    const beforeUser = await this.userModel.findById(id).lean().exec();
    if (!beforeUser) throw new NotFoundException('User not found');
    const before = { role: beforeUser.role };
    
    // Instead of find + save, use findByIdAndUpdate to atomic write and prevent schema save hooks locks
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).exec();
    
    try {
      await this.auditModel.create({
        adminId: new Types.ObjectId(adminId), adminEmail,
        action: AuditAction.ASSIGN_ROLE,
        targetEntity: 'User', targetId: new Types.ObjectId(id),
        before, after: { role }, ipAddress: ip,
      });
    } catch (e) {
      console.warn("Audit log creation failed, continuing", e);
    }
    return user;
  }

  // ─── Activate / Deactivate ─────────────────────────────────────────────────
  async setActive(
    id: string, isActive: boolean,
    adminId: string, adminEmail: string, ip: string,
  ) {
    // Prevent self-deactivation
    if (id === adminId && !isActive)
      throw new ForbiddenException('Cannot deactivate your own admin account');

    const user = await this.userModel.findByIdAndUpdate(
      id, { isActive }, { new: true, projection: '-passwordHash' }
    ).exec();
    if (!user) throw new NotFoundException('User not found');

    await this.auditModel.create({
      adminId: new Types.ObjectId(adminId), adminEmail,
      action: isActive ? AuditAction.ACTIVATE_USER : AuditAction.DEACTIVATE_USER,
      targetEntity: 'User', targetId: new Types.ObjectId(id),
      after: { isActive }, ipAddress: ip,
    });
    return user;
  }

  // ─── Reset Password ─────────────────────────────────────────────────────────
  async resetPassword(
    id: string, newPassword: string,
    adminId: string, adminEmail: string, ip: string,
  ) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long');
    }
    const hash = await bcrypt.hash(newPassword, 10);
    const user = await this.userModel.findByIdAndUpdate(
      id, { passwordHash: hash }, { new: true, projection: '-passwordHash' },
    );
    if (!user) throw new NotFoundException('User not found');

    await this.auditModel.create({
      adminId: new Types.ObjectId(adminId), adminEmail,
      action: AuditAction.RESET_PASSWORD,
      targetEntity: 'User', targetId: new Types.ObjectId(id),
      ipAddress: ip,
    });
    return { success: true, message: 'Password reset successfully' };
  }

  // ─── Delete User (safe) ─────────────────────────────────────────────────────
  async deleteUser(id: string, adminId: string, adminEmail: string, ip: string) {
    if (id === adminId)
      throw new ForbiddenException('Cannot delete your own admin account');

    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) throw new NotFoundException('User not found');

    await this.auditModel.create({
      adminId: new Types.ObjectId(adminId), adminEmail,
      action: AuditAction.DELETE_USER,
      targetEntity: 'User', targetId: new Types.ObjectId(id),
      before: { email: user.email, role: user.role },
      ipAddress: ip,
    });
    return { success: true };
  }

  // ─── Get Audit Logs ─────────────────────────────────────────────────────────
  async getAuditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.auditModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.auditModel.countDocuments(),
    ]);
    return { logs, total, page };
  }
}
