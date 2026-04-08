import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ProjectService } from '../../services/project';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './manager-dashboard.html',
  styleUrls: ['./manager-dashboard.scss']
})
export class ManagerDashboard implements OnInit {
  activeTab = 'overview';
  isLoading = false;

  kpis: any[] = [];
  workload: any[] = [];
  reviews: any[] = [];
  certifications: any[] = [];
  aiInsights: any[] = [];
  alerts: any[] = [];
  projects: any[] = [];
  archivedProjects: any[] = [];

  constructor(
    private router: Router,
    private projectService: ProjectService
  ) {}

  ngOnInit() {
    this.fetchCockpitData();
  }

  fetchCockpitData() {
    this.isLoading = true;
    this.projectService.getCockpit().subscribe({
      next: (data) => {
        // Map backend data to UI KPIs
        this.kpis = [
          { label: 'Projets Actifs', value: data.activeProjects, icon: '🚀', trend: data.activeProjects > 0 ? 'En cours' : '0 Projet', alert: false },
          { label: 'Tâches en Retard', value: data.delayedTasks, icon: '⏳', trend: data.delayedTasks > 0 ? 'Critique' : 'À jour', alert: data.delayedTasks > 0 },
          { label: 'Revues en Attente', value: data.pendingReviews, icon: '🔍', trend: data.pendingReviews > 0 ? 'Action Requise' : 'Aucune', alert: false },
          { label: 'Tâches Bloquées', value: data.blockedTasks, icon: '🚫', trend: data.blockedTasks > 0 ? 'Urgence' : 'Normal', alert: data.blockedTasks > 0 },
          { label: 'Membres d\'Équipe', value: data.teamMembers, icon: '👥', trend: data.teamMembers > 0 ? 'Actifs' : 'Aucun' },
          { label: 'Risques Détectés', value: data.aiRisks, icon: '🤖', trend: data.aiRisks > 0 ? 'Prioritaire' : 'Sécurisé', alert: data.aiRisks > 0 },
          { label: 'Tâches Complétées', value: data.milestonesCompleted, icon: '🎯', trend: data.milestonesCompleted > 0 ? 'Progression' : '0 Complété' },
          { label: 'Taux Utilisation', value: data.utilizationPercentage + '%', icon: '📈', trend: data.utilizationPercentage > 0 ? 'Optimale' : '0% Charge' }
        ];

        // Map real project list
        const allProjects = data.projects || [];
        this.projects = allProjects.filter((p: any) => p.status !== 'ARCHIVED');
        this.archivedProjects = allProjects.filter((p: any) => p.status === 'ARCHIVED');

        // Map real team members
        this.workload = data.team || [];
        
        // Map dynamic sections returning from API
        this.reviews = data.reviews || [];
        this.certifications = data.certifications || [];
        this.aiInsights = data.aiInsights || [];
        this.alerts = data.alerts || [];

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch cockpit data', err);
        this.isLoading = false;
      }
    });
  }

  doArchive(id: string) {
    this.projectService.archiveProject(id).subscribe({
      next: () => this.fetchCockpitData(),
      error: (err) => console.error(err)
    });
  }

  doRestore(id: string) {
    this.projectService.restoreProject(id).subscribe({
      next: () => this.fetchCockpitData(),
      error: (err) => console.error(err)
    });
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  launchWizard() {
    this.router.navigate(['/manager/project-wizard']);
  }
}
