import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TaskService } from '../../services/task';
import { NotificationService } from '../../services/notification';
import { CommentService } from '../../services/comment';
import { TrainingService } from '../../services/training';
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
  groupedTasksByDay: { dayKey: string; label: string; tasks: any[]; isToday: boolean; isPast: boolean; hasPendingTasks: boolean }[] = [];
  selectedDayIndex = 0; // index in groupedTasksByDay
  selectedDayKey: string | null = null; // source of truth for current day selection

  get currentDay() { return this.groupedTasksByDay[this.selectedDayIndex] || null; }
  get canPrev()    { return this.selectedDayIndex > 0; }
  get canNext()    { return this.selectedDayIndex < this.groupedTasksByDay.length - 1; }

  prevDay() { 
    if (this.canPrev) {
      this.selectedDayIndex--;
      this.selectedDayKey = this.groupedTasksByDay[this.selectedDayIndex]?.dayKey;
      localStorage.setItem('smartpm_member_day_key', this.selectedDayKey);
    }
  }
  nextDay() { 
    if (this.canNext) {
      this.selectedDayIndex++;
      this.selectedDayKey = this.groupedTasksByDay[this.selectedDayIndex]?.dayKey;
      localStorage.setItem('smartpm_member_day_key', this.selectedDayKey);
    }
  }
  selectDay(index: number) {
    this.selectedDayIndex = index;
    this.selectedDayKey = this.groupedTasksByDay[index]?.dayKey;
    localStorage.setItem('smartpm_member_day_key', this.selectedDayKey);
  }


  // ⏱️ TIMER & TASK EXECUTION
  timerRunning: boolean = false;
  timerTime: number = 0;
  activeTask: any = null;

  // 🎓 Training & Quiz State
  trainingTracks: any[] = [];
  activeQuiz: any = null;
  quizAnswers: number[] = [];
  currentQuestionIndex = 0;
  quizResult: any = null;

  // ⏱️ Quiz Timer
  quizTimeLeft = 0;
  quizTimerUrgent = false;
  private quizTimerInterval: any;

  // 🔄 Transfer Requests
  transferRequests: any[] = [];
  newTransfer = { toEquipe: '', reason: '' };
  equipes = ['LLR', 'LLT', 'HLT'];
  teamComments: any[] = [];
  newCommentText: string = '';

  // Toast Notification state
  liveToast = { show: false, title: '', message: '' };
  private toastTimeout: any;

  // Subscriptions store — cleaned up on destroy
  private subs: Subscription[] = [];
  private commentPollInterval: any;
  private justFinishedTaskId: string | null = null; // Guard against race condition

  constructor(
    private router: Router,
    private taskService: TaskService,
    private trainingService: TrainingService,
    private notificationService: NotificationService,
    private commentService: CommentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.extractUser();
    // Restore selected day key from local storage if available
    this.selectedDayKey = localStorage.getItem('smartpm_member_day_key');
    const savedTab = localStorage.getItem('smartpm_member_tab');
    if (savedTab) this.activeTab = savedTab;
    
    this.fetchDashboardData();
    this.fetchComments();
    this.fetchFormations();
    this.fetchTransferRequests();

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
    this.subs.forEach(s => s.unsubscribe());
    this.notificationService.stopPolling();
    clearInterval(this.timerInterval);
    clearInterval(this.commentPollInterval);
    clearInterval(this.quizTimerInterval);
    clearTimeout(this.toastTimeout);
  }

  fetchFormations() {
    this.trainingService.getMyFormations().subscribe({
      next: (data) => {
        // data contains userTraining records populated with trainingId
        this.trainingTracks = data || [];
        this.cdr.detectChanges();
      }
    });
  }

  fetchTransferRequests() {
    this.trainingService.getMyTransferRequests().subscribe({
      next: (data) => {
        this.transferRequests = data || [];
        this.cdr.detectChanges();
      }
    });
  }

  startFormation(tt: any) {
    if (tt.status === 'COMPLETED') return;
    this.trainingService.startFormation(tt.trainingId._id).subscribe({
      next: () => {
        this.fetchFormations();
        this.showToast('🚀 Formation commencée', `Vous avez commencé ${tt.trainingId.title}`);
      }
    });
  }

  removeFormation(tt: any) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la formation "${tt.trainingId.title}" de votre tableau de bord ?`)) {
      this.trainingService.removeMyFormation(tt.trainingId._id).subscribe({
        next: () => {
          this.fetchFormations();
          this.showToast('🗑️ Formation supprimée', 'La formation a été retirée de votre liste.');
        },
        error: () => this.showToast('❌ Erreur', 'Impossible de supprimer cette formation.')
      });
    }
  }

  completeLesson(tt: any, progress: number) {
    this.trainingService.updateProgress(tt.trainingId._id, progress).subscribe({
      next: () => this.fetchFormations()
    });
  }

  openLesson(lesson: any) {
    if (lesson.resourceUrl) {
      window.open(lesson.resourceUrl, '_blank');
    } else {
      this.showToast('ℹ️ Information', 'Le document n\'est pas encore disponible.');
    }
  }

  // ─── QUIZ LOGIC ──────────────────────────────────────────────────────────────
  startQuiz(tt: any) {
    this.activeQuiz = tt;
    this.quizAnswers = new Array(tt.trainingId.quiz.length).fill(-1);
    this.currentQuestionIndex = 0;
    this.quizResult = null;

    // ⏱️ Start countdown
    const durationSecs = (tt.trainingId.quizDurationMinutes || 30) * 60;
    this.quizTimeLeft = durationSecs;
    this.quizTimerUrgent = false;
    clearInterval(this.quizTimerInterval);
    this.quizTimerInterval = setInterval(() => {
      this.quizTimeLeft--;
      this.quizTimerUrgent = this.quizTimeLeft <= 30;
      if (this.quizTimeLeft <= 0) {
        clearInterval(this.quizTimerInterval);
        this.showToast('⏰ Temps écoulé !', 'Le quiz est soumis automatiquement.');
        this._doSubmitQuiz();
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.activeQuiz.trainingId.quiz.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  submitQuiz() {
    if (this.quizAnswers.includes(-1)) {
      this.showToast('⚠️ Attention', 'Veuillez répondre à toutes les questions.');
      return;
    }
    clearInterval(this.quizTimerInterval);
    this._doSubmitQuiz();
  }

  private _doSubmitQuiz() {
    const answers = this.quizAnswers.map(a => a === -1 ? 0 : a);
    this.trainingService.submitQuiz(this.activeQuiz.trainingId._id, answers).subscribe({
      next: (res) => {
        this.quizResult = res;
        this.fetchFormations();
        if (res.passed) {
          this.showToast('🎉 Félicitations !', `Vous avez réussi avec ${res.score}%`);
        } else {
          this.showToast('❌ Échec', `Score de ${res.score}% — insuffisant.`);
        }
      },
      error: () => this.showToast('Erreur', 'Impossible de soumettre le quiz')
    });
  }

  closeQuiz() {
    clearInterval(this.quizTimerInterval);
    this.activeQuiz = null;
    this.quizResult = null;
  }

  formatQuizTimer(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // 📄 Certificat PDF
  downloadCertificate(tt: any) {
    const name = this.userName;
    const formation = tt.trainingId?.title || 'Formation';
    const phase = tt.trainingId?.targetPhase || '';
    const score = tt.quizScore ?? 0;
    const date = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Certificat — ${formation}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#f0fdf4;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:40px}
.cert{width:860px;background:white;border-radius:24px;overflow:hidden;box-shadow:0 25px 80px rgba(16,185,129,.15);border:3px solid #10b981;position:relative}
.top{background:linear-gradient(135deg,#064e3b,#065f46);padding:50px 60px 40px;text-align:center;color:white}
.logo{font-size:3rem;margin-bottom:12px}
.brand{font-size:.8rem;letter-spacing:4px;text-transform:uppercase;color:#6ee7b7;font-weight:700;margin-bottom:24px}
.title{font-size:2rem;font-weight:800;letter-spacing:-.5px}
.body{padding:50px 60px;text-align:center}
.label{color:#64748b;font-size:1rem;margin-bottom:8px}
.name{font-size:3rem;font-weight:800;color:#064e3b;font-style:italic;margin-bottom:30px}
.desc{color:#374151;font-size:1.05rem;line-height:1.9;margin-bottom:30px}
.badge{display:inline-block;background:#dcfce7;color:#065f46;font-weight:800;font-size:1.1rem;padding:10px 24px;border-radius:50px;border:2px solid #6ee7b7;margin-bottom:10px}
.score{display:inline-block;background:#f0fdf4;color:#10b981;font-weight:800;font-size:1.4rem;padding:14px 30px;border-radius:50px;border:2px solid #10b981;margin-bottom:40px}
.footer{display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #e2e8f0;padding:24px 60px;background:#fafafa}
.date{font-size:.9rem;color:#64748b}
.seal{font-size:3.5rem}
.issuer{font-size:.9rem;color:#10b981;font-weight:700}
.wm{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:8rem;opacity:.03;color:#10b981;pointer-events:none;white-space:nowrap;font-weight:900}
@media print{body{background:white;padding:0}.cert{box-shadow:none;width:100%}}
</style></head><body>
<div class="cert">
  <div class="wm">SMARTPM</div>
  <div class="top"><div class="logo">🛡️</div><div class="brand">SmartPM — Aerospace Engineering Platform</div><div class="title">Certificat de Réussite</div></div>
  <div class="body">
    <p class="label">Ce certificat est décerné à</p>
    <div class="name">${name}</div>
    <p class="desc">Pour avoir complété avec succès le module de formation<br>certifié par la plateforme SmartPM.</p>
    <div class="badge">🎓 ${formation}${phase ? ' — ' + phase : ''}</div><br><br>
    <div class="score">🏆 Score obtenu : ${score}%</div>
  </div>
  <div class="footer"><div class="date">📅 Délivré le ${date}</div><div class="seal">🏅</div><div class="issuer">Certifié SmartPM ✅</div></div>
</div>
<script>window.onload=()=>window.print();<\/script>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }

  // ─── TRANSFER LOGIC ─────────────────────────────────────────────────────────
  requestTransfer() {
    if (!this.newTransfer.toEquipe || !this.newTransfer.reason) {
      this.showToast('⚠️ Erreur', 'Veuillez remplir tous les champs du transfert.');
      return;
    }
    // We assume fromEquipe is the user's current equipe. For simplicity, we just pass what they select or infer it.
    // The backend logic checks it. Since we don't store the user's current equipe in the frontend model perfectly, 
    // we'll pass 'CURRENT' and let backend handle or we extract from token.
    const token = localStorage.getItem('token');
    let fromEq = 'Unknown';
    if (token) {
      try {
        fromEq = JSON.parse(atob(token.split('.')[1])).equipe || 'Unknown';
      } catch {}
    }

    this.trainingService.requestTransfer(fromEq, this.newTransfer.toEquipe, this.newTransfer.reason).subscribe({
      next: () => {
        this.showToast('✅ Demande Envoyée', 'Votre demande de transfert a été soumise.');
        this.newTransfer = { toEquipe: '', reason: '' };
        this.fetchTransferRequests();
      },
      error: (err) => {
        this.showToast('❌ Erreur', err?.error?.message || 'Impossible de faire la demande.');
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
        
        // Restore active task if there is one in progress (skip if we just finished it)
        if (!this.activeTask) {
          const inProgress = this.allTasks.find(
            t => t.status === 'IN_PROGRESS' && t.id !== this.justFinishedTaskId
          );
          if (inProgress) {
            this.activeTask = inProgress;
            if (!this.timerRunning) {
              this.timerRunning = true;
              this.startTimer();
            }
          }
        }
        // Clear the guard after the restore check
        this.justFinishedTaskId = null;
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[MEMBER DASHBOARD] Error:', err);
        this.isLoading = false;
        if (err.status === 401) {
          localStorage.removeItem('token');
          this.router.navigate(['/login']);
        }
      }
    });
  }

  buildGroupedTasks() {
    // Save current day selection before rebuild
    const savedDayKey = this.groupedTasksByDay[this.selectedDayIndex]?.dayKey;

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
      
      const dayTasks = map.get(key)!;
      // STRICT LOGIC: A day is pending only if it has tasks that are NOT finished or in review
      const finishedStates = ['READY_FOR_REVIEW', 'IN_REVIEW', 'REVIEWED', 'CLOSED'];
      const hasPendingTasks = dayTasks.some(t => !finishedStates.includes(String(t.status).toUpperCase()));

      return {
        dayKey: key,
        label,
        isToday: key === todayStr,
        isPast: key < todayStr,
        tasks: dayTasks,
        hasPendingTasks
      };
    });

    // 1. Try to restore the previously selected day by KEY
    if (this.selectedDayKey) {
      const restoredIdx = this.groupedTasksByDay.findIndex(d => d.dayKey === this.selectedDayKey);
      if (restoredIdx >= 0) {
        this.selectedDayIndex = restoredIdx;
        return;
      }
    }

    // 2. Fallback to Today or closest
    const todayIdx = this.groupedTasksByDay.findIndex(d => d.isToday);
    this.selectedDayIndex = todayIdx >= 0 ? todayIdx : Math.max(0, this.groupedTasksByDay.length - 1);
    this.selectedDayKey = this.groupedTasksByDay[this.selectedDayIndex]?.dayKey;
  }


  extractUser() {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        let b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
   b64 = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
   const payload = JSON.parse(atob(b64));
        const emailUser = payload.email?.split('@')[0] || 'Member';
        this.userName = emailUser.charAt(0).toUpperCase() + emailUser.slice(1);
      } catch {}
    }
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    localStorage.setItem('smartpm_member_tab', tab);
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
    // Set guard immediately to prevent race condition restore
    this.justFinishedTaskId = task.id;

    // Optimistic local update: mark as READY_FOR_REVIEW right away
    task.status = 'READY_FOR_REVIEW';
    const taskInAll = this.allTasks.find(t => t.id === task.id);
    if (taskInAll) taskInAll.status = 'READY_FOR_REVIEW';

    // Stop timer and clear activeTask BEFORE backend call
    if (this.activeTask && this.activeTask.id === task.id) {
      this.stopTimer();
      this.timerTime = 0;
      this.activeTask = null;
      this.timerRunning = false;
    }

    this.taskService.updateTaskStatus(task.id, 'READY_FOR_REVIEW').subscribe({
      next: () => {
        this.showToast('✅ Mission Accomplie !', `La tâche "${task.name}" a été envoyée pour revue.`);
        // Delay fetch to avoid race condition with backend commit
        setTimeout(() => this.fetchDashboardData(), 600);
      },
      error: () => {
        // Rollback on error
        this.justFinishedTaskId = null;
        task.status = 'IN_PROGRESS';
        if (taskInAll) taskInAll.status = 'IN_PROGRESS';
        this.showToast('❌ Erreur', 'Impossible de terminer la tâche.');
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
