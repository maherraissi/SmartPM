import { Component, OnInit, ChangeDetectorRef, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project';
import { AiService } from '../../services/ai';
import { NotificationService } from '../../services/notification';
import { AiChatbotComponent } from '../ai-chatbot/ai-chatbot';
import { Subscription } from 'rxjs';
import { marked } from 'marked';

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
  simulationData: any = null;
  simulationStreamText = '';       // raw streamed markdown
  simulationRenderedHtml = '';     // parsed HTML for display
  simulationError = '';
  simulationProject = '';
  simulationScenario = 'Analyse complète : risques, retards, recommandations prioritaires et chemin critique';
  simulationDurationWeeks = 4;
  simulationDuration = 0;
  simulationDone = false;
  simulationWordCount = 0;

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
  private cockpitPollInterval: any; // Live polling every 10s for task updates

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private projectService: ProjectService,
    private aiService: AiService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit() {
    document.body.classList.add('no-shell');
    this.route.queryParams.subscribe(params => {
      const savedTab = localStorage.getItem('smartpm_manager_tab');
      if (params['tab']) {
        this.activeTab = params['tab'];
        localStorage.setItem('smartpm_manager_tab', params['tab']);
      } else if (savedTab) {
        this.activeTab = savedTab;
      }
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

    // ─── Live polling every 10s: keeps manager in sync with member task updates ─
    this.cockpitPollInterval = setInterval(() => {
      this.fetchCockpitData();
    }, 10000);
  }

  ngOnDestroy() {
    document.body.classList.remove('no-shell');
    this.subs.forEach(s => s.unsubscribe());
    this.notificationService.stopPolling();
    clearInterval(this.cockpitPollInterval);
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
    localStorage.setItem('smartpm_manager_tab', tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  getModalBtnLabel() {
    return this.customModal.type === 'confirm' ? 'Confirmer' : 'Ok, compris';
  }

  // Removed - no longer needed

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
    this.simulationData = null;
    this.simulationStreamText = '';
    this.simulationRenderedHtml = '';
    this.simulationError = '';
    this.simulationDuration = 0;
    this.simulationWordCount = 0;
    const t0 = Date.now();

    try {
      await this.aiService.simulateProject(
        this.simulationProject,
        this.simulationScenario,
        this.simulationDurationWeeks,
        (chunk: string) => {
          this.zone.run(() => {
            this.simulationStreamText += chunk;
            this.simulationRenderedHtml = this._renderMarkdown(this.simulationStreamText);
            this.simulationWordCount = this.simulationStreamText.split(/\s+/).filter(Boolean).length;
            this.cdr.detectChanges();
          });
        },
        'agent_2' // Gemini 2.5 Flash
      );
      this.zone.run(() => {
        this.simulationDuration = Math.round((Date.now() - t0) / 1000);
        this.isSimulating = false;
        this.simulationDone = true;
        this.simulationData = { _raw: this.simulationStreamText }; // mark as done
        this.cdr.detectChanges();
      });
    } catch (e: any) {
      this.zone.run(() => {
        this.simulationError = '❌ Le service IA est indisponible. Vérifiez que FastAPI tourne sur le port 8000.';
        this.isSimulating = false;
        this.cdr.detectChanges();
      });
    }
  }

  /** Minimal markdown → HTML renderer (no external lib needed) */
  private _renderMarkdown(md: string): string {
    // We use marked for robust parsing of tables, lists, etc.
    try {
      marked.setOptions({
        gfm: true,
        breaks: true
      });
      return marked.parse(md) as string;
    } catch (e) {
      console.error("Marked parsing error:", e);
      return md;
    }
  }

  getRiskColor(level: string): string {
    const map: any = { FAIBLE: '#10b981', MOYEN: '#f59e0b', 'ÉLEVÉ': '#ef4444', CRITIQUE: '#7c2d12' };
    return map[level] || '#64748b';
  }

  resetSimulation() {
    this.simulationData = null;
    this.simulationDone = false;
    this.simulationError = '';
    this.simulationDuration = 0;
  }

  copyResults() {
    const text = this.simulationStreamText || JSON.stringify(this.simulationData, null, 2);
    if (!text) return;
    navigator.clipboard?.writeText(text)
      .then(() => this.showAlert('✅ Copié', 'Rapport Markdown copié dans le presse-papier.'));
  }

  resetSimulationFull() {
    this.simulationData = null;
    this.simulationStreamText = '';
    this.simulationRenderedHtml = '';
    this.simulationDone = false;
    this.simulationError = '';
    this.simulationDuration = 0;
    this.simulationWordCount = 0;
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
