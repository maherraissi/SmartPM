import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../user/schemas/user.schema';
import { ComplianceAlert, ComplianceAlertDocument, AlertStatus } from '../schemas/compliance-alert.schema';

@Injectable()
export class AdminGovernanceService {
 constructor(
  @InjectModel(User.name)      private userModel: Model<UserDocument>,
  @InjectModel(ComplianceAlert.name) private alertModel: Model<ComplianceAlertDocument>,
 ) {}

 // ─── Dashboard KPIs ───────────────────────────────────────────────────────
 async getDashboardKPIs() {
  const [userStats, openAlerts, criticalAlerts] = await Promise.all([
   this.userModel.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
   ]),
   this.alertModel.countDocuments({ status: AlertStatus.OPEN }),
   this.alertModel.countDocuments({ status: AlertStatus.OPEN, severity: 'CRITICAL' }),
  ]);

  const roleMap: Record<string, number> = {};
  userStats.forEach(r => { roleMap[r._id] = r.count; });

  return {
   totalUsers:     (roleMap['ADMIN'] || 0) + (roleMap['MANAGER'] || 0) + (roleMap['MEMBER'] || 0),
   admins:       roleMap['ADMIN']  || 0,
   managers:      roleMap['MANAGER'] || 0,
   members:       roleMap['MEMBER'] || 0,
   openAlerts,
   criticalAlerts,
  };
 }

 // ─── Governance Overview (projects come from project service) ────────────
 // This service provides the admin-level aggregated view
 async getGovernanceSnapshot() {
  const [roleDistribution, certDistribution, recentAlerts] = await Promise.all([
   this.userModel.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
   ]),
   this.userModel.aggregate([
    { $unwind: { path: '$certifications', preserveNullAndEmptyArrays: true } },
    { $group: { _id: '$certifications', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
   ]),
   this.alertModel.find({ status: AlertStatus.OPEN })
    .sort({ severity: -1, createdAt: -1 })
    .limit(10)
    .populate('affectedUserId', 'firstName lastName email')
    .lean(),
  ]);

  return {
   roleDistribution,
   certDistribution,
   recentAlerts,
   snapshotAt: new Date(),
  };
 }
}
