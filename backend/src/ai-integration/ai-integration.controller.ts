import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { AiIntegrationService } from './ai-integration.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiIntegrationController {
 constructor(private readonly aiService: AiIntegrationService) {}

 // ── CHATBOT ───────────────────────────────────────────────────────
 @Post('chat')
 async chat(@Body() body: { message: string; history?: { role: string; content: string }[] }) {
  const response = await this.aiService.chat(body.message, body.history || []);
  return { response, timestamp: new Date().toISOString() };
 }

 // ── SIMULATOR ─────────────────────────────────────────────────────
 @Post('simulate/:projectId')
 async simulate(@Param('projectId') projectId: string) {
  const result = await this.aiService.simulateProject(projectId);
  return { simulation: result, projectId, timestamp: new Date().toISOString() };
 }

 // ── REPORT ────────────────────────────────────────────────────────
 @Post('report/:projectId')
 async report(@Param('projectId') projectId: string) {
  const result = await this.aiService.generateReport(projectId);
  return { report: result, projectId, timestamp: new Date().toISOString() };
 }

 // ── ALERTS ────────────────────────────────────────────────────────
 @Get('alerts/:projectId')
 async alerts(@Param('projectId') projectId: string) {
  const result = await this.aiService.generateAlerts(projectId);
  return { alerts: result, projectId, timestamp: new Date().toISOString() };
 }

 // ── STATUS ────────────────────────────────────────────────────────
 @Get('status')
 async status() {
  return {
   status: 'online',
   engines: ['Gemini 2.0 Flash', 'Groq Llama 3.1', 'OpenRouter Mistral', 'OpenAI GPT-4o-mini'],
   timestamp: new Date().toISOString(),
  };
 }
}
