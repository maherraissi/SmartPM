/**
 * SmartPM Admin Module — Seed Script
 * Run: npx ts-node src/admin/seeds/admin.seed.ts
 * Or call via: SEED=true npm run start:dev
 */

import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_CLOUD_URI || process.env.MONGODB_LOCAL_URI || 'mongodb://localhost:27017/smartpm';

// ─── Schemas (inline for seed independence) ───────────────────────
const UserSchema = new mongoose.Schema({
 firstName: String, lastName: String, email: { type: String, unique: true },
 passwordHash: String, provider: { type: String, default: 'local' },
 role: { type: String, enum: ['ADMIN','MANAGER','MEMBER'], default: 'MEMBER' },
 certifications: [{ type: String, enum: ['HLR','LLR','CODE','LLT','HLT','CUSTOM'] }],
 isActive: { type: Boolean, default: true },
}, { timestamps: true });

const PlatformSettingsSchema = new mongoose.Schema({
 key: { type: String, unique: true, default: 'global' },
 workDayStart: { type: String, default: '08:00' },
 morningEnd: { type: String, default: '12:00' },
 afternoonStart: { type: String, default: '14:00' },
 workDayEnd: { type: String, default: '17:00' },
 defaultTaskDurationHours: { type: Number, default: 2 },
 weekendDays: { type: [Number], default: [0, 6] },
 holidays: { type: [String], default: ['2026-01-01','2026-05-01','2026-12-25'] },
 notifyOnOverdueTask: { type: Boolean, default: true },
 notifyOnCertExpiry: { type: Boolean, default: true },
 certExpiryWarningDays: { type: Number, default: 7 },
 notifyOnTransferRequest: { type: Boolean, default: true },
 notifyOnFailedQuiz: { type: Boolean, default: true },
 aiDelayPredictionEnabled: { type: Boolean, default: true },
 aiReviewerSuggestionEnabled: { type: Boolean, default: true },
 aiRiskDetectionEnabled: { type: Boolean, default: true },
 aiProvider: { type: String, default: 'ollama' },
 aiMonthlyTokenBudget: { type: Number, default: 100 },
 githubIntegrationEnabled: { type: Boolean, default: false },
 autoBackupEnabled: { type: Boolean, default: false },
 backupFrequency: { type: String, default: 'daily' },
}, { timestamps: true });

const ComplianceAlertSchema = new mongoose.Schema({
 type: String, severity: String, status: { type: String, default: 'OPEN' },
 message: String, entityRef: String, entityId: mongoose.Types.ObjectId,
 affectedUserId: mongoose.Types.ObjectId,
}, { timestamps: true });

const AIUsageLogSchema = new mongoose.Schema({
 provider: String, requestType: String, requestedBy: mongoose.Types.ObjectId,
 success: Boolean, tokensUsed: Number, latencyMs: Number, feedbackScore: Number,
}, { timestamps: true });

async function seed() {
 console.log('🌱 Connecting to MongoDB…');
 await mongoose.connect(MONGODB_URI);
 console.log('✅ Connected.\n');

 const User       = mongoose.model('User',       UserSchema);
 const PlatformSettings = mongoose.model('PlatformSettings', PlatformSettingsSchema);
 const ComplianceAlert = mongoose.model('ComplianceAlert', ComplianceAlertSchema);
 const AIUsageLog    = mongoose.model('AIUsageLog',    AIUsageLogSchema);

 // ── 1. Platform Settings ────────────────────────────────────────
 console.log('📋 Seeding platform settings…');
 await PlatformSettings.findOneAndUpdate({ key: 'global' }, { key: 'global' }, { upsert: true });
 console.log('  ✅ Platform settings seeded (defaults applied)');

 // ── 2. Users ────────────────────────────────────────────────────
 console.log('\n👥 Seeding users…');
 const seedUsers = [
  { firstName: 'System', lastName: 'Admin',  email: 'admin@smartpm.com',  password: 'admin123',  role: 'ADMIN',  certifications: ['HLR','LLR','CODE','LLT','HLT'] },
  { firstName: 'Ahmed', lastName: 'Bensalem', email: 'ahmed@smartpm.com',  password: 'manager123', role: 'MANAGER', certifications: ['HLR','LLR','CODE'] },
  { firstName: 'Sonia', lastName: 'Karim',  email: 'sonia@smartpm.com',  password: 'manager123', role: 'MANAGER', certifications: ['LLT','HLT','CODE'] },
  { firstName: 'Omar',  lastName: 'Trabelsi', email: 'omar@smartpm.com',  password: 'member123', role: 'MEMBER', certifications: ['LLR','CODE'] },
  { firstName: 'Leila', lastName: 'Mansouri', email: 'leila@smartpm.com',  password: 'member123', role: 'MEMBER', certifications: ['LLT'] },
  { firstName: 'Youssef',lastName: 'Dridi',  email: 'youssef@smartpm.com', password: 'member123', role: 'MEMBER', certifications: [] },
  { firstName: 'Amira', lastName: 'Jebali',  email: 'amira@smartpm.com',  password: 'member123', role: 'MEMBER', certifications: ['HLR','LLR'] },
  { firstName: 'Bilel', lastName: 'Chaabane', email: 'bilel@smartpm.com',  password: 'member123', role: 'MEMBER', certifications: ['CODE','LLT','HLT'] },
 ];

 for (const u of seedUsers) {
  const exists = await User.findOne({ email: u.email });
  if (!exists) {
   const passwordHash = await bcrypt.hash(u.password, 10);
   await User.create({ ...u, passwordHash, provider: 'local', isActive: true });
   console.log(`  ✅ Created: ${u.email} [${u.role}]`);
  } else {
   console.log(`  ⏭️ Skipped: ${u.email} (already exists)`);
  }
 }

 // ── 3. Compliance Alerts ────────────────────────────────────────
 console.log('\n⚠️ Seeding compliance alerts…');
 const sampleAlerts = [
  { type: 'EXPIRED_CERTIFICATION',    severity: 'HIGH',   message: 'Youssef Dridi has no certifications — cannot be assigned to any team.' },
  { type: 'UNCERTIFIED_MEMBER_ASSIGNED', severity: 'CRITICAL', message: 'Omar Trabelsi assigned to HLT review without HLT certification.' },
  { type: 'AUTHOR_IS_REVIEWER',     severity: 'CRITICAL', message: 'Author == Reviewer on Task #TK-0042 in LLR phase. Blocked.' },
  { type: 'OVERDUE_REVIEW',       severity: 'HIGH',   message: 'Review for LLT-REQ-017 is 3 days overdue. Team: LLT.' },
  { type: 'AI_SERVICE_ISSUE',      severity: 'MEDIUM',  message: 'Ollama response time exceeds 5s. Delay predictions may be slow.' },
  { type: 'FAILED_QUIZ',         severity: 'MEDIUM',  message: 'Leila Mansouri failed LLT certification quiz (score: 45/100).' },
 ];
 await ComplianceAlert.insertMany(sampleAlerts);
 console.log(`  ✅ ${sampleAlerts.length} compliance alerts seeded`);

 // ── 4. AI Usage Logs ────────────────────────────────────────────
 console.log('\n🤖 Seeding AI usage logs…');
 const types = ['DELAY_PREDICTION','REVIEWER_SUGGESTION','RISK_DETECTION','COMPLIANCE_CHECK','GENERAL'];
 const providers = ['ollama','gemini'];
 const aiLogs = Array.from({ length: 30 }, (_, i) => ({
  provider:  providers[i % 2],
  requestType: types[i % types.length],
  success:   i % 7 !== 0, // ~85% success rate
  tokensUsed: Math.floor(Math.random() * 800) + 100,
  latencyMs:  Math.floor(Math.random() * 2000) + 200,
  feedbackScore: i % 3 === 0 ? Math.floor(Math.random() * 3) + 3 : undefined,
  createdAt:  new Date(Date.now() - i * 24 * 60 * 60 * 1000 / 3), // spread over past 10 days
 }));
 await AIUsageLog.insertMany(aiLogs);
 console.log(`  ✅ ${aiLogs.length} AI usage logs seeded`);

 console.log('\n🎉 Seed complete!\n');
 console.log('═══════════════════════════════════════════════');
 console.log(' Default Credentials:');
 console.log(' Admin:  admin@smartpm.com / admin123');
 console.log(' Manager: ahmed@smartpm.com / manager123');
 console.log(' Member: omar@smartpm.com  / member123');
 console.log('═══════════════════════════════════════════════\n');

 await mongoose.disconnect();
 process.exit(0);
}

seed().catch(err => {
 console.error('❌ Seed failed:', err);
 process.exit(1);
});
