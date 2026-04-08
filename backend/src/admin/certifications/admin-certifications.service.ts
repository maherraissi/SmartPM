import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TransferRequest, TransferRequestDocument, TransferStatus } from '../schemas/transfer-request.schema';
import { ComplianceAlert, ComplianceAlertDocument, AlertType, AlertSeverity } from '../schemas/compliance-alert.schema';
import { AuditLog, AuditLogDocument, AuditAction } from '../schemas/audit-log.schema';
import { User, UserDocument } from '../../user/schemas/user.schema';

@Injectable()
export class AdminCertificationsService {
  constructor(
    @InjectModel(TransferRequest.name) private transferModel: Model<TransferRequestDocument>,
    @InjectModel(ComplianceAlert.name) private alertModel: Model<ComplianceAlertDocument>,
    @InjectModel(AuditLog.name)        private auditModel: Model<AuditLogDocument>,
    @InjectModel(User.name)            private userModel: Model<UserDocument>,
  ) {}

  // ─── Certifications Overview ─────────────────────────────────────────────
  async getCertificationStats() {
    const [byPhase, expiringSoon] = await Promise.all([
      this.userModel.aggregate([
        { $unwind: '$certifications' },
        { $group: { _id: '$certifications', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      this.alertModel.countDocuments({ type: AlertType.EXPIRED_CERTIFICATION, status: 'OPEN' }),
    ]);
    return { byPhase, expiringSoon };
  }

  // ─── Approve Certification for a phase ──────────────────────────────────
  async approveCertification(
    userId: string, phase: string,
    adminId: string, adminEmail: string, ip: string,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!user.certifications.includes(phase as any)) {
      user.certifications.push(phase as any);
      await user.save();
    }

    await this.auditModel.create({
      adminId: new Types.ObjectId(adminId), adminEmail,
      action: AuditAction.APPROVE_CERT,
      targetEntity: 'User', targetId: new Types.ObjectId(userId),
      after: { phase }, ipAddress: ip,
    });

    // Auto-dismiss related compliance alerts
    await this.alertModel.updateMany(
      { type: AlertType.UNCERTIFIED_MEMBER_ASSIGNED, affectedUserId: new Types.ObjectId(userId) },
      { status: 'RESOLVED', resolvedAt: new Date() },
    );

    return { success: true, certifications: user.certifications };
  }

  // ─── Revoke Certification ────────────────────────────────────────────────
  async revokeCertification(
    userId: string, phase: string,
    adminId: string, adminEmail: string, ip: string,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    user.certifications = user.certifications.filter(c => c !== phase as any);
    await user.save();

    await this.auditModel.create({
      adminId: new Types.ObjectId(adminId), adminEmail,
      action: AuditAction.REVOKE_CERT,
      targetEntity: 'User', targetId: new Types.ObjectId(userId),
      after: { phase }, ipAddress: ip,
    });

    // Raise new compliance alert
    await this.alertModel.create({
      type: AlertType.EXPIRED_CERTIFICATION,
      severity: AlertSeverity.HIGH,
      message: `Certification ${phase} revoked for user ${userId}. Re-training required.`,
      entityRef: 'User', entityId: new Types.ObjectId(userId),
      affectedUserId: new Types.ObjectId(userId),
    });

    return { success: true, certifications: user.certifications };
  }

  // ─── Competency Matrix ────────────────────────────────────────────────────
  async getCompetencyMatrix() {
    const members = await this.userModel
      .find({ role: { $in: ['MEMBER', 'MANAGER'] } }, '-passwordHash')
      .lean();

    return members.map(m => ({
      id: m._id,
      name: `${m.firstName} ${m.lastName}`,
      email: m.email,
      role: m.role,
      HLR:  m.certifications.includes('HLR' as any),
      LLR:  m.certifications.includes('LLR' as any),
      CODE: m.certifications.includes('CODE' as any),
      LLT:  m.certifications.includes('LLT' as any),
      HLT:  m.certifications.includes('HLT' as any),
      score: m.certifications.length,
      eligibleTeam: m.certifications.length > 0 ? m.certifications.join(', ') : 'None',
      isActive: m.isActive,
    }));
  }

  // ─── Transfer Requests ────────────────────────────────────────────────────
  async getTransferRequests(status?: TransferStatus) {
    const filter = status ? { status } : {};
    return this.transferModel.find(filter)
      .populate('memberId', 'firstName lastName email certifications')
      .populate('requestedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();
  }

  async createTransferRequest(dto: {
    memberId: string; fromTeam: string; toTeam: string;
    reason: string; certificationEvidence?: string[];
  }) {
    return this.transferModel.create({
      ...dto,
      memberId: new Types.ObjectId(dto.memberId),
    });
  }

  async approveTransfer(
    id: string, adminId: string, adminEmail: string, ip: string,
  ) {
    const req = await this.transferModel.findById(id)
      .populate<{ memberId: UserDocument }>('memberId');
    if (!req) throw new NotFoundException('Transfer request not found');

    req.status     = TransferStatus.APPROVED;
    req.reviewedBy = new Types.ObjectId(adminId);
    req.reviewedAt = new Date();
    await req.save();

    await this.auditModel.create({
      adminId: new Types.ObjectId(adminId), adminEmail,
      action: AuditAction.APPROVE_TRANSFER,
      targetEntity: 'TransferRequest', targetId: req._id,
      after: { toTeam: req.toTeam },
      ipAddress: ip,
    });

    return { success: true };
  }

  async rejectTransfer(
    id: string, adminNotes: string,
    adminId: string, adminEmail: string, ip: string,
  ) {
    const req = await this.transferModel.findById(id);
    if (!req) throw new NotFoundException('Transfer request not found');

    req.status       = TransferStatus.REJECTED;
    req.reviewedBy   = new Types.ObjectId(adminId);
    req.reviewedAt   = new Date();
    req.adminNotes   = adminNotes;
    await req.save();

    await this.auditModel.create({
      adminId: new Types.ObjectId(adminId), adminEmail,
      action: AuditAction.REJECT_TRANSFER,
      targetEntity: 'TransferRequest', targetId: req._id,
      ipAddress: ip,
    });

    return { success: true };
  }
}
