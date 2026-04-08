import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ComplianceAlert, ComplianceAlertDocument, AlertStatus, AlertSeverity } from '../schemas/compliance-alert.schema';
import { AIUsageLog, AIUsageLogDocument, AIProvider } from '../schemas/ai-usage-log.schema';

export interface ServiceStatus {
  status: 'online' | 'offline' | 'degraded';
  latencyMs?: number;
  error?: string;
}

@Injectable()
export class AdminAiMonitoringService {
  constructor(
    @InjectModel(AIUsageLog.name)     private aiLogModel: Model<AIUsageLogDocument>,
    @InjectModel(ComplianceAlert.name) private alertModel: Model<ComplianceAlertDocument>,
  ) {}

  // ─── Ping Ollama ─────────────────────────────────────────────────────────
  async pingOllama(): Promise<ServiceStatus> {
    const url = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const t0 = Date.now();
    try {
      const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return { status: 'degraded', latencyMs: Date.now() - t0 };
      return { status: 'online', latencyMs: Date.now() - t0 };
    } catch (e: any) {
      return { status: 'offline', error: e.message };
    }
  }

  // ─── Check Gemini API ─────────────────────────────────────────────────────
  async pingGemini(): Promise<ServiceStatus> {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'YOUR_GEMINI_API_KEY') {
      return { status: 'offline', error: 'API key not configured' };
    }
    const t0 = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return { status: 'degraded', latencyMs: Date.now() - t0 };
      return { status: 'online', latencyMs: Date.now() - t0 };
    } catch (e: any) {
      return { status: 'offline', error: e.message };
    }
  }

  // ─── Full Status Panel ────────────────────────────────────────────────────
  async getFullStatus() {
    const [ollama, gemini, stats] = await Promise.all([
      this.pingOllama(),
      this.pingGemini(),
      this.getUsageStats(),
    ]);

    // Auto-generate alert if AI is offline
    if (ollama.status === 'offline' || gemini.status === 'offline') {
      await this.alertModel.updateOne(
        { type: 'AI_SERVICE_ISSUE', status: 'OPEN' },
        {
          $setOnInsert: {
            type: 'AI_SERVICE_ISSUE',
            severity: AlertSeverity.CRITICAL,
            status: AlertStatus.OPEN,
            message: `AI service issue detected: Ollama=${ollama.status}, Gemini=${gemini.status}`,
            entityRef: 'AIService',
          },
        },
        { upsert: true },
      );
    }

    return { ollama, gemini, ...stats };
  }

  // ─── Usage Statistics ─────────────────────────────────────────────────────
  async getUsageStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [total, failed, byProvider, byType, tokensAgg, avgFeedback, trend] =
      await Promise.all([
        this.aiLogModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
        this.aiLogModel.countDocuments({ success: false, createdAt: { $gte: thirtyDaysAgo } }),
        this.aiLogModel.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: '$provider', count: { $sum: 1 }, tokens: { $sum: '$tokensUsed' } } },
        ]),
        this.aiLogModel.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: '$requestType', count: { $sum: 1 }, failed: { $sum: { $cond: ['$success', 0, 1] } } } },
          { $sort: { count: -1 } },
        ]),
        this.aiLogModel.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: null, totalTokens: { $sum: '$tokensUsed' }, avgLatency: { $avg: '$latencyMs' } } },
        ]),
        this.aiLogModel.aggregate([
          { $match: { feedbackScore: { $exists: true }, createdAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: null, avg: { $avg: '$feedbackScore' } } },
        ]),
        // Daily trend (last 7 days)
        this.aiLogModel.aggregate([
          { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
          { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }, failed: { $sum: { $cond: ['$success', 0, 1] } },
          }},
          { $sort: { _id: 1 } },
        ]),
      ]);

    const tokenData = tokensAgg[0] || { totalTokens: 0, avgLatency: 0 };
    return {
      totalRequests:   total,
      failedRequests:  failed,
      successRate:     total > 0 ? (((total - failed) / total) * 100).toFixed(1) : '0',
      byProvider,
      byType,
      totalTokens:     tokenData.totalTokens,
      avgLatencyMs:    Math.round(tokenData.avgLatency || 0),
      avgFeedbackScore: avgFeedback[0]?.avg?.toFixed(2) || null,
      dailyTrend:      trend,
    };
  }

  // ─── Log an AI Request ────────────────────────────────────────────────────
  async logRequest(dto: {
    provider: AIProvider; requestType: any;
    requestedBy?: string; success: boolean;
    errorMessage?: string; tokensUsed?: number;
    latencyMs?: number; feedbackScore?: number;
    metadata?: any;
  }) {
    return this.aiLogModel.create(dto);
  }
}
