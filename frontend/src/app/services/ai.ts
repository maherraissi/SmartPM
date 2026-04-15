import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';

export interface ChatMessage {
 role: 'user' | 'assistant';
 content: string;
 timestamp: Date;
}

@Injectable({
 providedIn: 'root'
})
export class AiService {
 private apiUrl = 'http://localhost:3000/ai';  // NestJS — Ollama tools
 private chatUrl = 'http://localhost:8000';    // Python FastAPI — Gemini chat

 constructor(private http: HttpClient) {}

 private headers(): HttpHeaders {
  const token = localStorage.getItem('token') || '';
  return new HttpHeaders({ Authorization: `Bearer ${token}` });
 }

 chat(message: string, history: { role: string; content: string }[], context: string = ''): Observable<any> {
  // Call Python FastAPI service directly — no JWT needed, 25s timeout
  return this.http.post(`${this.chatUrl}/chat`, { message, history, context }).pipe(
   timeout(25000)
  );
 }

 async chatStream(message: string, history: { role: string; content: string }[], context: string = '', onChunk: (text: string) => void): Promise<void> {
  try {
   const response = await fetch(`${this.chatUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, context })
   });

   if (!response.body) throw new Error('No stream in response');

   const reader = response.body.getReader();
   const decoder = new TextDecoder('utf-8');

   while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
     onChunk(decoder.decode(value, { stream: true }));
    }
   }
  } catch (err) {
   console.error('Chat stream error', err);
   throw err;
  }
 }

 simulate(projectId: string): Observable<any> {
  return this.http.post(`${this.apiUrl}/simulate/${projectId}`, {}, { headers: this.headers() });
 }

 generateReport(projectId: string): Observable<any> {
  return this.http.post(`${this.apiUrl}/report/${projectId}`, {}, { headers: this.headers() });
 }

 getAlerts(projectId: string): Observable<any> {
  return this.http.get(`${this.apiUrl}/alerts/${projectId}`, { headers: this.headers() });
 }

 getStatus(): Observable<any> {
  return this.http.get(`${this.apiUrl}/status`, { headers: this.headers() });
 }
}
