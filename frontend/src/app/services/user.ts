import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

const API = 'http://localhost:3000';

export interface User {
 _id: string;
 firstName: string;
 lastName: string;
 email: string;
 role: string;
 certifications?: string[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
 constructor(private http: HttpClient) {}

 private headers(): HttpHeaders {
  const token = localStorage.getItem('token') || '';
  return new HttpHeaders({ Authorization: `Bearer ${token}` });
 }

 getAllUsers(): Observable<User[]> {
  return this.http.get<User[]>(`${API}/users`, { headers: this.headers() });
 }
}
