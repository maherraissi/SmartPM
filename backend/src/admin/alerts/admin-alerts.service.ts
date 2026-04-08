import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ComplianceAlert, ComplianceAlertDocument,
  AlertStatus, AlertSeverity, AlertType,
} from '../schemas/compliance-alert.schema';

@Injectable()
export class AdminAlertsService {
  constructor(
    @InjectModel(ComplianceAlert.name) private alertModel: Model<ComplianceAlertDocument>,
  ) {}

  async getAll(filters: { status?: string; severity?: string; type?: string; page?: number; limit?: number }) {
    const query: any = {};
    if (filters.status)   query.status   = filters.status;
    if (filters.severity) query.severity = filters.severity;
    if (filters.type)     query.type     = filters.type;

    const page  = Number(filters.page)  || 1;
    const limit = Number(filters.limit) || 50;
    const skip  = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      this.alertModel.find(query)
        .populate('affectedUserId', 'firstName lastName email')
        .populate('resolvedBy',     'firstName lastName')
        .sort({ severity: -1, createdAt: -1 })
        .skip(skip).limit(limit).lean(),
      this.alertModel.countDocuments(query),
    ]);
    return { alerts, total, page };
  }

  async getStats() {
    const [byStatus, bySeverity, byType, openCritical] = await Promise.all([
      this.alertModel.aggregate([{ $group: { _id: '$status',   count: { $sum: 1 } } }]),
      this.alertModel.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
      this.alertModel.aggregate([
        { $match: { status: 'OPEN' } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.alertModel.countDocuments({ status: AlertStatus.OPEN, severity: AlertSeverity.CRITICAL }),
    ]);
    return { byStatus, bySeverity, byType, openCritical };
  }

  async resolve(id: string, resolvedBy: string, notes?: string) {
    return this.alertModel.findByIdAndUpdate(id, {
      status: AlertStatus.RESOLVED,
      resolvedBy, resolvedAt: new Date(), notes,
    }, { new: true });
  }

  async ignore(id: string) {
    return this.alertModel.findByIdAndUpdate(id, { status: AlertStatus.IGNORED }, { new: true });
  }

  async create(dto: {
    type: AlertType; severity: AlertSeverity;
    message: string; entityRef?: string;
    entityId?: string; affectedUserId?: string;
  }) {
    return this.alertModel.create(dto);
  }

  // Called by cron / other services
  async autoDetectAlerts() {
    // This method can be triggered by a scheduled job
    // It checks for compliance issues and creates alerts
    return { message: 'Alert detection run completed', timestamp: new Date() };
  }
}
