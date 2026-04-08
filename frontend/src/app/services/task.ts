import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiUrl = 'http://localhost:3000/tasks';

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
}
