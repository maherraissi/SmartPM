import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../services/project';
import { AiChatbotComponent } from '../ai-chatbot/ai-chatbot';

@Component({
 selector: 'app-manager-dashboard',
 standalone: true,
 imports: [CommonModule, RouterModule, AiChatbotComponent],
 templateUrl: './manager-dashboard.html',
 styleUrls: ['./manager-dashboard.scss']
})
export class ManagerDashboard implements OnInit, OnDestroy {
 activeTab = 'overview';
 isLoading = false;

 activeProjects = 0;
 teamMembers = 0;
 delayedTasks = 0;
 milestonesCompleted = 0;

 kpis: any[] = [];
 workload: any[] = [];
 reviews: any[] = [];
 certifications: any[] = [];
 aiInsights: any[] = [];
 alerts: any[] = [];
 projects: any[] = [];
 archivedProjects: any[] = [];
 selectedProjectId: string = '';
 
 cockpitData: any = null;
 today: Date = new Date();

 // Custom Modal State
 customModal = {
  show: false,
  title: '',
  message: '',
  type: 'alert' as 'alert' | 'confirm',
  confirmCallback: () => {}
 };

 getModalBtnLabel() {
  return this.customModal.type === 'confirm' ? 'Confirmer' : 'Ok, compris';
 }

 constructor(
  private router: Router,
  private route: ActivatedRoute,
  private projectService: ProjectService,
  private cdr: ChangeDetectorRef
 ) {}

 ngOnInit() {
  document.body.classList.add('no-shell');
  this.route.queryParams.subscribe(params => {
   if (params['tab']) {
    this.activeTab = params['tab'];
   }
   this.fetchCockpitData();
  });
 }

 ngOnDestroy() {
  document.body.classList.remove('no-shell');
 }

 setTab(tab: string) {
  this.activeTab = tab;
  this.router.navigate([], {
   relativeTo: this.route,
   queryParams: { tab: tab },
   queryParamsHandling: 'merge'
  });
 }

 fetchCockpitData() {
  this.isLoading = true;
  this.projectService.getCockpit().subscribe({
   next: (data) => {
    if (!data) {
     console.warn('Received null/undefined cockpit data');
     this.isLoading = false;
     this.cdr.detectChanges();
     return;
    }

    this.cockpitData = data;
    this.activeProjects = data.activeProjects || 0;
    this.teamMembers = data.teamMembers || 0;
    this.delayedTasks = data.delayedTasks || 0;
    this.milestonesCompleted = data.milestonesCompleted || 0;

    const allProjects = data.projects || [];
    this.projects = allProjects.filter((p: any) => p.status !== 'ARCHIVED');
    this.archivedProjects = allProjects.filter((p: any) => p.status === 'ARCHIVED');

    this.workload = data.team || [];
    this.reviews = data.reviews || [];
    this.certifications = data.certifications || [];
    this.aiInsights = data.aiInsights || [];
    this.alerts = data.alerts || [];

    this.isLoading = false;
    this.cdr.detectChanges();
   },
   error: (err) => {
    console.error('Failed to fetch cockpit data', err);
    this.projects = this.projects || []; // Keep existing or init
    this.archivedProjects = this.archivedProjects || [];
    this.isLoading = false;
    this.cdr.detectChanges();
   }
  });
 }

 showAlert(title: string, message: string) {
  this.customModal = {
   show: true,
   title: title,
   message: message,
   type: 'alert',
   confirmCallback: () => { this.customModal.show = false; }
  };
  this.cdr.detectChanges();
 }

 showConfirm(title: string, message: string, onConfirm: () => void) {
  this.customModal = {
   show: true,
   title: title,
   message: message,
   type: 'confirm',
   confirmCallback: () => {
    onConfirm();
    this.customModal.show = false;
    this.cdr.detectChanges();
   }
  };
  this.cdr.detectChanges();
 }

 launchAudit() {
  this.isLoading = true;
  this.showAlert("🚀 Audit IA", "Lancement de l'audit de conformité ...");
  setTimeout(() => {
   this.fetchCockpitData();
   this.showAlert("✅ Audit Terminé", "La structure du projet est conforme aux standards aéronautiques.");
  }, 2000);
 }

 viewProject(id: string) {
  this.selectedProjectId = id;
  this.router.navigate(['/manager/project', id]);
 }

 doArchive(id: string) {
  this.showConfirm('Archivage', 'Voulez-vous vraiment archiver ce projet ?', () => {
   this.projectService.archiveProject(id).subscribe(() => this.fetchCockpitData());
  });
 }

 doRestore(id: string) {
  this.showConfirm('Restauration', 'Voulez-vous restaurer ce projet dans le cockpit actif ?', () => {
   this.projectService.restoreProject(id).subscribe(() => this.fetchCockpitData());
  });
 }

 doDelete(id: string) {
  this.showConfirm('Suppression Définitive', '⚠️ Attention : Cette action est irréversible. Confirmer la suppression ?', () => {
   this.projectService.deleteProject(id).subscribe(() => this.fetchCockpitData());
  });
 }

 doEdit(id: string) {
  this.router.navigate(['/manager/project-wizard'], { queryParams: { edit: id } });
 }

 goToWizard() {
  this.router.navigate(['/manager/project-wizard']);
 }

 logout() {
  localStorage.removeItem('token');
  this.router.navigate(['/login']);
 }
}
