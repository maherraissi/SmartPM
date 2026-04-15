import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { AiIntegrationService } from './ai-integration.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiIntegrationController {
 constructor(private readonly aiService: AiIntegrationService) {}

 // ── GEMINI CHATBOT ────────────────────────────────────────────────
 @Post('chat')
 async chat(@Body() body: { message: string; history?: { role: string; content: string }[] }) {
  const response = await this.aiService.chat(body.message, body.history || []);
  return { response, timestamp: new Date().toISOString() };
 }

 // ── OLLAMA SIMULATOR ─────────────────────────────────────────────
 @Post('simulate/:projectId')
 async simulate(@Param('projectId') projectId: string) {
  const result = await this.aiService.simulateProject(projectId);
  return { simulation: result, projectId, timestamp: new Date().toISOString() };
 }

 // ── OLLAMA REPORT ─────────────────────────────────────────────────
 @Post('report/:projectId')
 async report(@Param('projectId') projectId: string) {
  const result = await this.aiService.generateReport(projectId);
  return { report: result, projectId, timestamp: new Date().toISOString() };
 }

 // ── OLLAMA ALERTS ─────────────────────────────────────────────────
 @Get('alerts/:projectId')
 async alerts(@Param('projectId') projectId: string) {
  const result = await this.aiService.generateAlerts(projectId);
  return { alerts: result, projectId, timestamp: new Date().toISOString() };
 }

 // ── STATUS CHECK ──────────────────────────────────────────────────
 @Get('status')
 async status() {
  const ollama = await this.aiService.checkOllamaStatus();
  return {
   gemini: 'connected',
   ollama: ollama.online ? 'online' : 'offline',
   models: ollama.models,
   timestamp: new Date().toISOString(),
  };
 }
}
