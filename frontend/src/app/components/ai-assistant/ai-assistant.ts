import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService, ChatMessage } from '../../services/ai';

@Component({
 selector: 'app-ai-assistant',
 standalone: true,
 imports: [CommonModule, FormsModule],
 templateUrl: './ai-assistant.html',
 styleUrls: ['./ai-assistant.scss']
})
export class AiAssistantComponent implements OnInit, AfterViewChecked {
 @ViewChild('chatBody') chatBody!: ElementRef;
 @Input() projectId: string = '';

 // ── State ────────────────────────────────
 isOpen = false;
 activePanel: 'chat' | 'simulator' | 'report' | 'alerts' = 'chat';

 // ── Chat ─────────────────────────────────
 messages: ChatMessage[] = [];
 userInput = '';
 isTyping = false;
 ollamaStatus: 'checking' | 'online' | 'offline' = 'checking';

 // ── Simulator ────────────────────────────
 simulatorResult: any = null;
 isSimulating = false;

 // ── Report ───────────────────────────────
 reportResult: any = null;
 isGeneratingReport = false;

 // ── Alerts ───────────────────────────────
 alertsResult: any[] = [];
 isLoadingAlerts = false;

 constructor(private aiService: AiService) {}

 ngOnInit() {
  this.checkStatus();
  // Initial welcome message
  this.messages = [{
   role: 'assistant',
   content: '👋 Bonjour ! Je suis **SmartPM AI**, votre assistant intelligent pour la gestion de projets aéronautiques .\n\nJe peux vous aider à analyser vos projets, identifier les risques, et optimiser votre planning. Comment puis-je vous assister ?',
   timestamp: new Date()
  }];
 }

 ngAfterViewChecked() {
  this.scrollToBottom();
 }

 checkStatus() {
  this.aiService.getStatus().subscribe({
   next: (data) => {
    this.ollamaStatus = data.ollama === 'online' ? 'online' : 'offline';
   },
   error: () => { this.ollamaStatus = 'offline'; }
  });
 }

 toggleChat() {
  this.isOpen = !this.isOpen;
 }

 setPanel(panel: 'chat' | 'simulator' | 'report' | 'alerts') {
  this.activePanel = panel;
 }

 // ── Send Chat Message ─────────────────────
 sendMessage() {
  const msg = this.userInput.trim();
  if (!msg || this.isTyping) return;

  this.messages.push({ role: 'user', content: msg, timestamp: new Date() });
  this.userInput = '';
  this.isTyping = true;

  const history = this.messages.slice(0, -1).map(m => ({
   role: m.role === 'user' ? 'user' : 'assistant',
   content: m.content
  }));

  this.aiService.chat(msg, history).subscribe({
   next: (data) => {
    this.messages.push({
     role: 'assistant',
     content: data.response,
     timestamp: new Date()
    });
    this.isTyping = false;
   },
   error: (err) => {
    this.messages.push({
     role: 'assistant',
     content: '❌ Erreur de connexion à Gemini. Vérifiez votre clé API.',
     timestamp: new Date()
    });
    this.isTyping = false;
   }
  });
 }

 onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
   event.preventDefault();
   this.sendMessage();
  }
 }

 // ── Quick Prompts ─────────────────────────
 sendQuickPrompt(prompt: string) {
  this.userInput = prompt;
  this.sendMessage();
 }

 // ── Simulator ─────────────────────────────
 runSimulator() {
  if (!this.projectId) {
   alert('Aucun projet sélectionné pour la simulation.');
   return;
  }
  this.isSimulating = true;
  this.simulatorResult = null;
  this.aiService.simulate(this.projectId).subscribe({
   next: (data) => {
    this.simulatorResult = data.simulation;
    this.isSimulating = false;
   },
   error: (err) => {
    this.isSimulating = false;
    alert('Erreur Ollama: ' + err.message);
   }
  });
 }

 // ── Report ────────────────────────────────
 generateReport() {
  if (!this.projectId) {
   alert('Aucun projet sélectionné.');
   return;
  }
  this.isGeneratingReport = true;
  this.reportResult = null;
  this.aiService.generateReport(this.projectId).subscribe({
   next: (data) => {
    this.reportResult = data.report;
    this.isGeneratingReport = false;
   },
   error: () => { this.isGeneratingReport = false; }
  });
 }

 // ── Alerts ────────────────────────────────
 loadAlerts() {
  if (!this.projectId) return;
  this.isLoadingAlerts = true;
  this.alertsResult = [];
  this.aiService.getAlerts(this.projectId).subscribe({
   next: (data) => {
    this.alertsResult = data.alerts || [];
    this.isLoadingAlerts = false;
   },
   error: () => { this.isLoadingAlerts = false; }
  });
 }

 getRiskColor(level: string): string {
  const map: any = { FAIBLE: '#10b981', MOYEN: '#f59e0b', ÉLEVÉ: '#ef4444', CRITIQUE: '#7c2d12' };
  return map[level] || '#64748b';
 }

 getAlertColor(type: string): string {
  const map: any = { CRITICAL: '#ef4444', WARNING: '#f59e0b', INFO: '#3b82f6', SUCCESS: '#10b981' };
  return map[type] || '#64748b';
 }

 getAlertIcon(type: string): string {
  const map: any = { CRITICAL: '🚨', WARNING: '⚠️', INFO: 'ℹ️', SUCCESS: '✅' };
  return map[type] || '📌';
 }

 getHealthColor(status: string): string {
  const map: any = { NOMINAL: '#10b981', ATTENTION: '#f59e0b', CRITIQUE: '#ef4444' };
  return map[status] || '#64748b';
 }

 formatContent(content: string): string {
  return content
   .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
   .replace(/\n/g, '<br>');
 }

 private scrollToBottom() {
  try {
   if (this.chatBody?.nativeElement) {
    this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
   }
  } catch {}
 }
}
