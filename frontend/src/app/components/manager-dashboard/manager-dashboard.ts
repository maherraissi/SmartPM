import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project';
import { AiService } from '../../services/ai';
import { NotificationService } from '../../services/notification';
import { AiChatbotComponent } from '../ai-chatbot/ai-chatbot';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AiChatbotComponent],
  templateUrl: './manager-dashboard.html',
  styleUrls: ['./manager-dashboard.scss']
})
export class ManagerDashboard implements OnInit, OnDestroy {
  activeTab = 'overview';
  isLoading = false;

  // Simulator state
  isSimulating = false;
  simulationResult = '';
  simulationScenario = 'Retard de 2 semaines sur la phase de développement — impact sur les jalons clés.';
  simulationWeeks = 4;
  simulationProject = '';
  selectedModel = 'agent_1';
  availableModels: {id: string, name: string}[] = [
    {id: 'agent_1', name: 'Agent 1'},
    {id: 'agent_2', name: 'Agent 2'}
  ];
  simulationStartTime: number = 0;
  simulationDuration = 0;
  wordCount = 0;
  simulationDone = false;

  // Dashboard KPIs
  activeProjects = 0;
  teamMembers = 0;
  delayedTasks = 0;
  milestonesCompleted = 0;

  cockpitData: any = null;
  projects: any[] = [];
  archivedProjects: any[] = [];
  workload: any[] = [];
  reviews: any[] = [];
  alerts: any[] = [];
  aiInsights: any[] = [];
  certifications: any[] = [];
  today: Date = new Date();

  // ─── Notifications ─────────────────────────────────────────────────────────
  notifications: any[] = [];
  unreadCount = 0;
  showNotifs = false;

  // Toast
  liveToast = { show: false, title: '', message: '' };
  private toastTimeout: any;

  customModal = {
    show: false,
    title: '',
    message: '',
    type: 'alert' as 'alert' | 'confirm',
    confirmCallback: () => {}
  };

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private projectService: ProjectService,
    private aiService: AiService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    document.body.classList.add('no-shell');
    this.route.queryParams.subscribe(params => {
      if (params['tab']) this.activeTab = params['tab'];
      this.fetchCockpitData();
    });

    // ─── Start live notification polling ────────────────────────────────────
    this.notificationService.startPolling(4000);

    const notifSub = this.notificationService.notifications$.subscribe(notifs => {
      const prevUnread = this.unreadCount;
      const newUnread = notifs.filter(n => !n.isRead).length;

      if (newUnread > prevUnread) {
        // Refresh cockpit data when a new notification arrives (e.g. task update)
        this.fetchCockpitData();
        const latest = notifs.find(n => !n.isRead);
        if (latest) this.showToast(latest.title, latest.message);
      }

      this.notifications = notifs;
      this.unreadCount = newUnread;
      this.cdr.detectChanges();
    });
    this.subs.push(notifSub);
  }

  ngOnDestroy() {
    document.body.classList.remove('no-shell');
    this.subs.forEach(s => s.unsubscribe());
    this.notificationService.stopPolling();
    clearTimeout(this.toastTimeout);
  }

  // ─── Notification UI ───────────────────────────────────────────────────────
  toggleNotifs() {
    this.showNotifs = !this.showNotifs;
    if (this.showNotifs) {
      this.notificationService.markAllAsRead();
    }
  }

  markRead(id: string) {
    this.notificationService.markAsRead(id).subscribe();
  }

  showToast(title: string, message: string) {
    clearTimeout(this.toastTimeout);
    this.liveToast = { show: true, title, message };
    this.cdr.detectChanges();
    this.toastTimeout = setTimeout(() => {
      this.liveToast.show = false;
      this.cdr.detectChanges();
    }, 6000);
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  getModalBtnLabel() {
    return this.customModal.type === 'confirm' ? 'Confirmer' : 'Ok, compris';
  }

  async loadOllamaModels() {
    // Strictly use agent_1 and agent_2
  }

  fetchCockpitData() {
    this.isLoading = true;
    this.projectService.getCockpit().subscribe({
      next: (data) => {
        if (!data) { this.isLoading = false; this.cdr.detectChanges(); return; }
        this.cockpitData = data;
        this.activeProjects = data.activeProjects || 0;
        this.teamMembers = data.teamMembers || 0;
        this.delayedTasks = data.delayedTasks || 0;
        this.milestonesCompleted = data.milestonesCompleted || 0;

        const allProjects = (data.projects || []).map((p: any) => ({
          ...p,
          name: p.name.replace(/ DAL [A-E]$/, '')
        }));
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
      error: () => { this.isLoading = false; this.cdr.detectChanges(); }
    });
  }

  showAlert(title: string, message: string) {
    this.customModal = {
      show: true, title, message,
      type: 'alert',
      confirmCallback: () => { this.customModal.show = false; }
    };
    this.cdr.detectChanges();
  }

  showConfirm(title: string, message: string, onConfirm: () => void) {
    this.customModal = {
      show: true, title, message,
      type: 'confirm',
      confirmCallback: () => { onConfirm(); this.customModal.show = false; this.cdr.detectChanges(); }
    };
    this.cdr.detectChanges();
  }

  launchAudit() {
    this.showAlert('🔍 Audit IA', "Analyse en cours...");
    setTimeout(() => {
      this.fetchCockpitData();
      this.showAlert('✅ Audit Terminé', "Votre projet est conforme aux standards SmartPM.");
    }, 2000);
  }

  viewProject(id: string) { this.router.navigate(['/manager/project', id]); }

  doArchive(id: string) {
    this.showConfirm('Archivage', 'Archiver ce projet ?', () =>
      this.projectService.archiveProject(id).subscribe(() => this.fetchCockpitData())
    );
  }

  doRestore(id: string) {
    this.showConfirm('Restauration', 'Restaurer ce projet ?', () =>
      this.projectService.restoreProject(id).subscribe(() => this.fetchCockpitData())
    );
  }

  doDelete(id: string) {
    this.showConfirm('⚠️ Suppression', 'Action irréversible. Confirmer ?', () =>
      this.projectService.deleteProject(id).subscribe(() => this.fetchCockpitData())
    );
  }

  doEdit(id: string) {
    this.router.navigate(['/manager/project-wizard'], { queryParams: { edit: id } });
  }

  goToWizard() { this.router.navigate(['/manager/project-wizard']); }

  getProjectName(id: string): string {
    return this.projects.find(p => p.id === id)?.name || id;
  }

  async startSimulation() {
    if (!this.simulationProject) {
      this.showAlert('Attention', 'Veuillez sélectionner un projet.');
      return;
    }
    this.isSimulating = true;
    this.simulationDone = false;
    this.simulationResult = '';
    this.wordCount = 0;
    this.simulationDuration = 0;
    this.simulationStartTime = Date.now();

    try {
      await this.aiService.simulateProject(
        this.simulationProject,
        this.simulationScenario,
        this.simulationWeeks,
        (chunk) => {
          this.simulationResult += chunk;
          this.wordCount = this.simulationResult.split(/\s+/).filter(w => w).length;
          this.cdr.detectChanges();
        },
        this.selectedModel
      );
      this.simulationDuration = Math.round((Date.now() - this.simulationStartTime) / 1000);
      this.isSimulating = false;
      this.simulationDone = true;
      this.cdr.detectChanges();
    } catch (err) {
      this.isSimulating = false;
      this.simulationResult = '❌ Erreur de génération. Vérifiez votre connexion à l\'Agent AI (ex: Ollama serve ou clé API).';
      this.cdr.detectChanges();
    }
  }

  resetSimulation() {
    this.simulationResult = '';
    this.simulationDone = false;
    this.wordCount = 0;
    this.simulationDuration = 0;
  }

  copyResults() {
    navigator.clipboard?.writeText(this.simulationResult)
      .then(() => this.showAlert('✅ Copié', 'Rapport copié dans le presse-papier.'));
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
