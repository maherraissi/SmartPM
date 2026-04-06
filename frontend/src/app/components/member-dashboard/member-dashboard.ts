import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-member-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './member-dashboard.html',
  styleUrls: ['./member-dashboard.scss']
})
export class MemberDashboard implements OnInit {
  userName = 'Utilisateur';
  isLoading = false;

  // Stats personnelles
  stats = [
    { label: 'Tâches assignées', value: 0, icon: '📋', color: 'blue' },
    { label: 'En cours', value: 0, icon: '⚙️', color: 'orange' },
    { label: 'Terminées', value: 0, icon: '✅', color: 'green' },
    { label: 'En retard', value: 0, icon: '⚠️', color: 'red' },
  ];

  // Tâches personnelles (viendront du backend plus tard)
  tasks: any[] = [
    { name: 'Detailed Software Design', project: 'Flight Control v2', phase: 'LLR', status: 'InProgress', due: '2026-04-10' },
    { name: 'Peer Review', project: 'Flight Control v2', phase: 'LLR', status: 'Pending', due: '2026-04-15' },
    { name: 'Unit Testing - Module A', project: 'Nose Gear System', phase: 'LLT', status: 'Completed', due: '2026-04-05' },
  ];

  ngOnInit() {
    // Load user name from JWT
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userName = payload.email?.split('@')[0] || 'Utilisateur';
      } catch {}
    }
    this.computeStats();
  }

  computeStats() {
    this.stats[0].value = this.tasks.length;
    this.stats[1].value = this.tasks.filter(t => t.status === 'InProgress').length;
    this.stats[2].value = this.tasks.filter(t => t.status === 'Completed').length;
    this.stats[3].value = this.tasks.filter(t => t.status === 'Pending' && new Date(t.due) < new Date()).length;
  }

  getStatusClass(status: string): string {
    return { 'Completed': 'status-done', 'InProgress': 'status-progress', 'Pending': 'status-pending' }[status] || '';
  }

  getStatusLabel(status: string): string {
    return { 'Completed': 'Terminée', 'InProgress': 'En cours', 'Pending': 'En attente' }[status] || status;
  }
}
