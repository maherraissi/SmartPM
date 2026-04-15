import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
 providedIn: 'root'
})
export class ProjectService {
 private apiUrl = 'http://localhost:3000/projects';

 constructor(private http: HttpClient) {}

 private headers(): HttpHeaders {
  const token = localStorage.getItem('token') || '';
  return new HttpHeaders({ Authorization: `Bearer ${token}` });
 }

 deployMission(payload: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/deploy`, payload, { headers: this.headers() });
 }

 getProjects(): Observable<any[]> {
  return this.http.get<any[]>(this.apiUrl, { headers: this.headers() });
 }

 getCockpit(): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/cockpit`, { headers: this.headers() });
 }

 archiveProject(id: string): Observable<any> {
  return this.http.post(`${this.apiUrl}/${id}/archive`, {}, { headers: this.headers() });
 }

 restoreProject(id: string): Observable<any> {
  return this.http.post(`${this.apiUrl}/${id}/restore`, {}, { headers: this.headers() });
 }

 getProjectStructure(id: string): Observable<any> {
  return this.http.get(`${this.apiUrl}/${id}/structure`, { headers: this.headers() });
 }

 deleteProject(id: string): Observable<any> {
  return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.headers() });
 }

 updateProject(id: string, payload: any): Observable<any> {
  return this.http.patch(`${this.apiUrl}/${id}`, payload, { headers: this.headers() });
 }
}
