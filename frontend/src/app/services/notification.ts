import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private apiUrl = `${environment.apiUrl}/notifications`;

  // Shared reactive state accessible from any component
  private _notifications$ = new BehaviorSubject<any[]>([]);
  private _unreadCount$ = new BehaviorSubject<number>(0);

  notifications$ = this._notifications$.asObservable();
  unreadCount$ = this._unreadCount$.asObservable();

  private pollSub: Subscription | null = null;

  constructor(private http: HttpClient) {}

  private headers() {
    return { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
  }

  /** Start global polling (call once from root or per-dashboard) */
  startPolling(intervalMs = 4000) {
    this.stopPolling(); // prevent duplicates
    this.pollSub = interval(intervalMs)
      .pipe(switchMap(() => this.http.get<any[]>(this.apiUrl, { headers: this.headers() })))
      .subscribe({
        next: (notifs) => this._updateState(notifs),
        error: () => {} // silent fail — don't crash if token expires
      });
    // Fetch immediately on start
    this.fetchOnce();
  }

  stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  fetchOnce(): void {
    this.http.get<any[]>(this.apiUrl, { headers: this.headers() }).subscribe({
      next: (notifs) => this._updateState(notifs),
      error: () => {}
    });
  }

  private _updateState(notifs: any[]) {
    this._notifications$.next(notifs);
    this._unreadCount$.next(notifs.filter(n => !n.isRead).length);
  }

  // Keep legacy Observable for backward compat
  getNotifications(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.headers() });
  }

  markAsRead(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/read`, {}, { headers: this.headers() }).pipe(
      tap(() => this.fetchOnce()) // refresh after mark
    );
  }

  markAllAsRead() {
    const unread = this._notifications$.value.filter(n => !n.isRead);
    unread.forEach(n => this.markAsRead(n._id).subscribe());
  }

  ngOnDestroy() {
    this.stopPolling();
  }
}
