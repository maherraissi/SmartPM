import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TaskService } from '../../services/task';
import { NotificationService } from '../../services/notification';
import { CommentService } from '../../services/comment';
import { FormsModule } from '@angular/forms';
import { AiChatbotComponent } from '../ai-chatbot/ai-chatbot';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-member-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AiChatbotComponent],
  templateUrl: './member-dashboard.html',
  styleUrls: ['./member-dashboard.scss']
})
export class MemberDashboard implements OnInit, OnDestroy {
  userName = 'Member';
  activeTab = 'tasks';
  isLoading = false;

  notifications: any[] = [];
  showNotifs = false;
  unreadCount = 0;

  // Timer state
  timerActive = false;
  timerSeconds = 0;
  private timerInterval: any;

  todayTasks: any[] = [];
  allTasks: any[] = [];
  reviewsToDone: any[] = [];
  myProjects: any[] = [];
  selectedProject: any = null;
  projectTasks: any[] = [];
  performanceStats: any[] = [];
  groupedTasksByDay: { dayKey: string; label: string; tasks: any[]; isToday: boolean; isPast: boolean }[] = [];
  selectedDayIndex = 0; // index in groupedTasksByDay

  get currentDay() { return this.groupedTasksByDay[this.selectedDayIndex] || null; }
  get canPrev()    { return this.selectedDayIndex > 0; }
  get canNext()    { return this.selectedDayIndex < this.groupedTasksByDay.length - 1; }

  prevDay() { if (this.canPrev) this.selectedDayIndex--; }
  nextDay() { if (this.canNext) this.selectedDayIndex++; }


  // ⏱️ TIMER & TASK EXECUTION
  timerRunning: boolean = false;
  timerTime: number = 0;
  activeTask: any = null;

  trainingTracks: any[] = [];
  teamComments: any[] = [];
  newCommentText: string = '';

  // Toast Notification state
  liveToast = { show: false, title: '', message: '' };
  private toastTimeout: any;

  // Subscriptions store — cleaned up on destroy
  private subs: Subscription[] = [];
  private commentPollInterval: any;

  constructor(
    private router: Router,
    private taskService: TaskService,
    private notificationService: NotificationService,
    private commentService: CommentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.extractUser();
    this.fetchDashboardData();
    this.fetchComments();
    this.fetchFormations();

    // ─── Start centralized notification polling ───────────────────────────────
    this.notificationService.startPolling(3500);

    // Subscribe to notification stream (reactive, no manual setInterval)
    const notifSub = this.notificationService.notifications$.subscribe(notifs => {
      const prevUnread = this.unreadCount;
      const newUnread = notifs.filter(n => !n.isRead).length;

      if (newUnread > prevUnread) {
        // New notification arrived → refresh dashboard data
        this.fetchDashboardData();
        const latest = notifs.find(n => !n.isRead);
        if (latest) this.showToast(latest.title, latest.message);
      }

      this.notifications = notifs;
      this.unreadCount = newUnread;
      this.cdr.detectChanges();
    });
    this.subs.push(notifSub);

    // ─── Comment polling (5s) ─────────────────────────────────────────────────
    this.commentPollInterval = setInterval(() => this.fetchComments(), 5000);
  }

  ngOnDestroy() {
    // Clean ALL subscriptions & intervals
    this.subs.forEach(s => s.unsubscribe());
    this.notificationService.stopPolling();
    clearInterval(this.timerInterval);
    clearInterval(this.commentPollInterval);
    clearTimeout(this.toastTimeout);
  }

  fetchFormations() {
    this.taskService.getFormations().subscribe({
      next: (data) => {
        this.trainingTracks = data.map(f => ({
          name: f.title,
          progress: Math.floor(Math.random() * 60) + 40,
          status: 'In Progress'
        }));
      }
    });
  }

  uploadEvidence(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Simulation d'upload
      this.showToast('☁️ Upload en cours', `Envoi de "${file.name}"...`);
      setTimeout(() => {
        this.showToast('✅ Upload Réussi', `Le document "${file.name}" a été ajouté à vos preuves.`);
      }, 1500);
    }
  }

  markRead(id: string) {
    this.notificationService.markAsRead(id).subscribe();
  }

  markAllRead() {
    this.notificationService.markAllAsRead();
  }

  toggleNotifs() {
    this.showNotifs = !this.showNotifs;
    if (this.showNotifs) this.notificationService.markAllAsRead();
  }

  fetchDashboardData() {
    this.isLoading = true;
    this.taskService.getDashboard().subscribe({
      next: (data) => {
        this.todayTasks = data.todayTasks || [];
        this.allTasks   = data.allTasks   || data.todayTasks || [];
        this.reviewsToDone = data.reviewsToDone || [];
        this.myProjects = data.myProjects || [];
        this.performanceStats = data.performanceStats || [];
        this.buildGroupedTasks();
        
        // Restore active task if there is one in progress
        if (!this.activeTask) {
          const inProgress = this.allTasks.find(t => t.status === 'IN_PROGRESS');
          if (inProgress) {
            this.activeTask = inProgress;
            if (!this.timerRunning) {
              this.timerRunning = true;
              this.startTimer();
            }
          }
        }
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[MEMBER DASHBOARD] Error:', err);
        this.isLoading = false;
        if (err.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
    });
  }

  buildGroupedTasks() {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Group by dayKey
    const map = new Map<string, any[]>();
    for (const t of this.allTasks) {
      const key = t.dayKey || todayStr;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }

    // Sort days ascending
    const sortedKeys = Array.from(map.keys()).sort();

    this.groupedTasksByDay = sortedKeys.map(key => {
      let label = key;
      if (key === todayStr)          label = "📅 Aujourd'hui";
      else if (key === yesterdayStr) label = '⬅️ Hier';
      else if (key === tomorrowStr)  label = '➡️ Demain';
      else {
        const d = new Date(key);
        label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      }
      return {
        dayKey: key,
        label,
        isToday: key === todayStr,
        isPast: key < todayStr,
        tasks: map.get(key)!
      };
    });

    // Auto-position on today (or closest past day if no today)
    const todayIdx = this.groupedTasksByDay.findIndex(d => d.isToday);
    this.selectedDayIndex = todayIdx >= 0 ? todayIdx : Math.max(0, this.groupedTasksByDay.length - 1);
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

  logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab !== 'project-detail') this.selectedProject = null;
  }

  enterProject(project: any) {
    this.selectedProject = project;
    this.isLoading = true;
    this.taskService.getProjectTasks(project.id).subscribe({
      next: (tasks) => {
        this.projectTasks = tasks;
        this.activeTab = 'project-detail';
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  exitProject() {
    this.selectedProject = null;
    this.activeTab = 'projects';
  }

  // ⏱️ TIMER METHODS
  startTask(task: any) {
    if (this.activeTask && this.activeTask.id !== task.id) {
      alert("Une autre tâche est déjà en cours. Terminez-la d'abord.");
      return;
    }

    this.activeTask = task;
    this.taskService.updateTaskStatus(task.id, 'IN_PROGRESS').subscribe({
      next: () => {
        this.timerRunning = true;
        this.startTimer();
        this.fetchDashboardData();
      }
    });
  }

  startReview(review: any) {
    this.taskService.updateTaskStatus(review.id, 'IN_REVIEW').subscribe({
      next: () => {
        this.fetchDashboardData();
        this.showToast('🔍 Revue lancée !', `Vous avez démarré la revue de "${review.task}".`);
      },
      error: (err) => {
        console.error("Error starting review:", err);
        this.showToast('❌ Erreur', `Impossible de lancer la revue.`);
      }
    });
  }

  finishReview(review: any) {
    this.taskService.updateTaskStatus(review.id, 'REVIEWED').subscribe({
      next: () => {
        this.fetchDashboardData();
        this.showToast('✅ Revue Terminée', `La tâche "${review.task}" a été validée avec succès.`);
      },
      error: (err) => {
        console.error("Error finishing review:", err);
        this.showToast('❌ Erreur', `Impossible de valider la revue.`);
      }
    });
  }

  finishSpecificTask(task: any) {
    this.taskService.updateTaskStatus(task.id, 'READY_FOR_REVIEW').subscribe({
      next: () => {
        if (this.activeTask && this.activeTask.id === task.id) {
          this.stopTimer();
          this.timerTime = 0;
          this.activeTask = null;
          this.timerRunning = false;
        }
        this.fetchDashboardData();
        this.showToast('✅ Mission Accomplie !', `La tâche "${task.name}" a été envoyée pour revue.`);
      }
    });
  }

  finishTask() {
    if (!this.activeTask) return;
    this.finishSpecificTask(this.activeTask);
  }

  startTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timerTime++;
      this.cdr.detectChanges();
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.timerInterval);
    this.timerRunning = false;
  }

  formatTimer(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => v < 10 ? '0' + v : v).join(':');
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

  fetchComments() {
    this.commentService.getComments().subscribe({
      next: (data) => {
        this.teamComments = data.map(c => ({
          author: c.authorId?.name || 'Inconnu',
          msg: c.text,
          time: new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        this.cdr.detectChanges();
      }
    });
  }

  sendComment() {
    if (!this.newCommentText.trim()) return;
    this.commentService.postComment(this.newCommentText).subscribe({
      next: () => {
        this.newCommentText = '';
        this.fetchComments();
      }
    });
  }
}
