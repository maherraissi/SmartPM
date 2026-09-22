import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
 providedIn: 'root'
})
export class TaskService {
 private apiUrl = `${environment.apiUrl}/tasks`;

 constructor(private http: HttpClient) {}

 private headers() {
  return { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
 }

 getDashboard(): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/dashboard`, { headers: this.headers() });
 }

 createTask(dto: any): Observable<any> {
  return this.http.post<any>(this.apiUrl, dto, { headers: this.headers() });
 }

 getProjectTasks(projectId: string): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/project/${projectId}`, { headers: this.headers() });
 }

 updateTaskStatus(taskId: string, status: string): Observable<any> {
  return this.http.patch<any>(`${this.apiUrl}/${taskId}/status`, { status }, { headers: this.headers() });
 }

 getFormations(): Observable<any[]> {
  return this.http.get<any[]>(`${environment.apiUrl}/training/all`, { headers: this.headers() });
 }
}
