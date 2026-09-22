import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AdminService {
 constructor(private http: HttpClient) {}

 private headers(): HttpHeaders {
  const token = localStorage.getItem('token') || '';
  return new HttpHeaders({ Authorization: `Bearer ${token}` });
 }

 // ─── Governance / KPIs ───────────────────────────────────────────────────
 getKPIs(): Observable<any> {
  return this.http.get(`${API}/admin/governance/kpis`, { headers: this.headers() });
 }
 getGovernanceSnapshot(): Observable<any> {
  return this.http.get(`${API}/admin/governance/snapshot`, { headers: this.headers() });
 }

 // ─── Users ────────────────────────────────────────────────────────────────
 getUsers(params: any = {}): Observable<any> {
  let p = new HttpParams();
  Object.keys(params).forEach(k => { if (params[k]) p = p.set(k, params[k]); });
  return this.http.get(`${API}/admin/users`, { headers: this.headers(), params: p });
 }
 getUserStats(): Observable<any> {
  return this.http.get(`${API}/admin/users/stats`, { headers: this.headers() });
 }
 createUser(dto: any): Observable<any> {
  return this.http.post(`${API}/admin/users`, dto, { headers: this.headers() });
 }
 updateUser(id: string, dto: any): Observable<any> {
  return this.http.patch(`${API}/admin/users/${id}`, dto, { headers: this.headers() });
 }
 assignRole(id: string, role: string): Observable<any> {
  return this.http.patch(`${API}/admin/users/${id}/role`, { role }, { headers: this.headers() });
 }
 activateUser(id: string): Observable<any> {
  return this.http.patch(`${API}/admin/users/${id}/activate`, {}, { headers: this.headers() });
 }
 deactivateUser(id: string): Observable<any> {
  return this.http.patch(`${API}/admin/users/${id}/deactivate`, {}, { headers: this.headers() });
 }
 resetPassword(id: string, newPassword: string): Observable<any> {
  return this.http.patch(`${API}/admin/users/${id}/reset-password`, { newPassword }, { headers: this.headers() });
 }
 deleteUser(id: string): Observable<any> {
  return this.http.delete(`${API}/admin/users/${id}`, { headers: this.headers() });
 }
 getAuditLogs(page = 1): Observable<any> {
  return this.http.get(`${API}/admin/users/audit-logs?page=${page}`, { headers: this.headers() });
 }

 // ─── Certifications ───────────────────────────────────────────────────────
 getCertificationStats(): Observable<any> {
  return this.http.get(`${API}/admin/certifications/stats`, { headers: this.headers() });
 }
 getCompetencyMatrix(): Observable<any> {
  return this.http.get(`${API}/admin/certifications/matrix`, { headers: this.headers() });
 }
 getTransferRequests(status = ''): Observable<any> {
  const q = status ? `?status=${status}` : '';
  return this.http.get(`${API}/admin/certifications/transfers${q}`, { headers: this.headers() });
 }
 approveCertification(userId: string, phase: string): Observable<any> {
  return this.http.post(`${API}/admin/certifications/${userId}/approve`, { phase }, { headers: this.headers() });
 }
 revokeCertification(userId: string, phase: string): Observable<any> {
  return this.http.post(`${API}/admin/certifications/${userId}/revoke`, { phase }, { headers: this.headers() });
 }
 approveTransfer(id: string): Observable<any> {
  return this.http.patch(`${API}/admin/certifications/transfers/${id}/approve`, {}, { headers: this.headers() });
 }
 rejectTransfer(id: string, adminNotes: string): Observable<any> {
  return this.http.patch(`${API}/admin/certifications/transfers/${id}/reject`, { adminNotes }, { headers: this.headers() });
 }

 // ─── Alerts ──────────────────────────────────────────────────────────────
 getAlerts(params: any = {}): Observable<any> {
  let p = new HttpParams();
  Object.keys(params).forEach(k => { if (params[k]) p = p.set(k, params[k]); });
  return this.http.get(`${API}/admin/alerts`, { headers: this.headers(), params: p });
 }
 getAlertStats(): Observable<any> {
  return this.http.get(`${API}/admin/alerts/stats`, { headers: this.headers() });
 }
 resolveAlert(id: string, notes = ''): Observable<any> {
  return this.http.patch(`${API}/admin/alerts/${id}/resolve`, { notes }, { headers: this.headers() });
 }
 ignoreAlert(id: string): Observable<any> {
  return this.http.patch(`${API}/admin/alerts/${id}/ignore`, {}, { headers: this.headers() });
 }

 // ─── AI Monitoring ───────────────────────────────────────────────────────
 getAIStatus(): Observable<any> {
  return this.http.get(`${API}/admin/ai-monitoring/status`, { headers: this.headers() });
 }
 getAIStats(): Observable<any> {
  return this.http.get(`${API}/admin/ai-monitoring/stats`, { headers: this.headers() });
 }

 // ─── Settings ────────────────────────────────────────────────────────────
 getSettings(): Observable<any> {
  return this.http.get(`${API}/admin/settings`, { headers: this.headers() });
 }
 updateSettings(dto: any): Observable<any> {
  return this.http.patch(`${API}/admin/settings`, dto, { headers: this.headers() });
 }
 addHoliday(date: string): Observable<any> {
  return this.http.post(`${API}/admin/settings/holidays`, { date }, { headers: this.headers() });
 }
 removeHoliday(date: string): Observable<any> {
  return this.http.delete(`${API}/admin/settings/holidays/${date}`, { headers: this.headers() });
 }

 // ─── Legacy (keep backward compat) ───────────────────────────────────────
 getAllUsers(): Observable<any[]> {
  return this.http.get<any[]>(`${API}/users`, { headers: this.headers() });
 }
}
