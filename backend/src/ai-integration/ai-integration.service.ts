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

 constructor(
  private configService: ConfigService,
  @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
 ) {
  const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
  this.genAI = new GoogleGenerativeAI(apiKey);
 }

 // ── CHATBOT (GEMINI -> GROQ -> OPENROUTER -> OPENAI FALLBACK) ────────────────
 async chat(message: string, history: { role: string; content: string }[] = []): Promise<string> {
  this.logger.log(`[CHAT] Request: "${message.substring(0, 60)}..."`);

  const systemPrompt = `Tu es SmartPM AI, assistant expert en gestion de projets aéronautiques.
Règles ABSOLUES:
- Réponds en 2-4 phrases maximum, toujours en français
- Sois direct, précis, actionnable
- Utilise des bullet points si nécessaire
- Jamais de longues introductions ni de conclusion`;

  const messages = [
   { role: 'system', content: systemPrompt },
   ...history.map(h => ({ role: h.role, content: h.content })),
   { role: 'user', content: message },
  ];

  // 1. Try Gemini
  try {
   const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
   const chatHistory = history.map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.content }],
   }));
   const chat = model.startChat({
    history: [
     { role: 'user', parts: [{ text: systemPrompt }] },
     { role: 'model', parts: [{ text: 'Compris ! Je suis SmartPM AI.' }] },
     ...chatHistory,
    ],
   });
   const result = await chat.sendMessage(message);
   return result.response.text();
  } catch (geminiError) {
   this.logger.warn(`[CHAT] Gemini failed, falling back to Groq...`);
   try {
    const groqKey = this.configService.get<string>('GROQ_API_KEY');
    if (!groqKey) throw new Error('Groq key missing');
    const resp = await axios.post(
     'https://api.groq.com/openai/v1/chat/completions',
     { model: 'llama-3.1-8b-instant', messages, temperature: 0.3, max_tokens: 600 },
     { headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' }, timeout: 30000 }
    );
    return resp.data.choices[0].message.content;
   } catch (groqError) {
    this.logger.warn(`[CHAT] Groq failed, falling back to OpenRouter...`);
    try {
     const orKey = this.configService.get<string>('OPENROUTER_API_KEY');
     if (!orKey) throw new Error('OpenRouter key missing');
     const resp = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      { model: 'meta-llama/llama-3-8b-instruct:free', messages, temperature: 0.3 },
      { headers: { 'Authorization': `Bearer ${orKey}`, 'Content-Type': 'application/json' }, timeout: 30000 }
     );
     return resp.data.choices[0].message.content;
    } catch (orError) {
     this.logger.error(`[CHAT] All AI APIs failed`);
     throw new Error(`Service IA indisponible. Veuillez réessayer plus tard.`);
    }
   }
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

 // ── AI CALL (GEMINI -> GROQ -> OPENROUTER -> OPENAI FALLBACK) ───────────────────────────
 private async callAI(prompt: string): Promise<string> {
  // 1. Try Gemini
  try {
   this.logger.log(`[AI] Attempting Gemini (gemini-2.0-flash)...`);
   const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
   const result = await model.generateContent(prompt);
   return result.response.text();
  } catch (geminiError) {
   this.logger.warn(`[AI] Gemini failed: ${geminiError.message}. Falling back to Groq...`);
   
   // 2. Try Groq (Llama 3)
   try {
    const groqKey = this.configService.get<string>('GROQ_API_KEY');
    if (!groqKey) throw new Error('Clé API Groq introuvable');
    
    this.logger.log(`[AI] Attempting Groq (llama-3.1-8b-instant)...`);
    const response = await axios.post(
     'https://api.groq.com/openai/v1/chat/completions',
     {
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800
     },
     {
      headers: {
       'Authorization': `Bearer ${groqKey}`,
       'Content-Type': 'application/json'
      },
      timeout: 30000
     }
    );
    this.logger.log(`[AI] Response received from Groq`);
    return response.data.choices[0].message.content;
   } catch (groqError) {
    this.logger.warn(`[AI] Groq failed: ${groqError.message}. Falling back to OpenRouter...`);
    
    // 3. Try OpenRouter
    try {
     const openRouterKey = this.configService.get<string>('OPENROUTER_API_KEY');
     if (!openRouterKey) throw new Error('Clé API OpenRouter introuvable');
     
     this.logger.log(`[AI] Attempting OpenRouter (mistralai/mistral-7b-instruct:free)...`);
     const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
       model: 'mistralai/mistral-7b-instruct:free',
       messages: [{ role: 'user', content: prompt }],
       temperature: 0.3
      },
      {
       headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json'
       },
       timeout: 30000
      }
     );
     this.logger.log(`[AI] Response received from OpenRouter`);
     return response.data.choices[0].message.content;
    } catch (openRouterError) {
     this.logger.warn(`[AI] OpenRouter failed: ${openRouterError.message}. Falling back to OpenAI...`);

     // 4. Fallback to OpenAI
     try {
      let openAiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
      openAiKey = openAiKey.replace(/\s+/g, ''); // Fix potentially spaced out key
      
      if (!openAiKey || !openAiKey.startsWith('sk-')) {
       throw new Error('Clé API OpenAI introuvable ou invalide');
      }
      
      this.logger.log(`[AI] Attempting OpenAI (gpt-4o-mini)...`);
      const response = await axios.post(
       'https://api.openai.com/v1/chat/completions',
       {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 800
       },
       {
        headers: {
         'Authorization': `Bearer ${openAiKey}`,
         'Content-Type': 'application/json'
        },
        timeout: 30000
       }
      );
      this.logger.log(`[AI] Response received from OpenAI`);
      return response.data.choices[0].message.content;
     } catch (openAiError) {
      this.logger.error(`[AI] All APIs failed!`);
      throw new Error(`Erreur API critique. Gemini: ${geminiError.message} | Groq: ${groqError.message} | OpenRouter: ${openRouterError.message} | OpenAI: ${openAiError.message}`);
     }
    }
   }
  }
 }

 // ── SIMULATEUR ────────────────────────────────────────────────────
 async simulateProject(projectId: string): Promise<any> {
  this.logger.log(`[SIMULATOR] Analyzing project: ${projectId}`);
  const context = await this.buildProjectContext(projectId);

  const prompt = `Tu es un expert en gestion de projets aéronautiques . Analyse ce projet et fournis une simulation complète.

${context}

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans backticks) dans ce format exact:
{
 "riskScore": <0-100>,
 "riskLevel": "<FAIBLE|MOYEN|ÉLEVÉ|CRITIQUE>",
 "confidenceScore": <0-100>,
 "predictedCompletion": "<date ISO ou 'Dans X jours'>",
 "onTime": <true|false>,
 "recommendations": ["<conseil 1>", "<conseil 2>", "<conseil 3>"],
 "criticalPath": ["<tâche critique 1>", "<tâche critique 2>"],
 "summary": "<résumé de 2-3 phrases>"
}
IMPORTANT: Calcule un indice de confiance (confidenceScore) basé sur la complétude des données du projet.`;

  const raw = await this.callAI(prompt);

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

  const prompt = `Tu es un expert en gestion de projets aéronautiques . Génère un rapport exécutif professionnel.

${context}

Réponds UNIQUEMENT avec un JSON valide (sans markdown) dans ce format:
{
 "title": "<titre du rapport>",
 "executiveSummary": "<résumé exécutif 3-4 phrases>",
 "healthStatus": "<NOMINAL|ATTENTION|CRITIQUE>",
 "sections": [
  {"title": "État d'Avancement", "content": "<analyse détaillée>"},
  {"title": "Analyse des Risques", "content": "<risques identifiés>"},
  {"title": "Conformité ", "content": "<état de conformité>"},
  {"title": "Actions Recommandées", "content": "<actions prioritaires>"}
 ],
 "kpis": [
  {"label": "<label>", "value": "<valeur>", "status": "<OK|WARNING|ERROR>"}
 ],
 "generatedAt": "<date actuelle>"
}`;

  const raw = await this.callAI(prompt);

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

  const prompt = `Tu es un système d'alertes IA pour projets aéronautiques .

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

  const raw = await this.callAI(prompt);

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
     action: 'Vérifier les logs du service IA',
    },
   ];
  }
 }

}
