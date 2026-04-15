import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
 providedIn: 'root'
})
export class CommentService {
 private apiUrl = 'http://localhost:3000/comments';

 constructor(private http: HttpClient) {}

 private headers() {
  return { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
 }

 getComments(projectId?: string): Observable<any[]> {
  const url = projectId ? `${this.apiUrl}?projectId=${projectId}` : this.apiUrl;
  return this.http.get<any[]>(url, { headers: this.headers() });
 }

 postComment(text: string, projectId?: string): Observable<any> {
  return this.http.post<any>(this.apiUrl, { text, projectId }, { headers: this.headers() });
 }
}
