import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private apiUrl  = 'http://localhost:3000/ai';  // NestJS backend
  private chatUrl = 'http://localhost:8000';      // FastAPI AI service

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ── Chat (Observable for existing components) ─────────────────
  chat(message: string, history: { role: string; content: string }[], context = ''): Observable<any> {
    return this.http
      .post(`${this.chatUrl}/chat`, { message, history, context })
      .pipe(timeout(30000));
  }

  // ── Chat Streaming ─────────────────────────────────────────────
  async chatStream(
    message: string,
    history: { role: string; content: string }[],
    context = '',
    onChunk: (text: string) => void
  ): Promise<void> {
    const response = await fetch(`${this.chatUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, context })
    });
    if (!response.body) return;
    await this._readStream(response.body.getReader(), onChunk);
  }

  // ── Project Simulation (Ollama) ───────────────────────────────
  async simulateProject(
    projectId: string,
    scenario: string,
    durationWeeks: number,
    onChunk: (text: string) => void,
    modelName = 'llama3'
  ): Promise<void> {
    const response = await fetch(`${this.chatUrl}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id:     projectId,
        scenario:       scenario,
        duration_weeks: durationWeeks,
        model_name:     modelName
      })
    });
    if (!response.body) throw new Error('No response body');
    await this._readStream(response.body.getReader(), onChunk);
  }

  // ── Get available Ollama models ───────────────────────────────
  getOllamaModels(): Observable<any> {
    return this.http.get(`${this.chatUrl}/simulate/models`);
  }

  // ── Legacy NestJS endpoints ───────────────────────────────────
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
    return this.http.get(`${this.chatUrl}/status`);
  }

  // ── Private: read streaming response ─────────────────────────
  private async _readStream(reader: ReadableStreamDefaultReader<Uint8Array>, onChunk: (text: string) => void): Promise<void> {
    const decoder = new TextDecoder('utf-8');
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) onChunk(decoder.decode(value, { stream: true }));
    }
  }
}
