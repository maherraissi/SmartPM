import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
 providedIn: 'root'
})
export class NotificationService {
 private apiUrl = 'http://localhost:3000/notifications';

 constructor(private http: HttpClient) {}

 private headers() {
  return { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
 }

 getNotifications(): Observable<any[]> {
  return this.http.get<any[]>(this.apiUrl, { headers: this.headers() });
 }

 markAsRead(id: string): Observable<any> {
  return this.http.post(`${this.apiUrl}/${id}/read`, {}, { headers: this.headers() });
 }
}
