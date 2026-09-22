import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private apiUrl  = `${environment.apiUrl}/ai`;  // NestJS backend
  private chatUrl = environment.aiUrl;            // FastAPI AI service

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const response = await fetch(`${this.chatUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, context }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Serveur AI a retourné une erreur: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Pas de réponse du serveur AI.');
      }

      await this._readStream(response.body.getReader(), onChunk);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('Timeout - La requête AI a pris trop de temps.');
      }
      if (err?.message?.includes('fetch') || err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
        throw new Error('Connexion refusée - Vérifiez que le service AI tourne sur le port 8000.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── Project Simulation (Cloud AI) ───────────────────────────────
  async simulateProject(
    projectId: string,
    scenario: string,
    durationWeeks: number,
    onChunk: (text: string) => void,
    modelName = 'gemini'
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout for simulation

    try {
      const response = await fetch(`${this.chatUrl}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id:     projectId,
          scenario:       scenario,
          duration_weeks: durationWeeks,
          model_name:     modelName
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur AI: ${response.status} ${response.statusText}`);
      }

      if (!response.body) throw new Error('No response body');
      await this._readStream(response.body.getReader(), onChunk);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('Timeout - La simulation a pris trop de temps (>2 min).');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
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
