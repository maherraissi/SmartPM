import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PlatformSettings,
  PlatformSettingsDocument,
} from '../schemas/platform-settings.schema';
import {
  AuditLog,
  AuditLogDocument,
  AuditAction,
} from '../schemas/audit-log.schema';

@Injectable()
export class AdminSettingsService {
  constructor(
    @InjectModel(PlatformSettings.name)
    private settingsModel: Model<PlatformSettingsDocument>,
    @InjectModel(AuditLog.name)
    private auditModel: Model<AuditLogDocument>,
  ) {}

  async getSettings(): Promise<PlatformSettingsDocument> {
    let settings = await this.settingsModel.findOne({ key: 'global' });
    if (!settings) {
      settings = await this.settingsModel.create({ key: 'global' });
    }
    return settings;
  }

  async updateSettings(
    patch: Partial<PlatformSettings>,
    adminId: string,
    adminEmail: string,
    ip: string,
  ): Promise<PlatformSettingsDocument | null> {
    const before = await this.getSettings();
    const beforePlain = before ? JSON.parse(JSON.stringify(before)) : {};

    const updated = await this.settingsModel.findOneAndUpdate(
      { key: 'global' },
      { $set: patch },
      { new: true, upsert: true },
    );

    await this.auditModel.create({
      adminId: new Types.ObjectId(adminId),
      adminEmail,
      action: AuditAction.UPDATE_SETTINGS,
      targetEntity: 'PlatformSettings',
      before: beforePlain,
      after: patch,
      ipAddress: ip,
    });

    return updated;
  }

  async addHoliday(
    date: string,
    adminId: string,
    adminEmail: string,
    ip: string,
  ): Promise<PlatformSettingsDocument> {
    const settings = await this.getSettings();
    if (!settings.holidays.includes(date)) {
      settings.holidays.push(date);
      await settings.save();
    }
    await this.auditModel.create({
      adminId: new Types.ObjectId(adminId),
      adminEmail,
      action: AuditAction.UPDATE_SETTINGS,
      targetEntity: 'PlatformSettings',
      after: { addedHoliday: date },
      ipAddress: ip,
    });
    return settings;
  }

  async removeHoliday(
    date: string,
    adminId: string,
    adminEmail: string,
    ip: string,
  ): Promise<PlatformSettingsDocument | null> {
    const settings = await this.settingsModel.findOneAndUpdate(
      { key: 'global' },
      { $pull: { holidays: date } },
      { new: true },
    );
    await this.auditModel.create({
      adminId: new Types.ObjectId(adminId),
      adminEmail,
      action: AuditAction.UPDATE_SETTINGS,
      targetEntity: 'PlatformSettings',
      after: { removedHoliday: date },
      ipAddress: ip,
    });
    return settings;
  }
}
