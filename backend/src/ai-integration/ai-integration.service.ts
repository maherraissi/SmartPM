import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { Project, ProjectDocument } from '../project/schemas/project.schema';
import { Task, TaskDocument, TaskStatus } from '../task/schemas/task.schema';

@Injectable()
export class AiIntegrationService {
  private readonly logger = new Logger(AiIntegrationService.name);
  private genAI: GoogleGenerativeAI;
  private ollamaUrl: string;
  private ollamaModel: string;

  constructor(
    private configService: ConfigService,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.ollamaUrl = this.configService.get<string>('OLLAMA_URL') || 'http://localhost:11434';
    this.ollamaModel = this.configService.get<string>('OLLAMA_MODEL') || 'llama3';
  }

  // ── GEMINI CHATBOT ────────────────────────────────────────────────
  async chat(message: string, history: { role: string; content: string }[] = []): Promise<string> {
    this.logger.log(`[GEMINI] Chat request: "${message.substring(0, 60)}..."`);

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const systemPrompt = `Tu es SmartPM AI, assistant expert en gestion de projets aéronautiques DO-178C.
Règles ABSOLUES:
- Réponds en 2-4 phrases maximum, toujours en français
- Sois direct, précis, actionnable
- Utilise des bullet points si nécessaire
- Jamais de longues introductions ni de conclusion
- Format: réponse immédiate + action concrète`;

      // Build conversation history
      const chatHistory = history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      }));

      const chat = model.startChat({
        history: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'Compris ! Je suis SmartPM AI, prêt à vous assister dans la gestion de vos projets aéronautiques DO-178C.' }] },
          ...chatHistory,
        ],
      });

      const result = await chat.sendMessage(message);
      const response = result.response.text();
      this.logger.log(`[GEMINI] Response generated (${response.length} chars)`);
      return response;
    } catch (error) {
      this.logger.error(`[GEMINI] Error: ${error.message}`);
      throw new Error(`Gemini API Error: ${error.message}`);
    }
  }

  // ── OLLAMA — BUILD PROJECT CONTEXT ─────────────────────────────
  private async buildProjectContext(projectId: string): Promise<string> {
    const project = await this.projectModel.findById(projectId).lean().exec();
    if (!project) throw new Error('Projet introuvable');

    const tasks = await this.taskModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .lean()
      .exec();

    const total = tasks.length;
    const closed = tasks.filter(t => t.status === TaskStatus.CLOSED).length;
    const inProgress = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const blocked = tasks.filter(t => t.status === TaskStatus.BLOCKED).length;
    const review = tasks.filter(t => t.status === TaskStatus.READY_FOR_REVIEW).length;
    const todo = tasks.filter(t => t.status === TaskStatus.TODO).length;

    const now = new Date();
    const endDate = project.targetEndDate ? new Date(project.targetEndDate) : null;
    const daysLeft = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const progress = total > 0 ? Math.round((closed / total) * 100) : 0;

    const delayedTasks = tasks.filter(t => {
      if (!t.plannedEndDate || t.status === TaskStatus.CLOSED) return false;
      return new Date() > new Date(t.plannedEndDate);
    }).length;

    return `
PROJET: ${project.name}
STATUT: ${project.status}
DESCRIPTION: ${project.description || 'Non définie'}
DATE DÉBUT: ${project.startDate ? new Date(project.startDate).toLocaleDateString('fr-FR') : 'Non définie'}
DATE FIN PRÉVUE: ${endDate ? endDate.toLocaleDateString('fr-FR') : 'Non définie'}
JOURS RESTANTS: ${daysLeft !== null ? daysLeft : 'Inconnu'}

PROGRESSION GLOBALE: ${progress}%
TOTAL TÂCHES: ${total}
  - Terminées (CLOSED): ${closed}
  - En cours (IN_PROGRESS): ${inProgress}
  - En attente de revue: ${review}
  - Bloquées: ${blocked}
  - À faire (TODO): ${todo}
  - Tâches en retard: ${delayedTasks}

MEMBRES ÉQUIPE: ${(project.teamMembers || []).length} personnes assignées
    `.trim();
  }

  // ── OLLAMA CALL ───────────────────────────────────────────────────
  private async callOllama(prompt: string): Promise<string> {
    this.logger.log(`[OLLAMA] Sending request to ${this.ollamaUrl}`);
    try {
      const response = await axios.post(
        `${this.ollamaUrl}/api/generate`,
        {
          model: this.ollamaModel,
          prompt,
          stream: false,
          options: { temperature: 0.3, num_predict: 1500 },
        },
        { timeout: 120000 },
      );
      this.logger.log(`[OLLAMA] Response received`);
      return response.data.response;
    } catch (error) {
      this.logger.error(`[OLLAMA] Error: ${error.message}`);
      throw new Error(`Ollama inaccessible: ${error.message}. Vérifiez qu'Ollama tourne sur :11434`);
    }
  }

  // ── SIMULATEUR ────────────────────────────────────────────────────
  async simulateProject(projectId: string): Promise<any> {
    this.logger.log(`[SIMULATOR] Analyzing project: ${projectId}`);
    const context = await this.buildProjectContext(projectId);

    const prompt = `Tu es un expert en gestion de projets aéronautiques DO-178C. Analyse ce projet et fournis une simulation complète.

${context}

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans backticks) dans ce format exact:
{
  "riskScore": <0-100>,
  "riskLevel": "<FAIBLE|MOYEN|ÉLEVÉ|CRITIQUE>",
  "predictedCompletion": "<date ISO ou 'Dans X jours'>",
  "onTime": <true|false>,
  "recommendations": ["<conseil 1>", "<conseil 2>", "<conseil 3>"],
  "criticalPath": ["<tâche critique 1>", "<tâche critique 2>"],
  "summary": "<résumé de 2-3 phrases>"
}`;

    const raw = await this.callOllama(prompt);

    try {
      // Extract JSON from response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback: return raw text in structured format
      return {
        riskScore: 50,
        riskLevel: 'MOYEN',
        predictedCompletion: 'Analyse en cours',
        onTime: true,
        recommendations: ['Analyse disponible dans les logs'],
        criticalPath: [],
        summary: raw.substring(0, 400),
      };
    }
  }

  // ── RAPPORT ───────────────────────────────────────────────────────
  async generateReport(projectId: string): Promise<any> {
    this.logger.log(`[REPORT] Generating report for: ${projectId}`);
    const context = await this.buildProjectContext(projectId);

    const prompt = `Tu es un expert en gestion de projets aéronautiques DO-178C. Génère un rapport exécutif professionnel.

${context}

Réponds UNIQUEMENT avec un JSON valide (sans markdown) dans ce format:
{
  "title": "<titre du rapport>",
  "executiveSummary": "<résumé exécutif 3-4 phrases>",
  "healthStatus": "<NOMINAL|ATTENTION|CRITIQUE>",
  "sections": [
    {"title": "État d'Avancement", "content": "<analyse détaillée>"},
    {"title": "Analyse des Risques", "content": "<risques identifiés>"},
    {"title": "Conformité DO-178C", "content": "<état de conformité>"},
    {"title": "Actions Recommandées", "content": "<actions prioritaires>"}
  ],
  "kpis": [
    {"label": "<label>", "value": "<valeur>", "status": "<OK|WARNING|ERROR>"}
  ],
  "generatedAt": "<date actuelle>"
}`;

    const raw = await this.callOllama(prompt);

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const report = JSON.parse(jsonMatch[0]);
      report.generatedAt = new Date().toISOString();
      return report;
    } catch {
      return {
        title: `Rapport Projet`,
        executiveSummary: raw.substring(0, 500),
        healthStatus: 'ATTENTION',
        sections: [{ title: 'Analyse Brute', content: raw }],
        kpis: [],
        generatedAt: new Date().toISOString(),
      };
    }
  }

  // ── ALERTES INTELLIGENTES ─────────────────────────────────────────
  async generateAlerts(projectId: string): Promise<any[]> {
    this.logger.log(`[ALERTS] Generating alerts for: ${projectId}`);
    const context = await this.buildProjectContext(projectId);

    const prompt = `Tu es un système d'alertes IA pour projets aéronautiques DO-178C.

${context}

Analyse et génère UNIQUEMENT un JSON valide (sans markdown) avec les alertes:
{
  "alerts": [
    {
      "id": "<unique-id>",
      "type": "<CRITICAL|WARNING|INFO|SUCCESS>",
      "title": "<titre court>",
      "message": "<message détaillé>",
      "action": "<action recommandée>"
    }
  ]
}

Génère entre 2 et 6 alertes pertinentes basées sur les données réelles du projet.`;

    const raw = await this.callOllama(prompt);

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.alerts || [];
    } catch {
      return [
        {
          id: 'fallback-1',
          type: 'INFO',
          title: 'Analyse IA',
          message: raw.substring(0, 200),
          action: 'Vérifier les logs Ollama',
        },
      ];
    }
  }

  // ── CHECK OLLAMA STATUS ───────────────────────────────────────────
  async checkOllamaStatus(): Promise<{ online: boolean; models: string[] }> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 });
      const models = (response.data.models || []).map((m: any) => m.name);
      return { online: true, models };
    } catch {
      return { online: false, models: [] };
    }
  }
}
