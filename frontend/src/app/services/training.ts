import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private api = 'http://localhost:3000/training';

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  createFormation(payload: any): Observable<any> {
    return this.http.post(`${this.api}/create`, payload, { headers: this.headers() });
  }

  getAllFormations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/all`, { headers: this.headers() });
  }

  getFormationById(id: string): Observable<any> {
    return this.http.get<any>(`${this.api}/${id}`, { headers: this.headers() });
  }

  updateFormation(id: string, payload: any): Observable<any> {
    return this.http.put(`${this.api}/${id}`, payload, { headers: this.headers() });
  }

  deleteFormation(id: string): Observable<any> {
    return this.http.delete(`${this.api}/${id}`, { headers: this.headers() });
  }

  assignMembers(formationId: string, userIds: string[]): Observable<any> {
    return this.http.post(`${this.api}/${formationId}/assign-members`, { userIds }, { headers: this.headers() });
  }

  getFormationStats(formationId: string): Observable<any> {
    return this.http.get<any>(`${this.api}/${formationId}/stats`, { headers: this.headers() });
  }

  getAllUsersProgress(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/admin/all-progress`, { headers: this.headers() });
  }

  getAllTransferRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/transfer/all`, { headers: this.headers() });
  }

  approveTransfer(requestId: string): Observable<any> {
    return this.http.put(`${this.api}/transfer/${requestId}/approve`, {}, { headers: this.headers() });
  }

  rejectTransfer(requestId: string, adminNote: string): Observable<any> {
    return this.http.put(`${this.api}/transfer/${requestId}/reject`, { adminNote }, { headers: this.headers() });
  }

  // ─── Member ──────────────────────────────────────────────────────────────────

  getMyFormations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/member/my`, { headers: this.headers() });
  }

  startFormation(trainingId: string): Observable<any> {
    return this.http.post(`${this.api}/${trainingId}/start`, {}, { headers: this.headers() });
  }

  updateProgress(trainingId: string, progress: number): Observable<any> {
    return this.http.put(`${this.api}/${trainingId}/progress`, { progress }, { headers: this.headers() });
  }

  submitQuiz(trainingId: string, answers: number[]): Observable<any> {
    return this.http.post(`${this.api}/${trainingId}/submit-quiz`, { answers }, { headers: this.headers() });
  }

  getMyProgress(trainingId: string): Observable<any> {
    return this.http.get<any>(`${this.api}/${trainingId}/my-progress`, { headers: this.headers() });
  }

  removeMyFormation(trainingId: string): Observable<any> {
    return this.http.delete(`${this.api}/my/${trainingId}`, { headers: this.headers() });
  }

  requestTransfer(fromEquipe: string, toEquipe: string, reason: string): Observable<any> {
    return this.http.post(`${this.api}/transfer/request`, { fromEquipe, toEquipe, reason }, { headers: this.headers() });
  }

  getMyTransferRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/transfer/my`, { headers: this.headers() });
  }

  seedFormations(): Observable<any> {
    return this.http.post(`${this.api}/seed`, {});
  }

  // ─── File Upload ──────────────────────────────────────────────────────────────
  // NOTE: No Content-Type header — browser sets multipart/form-data with boundary automatically

  uploadFile(file: File): Observable<{ url: string; resourceType: string; originalName: string; size: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    return this.http.post<any>(`${this.api}/upload`, formData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
