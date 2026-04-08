import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TaskService } from '../../services/task';

@Component({
  selector: 'app-member-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './member-dashboard.html',
  styleUrls: ['./member-dashboard.scss']
})
export class MemberDashboard implements OnInit, OnDestroy {
  userName = 'Member';
  activeTab = 'tasks';
  isLoading = false;
  
  // Timer state
  timerActive = false;
  timerSeconds = 0;
  timerInterval: any;

  todayTasks: any[] = [];
  reviewsToDone: any[] = [];
  performanceStats: any[] = [];
  trainingTracks = [
    { name: 'LLT Certification Track', progress: 72, status: 'In Progress' },
    { name: 'DO-178C Fundamentals', progress: 100, status: 'Certified ✅' }
  ];
  teamComments = [
    { author: 'Sami', msg: 'Verification for SRS-01 is complete. Waiting for review.', time: '10:24 AM' },
    { author: 'Mariem', msg: 'Remember to upload traceability link.', time: '09:15 AM' }
  ];

  constructor(
    private router: Router,
    private taskService: TaskService
  ) {}

  ngOnInit() {
    this.extractUser();
    this.fetchDashboardData();
  }

  fetchDashboardData() {
    this.isLoading = true;
    this.taskService.getDashboard().subscribe({
      next: (data) => {
        this.todayTasks = data.todayTasks;
        this.reviewsToDone = data.reviewsToDone;
        this.performanceStats = data.performanceStats;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch member dashboard data', err);
        this.isLoading = false;
      }
    });
  }

  extractUser() {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const emailUser = payload.email?.split('@')[0] || 'Member';
        this.userName = emailUser.charAt(0).toUpperCase() + emailUser.slice(1);
      } catch {}
    }
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  toggleTimer() {
    this.timerActive = !this.timerActive;
    if (this.timerActive) {
      this.timerInterval = setInterval(() => this.timerSeconds++, 1000);
    } else {
      clearInterval(this.timerInterval);
    }
  }

  stopTimer() {
    if (confirm('Marquer la tâche comme terminée et arrêter le timer?')) {
      this.timerActive = false;
      clearInterval(this.timerInterval);
      this.timerSeconds = 0;
    }
  }

  formatTimer(): string {
    const h = Math.floor(this.timerSeconds / 3600);
    const m = Math.floor((this.timerSeconds % 3600) / 60);
    const s = this.timerSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }
}
