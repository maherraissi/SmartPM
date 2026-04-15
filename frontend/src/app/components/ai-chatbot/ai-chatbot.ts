import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService, ChatMessage } from '../../services/ai';
import { ProjectService } from '../../services/project';

@Component({
 selector: 'app-ai-chatbot',
 standalone: true,
 imports: [CommonModule, FormsModule],
 templateUrl: './ai-chatbot.html',
 styleUrls: ['./ai-chatbot.scss']
})
export class AiChatbotComponent implements OnInit, AfterViewChecked {
 @ViewChild('chatBody') chatBody!: ElementRef;

 isOpen = false;
 messages: ChatMessage[] = [];
 userInput = '';
 isTyping = false;
 private shouldScroll = false;
 private userContext = '';

 constructor(private aiService: AiService, private projectService: ProjectService, private cdr: ChangeDetectorRef) {}

 ngOnInit() {
  this.messages = [{
   role: 'assistant',
   content: '👋 Bonjour ! Je suis SmartPM AI.\n\nComment puis-je vous aider ?',
   timestamp: new Date()
  }];

  this.projectService.getProjects().subscribe({
   next: (projects) => {
    if (projects && projects.length > 0) {
     const names = projects.map(p => `- ${p.name} (Statut: ${p.status})`).join('\n');
     this.userContext = `L'utilisateur a ${projects.length} projets actifs:\n${names}`;
    }
   },
   error: () => { console.log('Could not fetch projects context for AI'); }
  });
 }

 ngAfterViewChecked() {
  if (this.shouldScroll) {
   this.scrollToBottom();
   this.shouldScroll = false;
  }
 }

 toggle() { this.isOpen = !this.isOpen; this.shouldScroll = true; }

 sendMessage() {
  const msg = this.userInput.trim();
  if (!msg || this.isTyping) return;

  this.messages.push({ role: 'user', content: msg, timestamp: new Date() });
  this.userInput = '';
  this.isTyping = true;
  this.shouldScroll = true;

  const history = this.messages.slice(0, -1).map(m => ({
   role: m.role === 'user' ? 'user' : 'assistant',
   content: m.content
  }));

  // Create empty bot message
  const botMsg: ChatMessage = { role: 'assistant', content: '', timestamp: new Date() };
  this.messages.push(botMsg);

  this.aiService.chatStream(msg, history, this.userContext, (chunk) => {
   this.isTyping = false;
   botMsg.content += chunk;
   this.shouldScroll = true;
   this.cdr.detectChanges();
  }).then(() => {
   this.shouldScroll = true;
   this.cdr.detectChanges();
  }).catch((err) => {
   const isTimeout = err?.name === 'TimeoutError' || err?.message?.includes('Timeout') || err?.status === 504;
   const errMsg = isTimeout
    ? '⏱️ Gemini prend trop de temps. (Timeout)'
    : '❌ Connexion échouée (Vérifiez le serveur / proxy).';
   botMsg.content = botMsg.content ? botMsg.content + `\n\n${errMsg}` : errMsg;
   this.isTyping = false;
   this.shouldScroll = true;
   this.cdr.detectChanges();
  });
 }

 onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
 }

 formatContent(content: string): string {
  if (!content) return '';
  let html = content;

  // En-têtes (Headings)
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold & Italics
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Code inline
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Listes à puces (- ou *)
  html = html.replace(/^[*-] (.+$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>(\n<li>.*<\/li>)*)/gim, '<ul>$1</ul>');

  // Bloc de code (basique)
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="code-block">$1</pre>');

  // Retours à la ligne pour le reste du texte
  let parts = html.split(/(<[^>]+>)/g);
  html = parts.map(part => {
   if (part.startsWith('<')) return part;
   return part.replace(/\n*/g, (match) => match.replace(/\n/g, '<br>'));
  }).join('');

  // Nettoyage des <br> ajoutés dans les listes
  html = html.replace(/<ul><br>*/g, '<ul>');
  html = html.replace(/<\/li><br>*<li>/g, '</li><li>');
  html = html.replace(/<\/ul><br>*/g, '</ul>');
  html = html.replace(/(<br>){3,}/g, '<br><br>');

  return html;
 }

 private scrollToBottom() {
  try {
   if (this.chatBody?.nativeElement) {
    const el = this.chatBody.nativeElement;
    el.scrollTop = el.scrollHeight;
   }
  } catch {}
 }
}
