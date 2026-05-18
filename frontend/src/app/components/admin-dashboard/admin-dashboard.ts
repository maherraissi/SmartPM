import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { TrainingService } from '../../services/training';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

type TabId = 'overview' | 'users' | 'formations' | 'governance' | 'alerts' | 'ai' | 'settings';

@Component({
 selector: 'app-admin-dashboard',
 standalone: true,
 imports: [CommonModule, FormsModule],
 templateUrl: './admin-dashboard.html',
 styleUrls: ['./admin-dashboard.scss']
})
export class AdminDashboard implements OnInit {
 loading: Record<string, boolean> = {};
 activeTab: TabId = 'overview';

 // Overview
 kpis: any = {};
 snapshot: any = {};

 // Users
 users: any[] = [];
 allUsers: any[] = [];
 userTotal = 0;
 userPage = 1;
 userSearch = '';
 userRoleFilter = '';
 userStatusFilter = '';
 roles = ['ADMIN', 'MANAGER', 'MEMBER'];
 equipes = ['LLR', 'LLT', 'HLT'];

 showCreateUser = false;
 newUser: any = { firstName: '', lastName: '', email: '', password: '', role: 'MEMBER', equipe: '' };
 
 showEditUser = false;
 editingUser: any = null;
 savingUserId: string | null = null;
 
 showResetPass = false;
 newPassword = '';

 // Pro Notification & Confirm State
 errorMessage = '';
 successMessage = '';
 confirmData = { show: false, title: '', message: '', action: null as any };

 showAuditLogs = false;
 auditLogs: any[] = [];

 // ── Formations ─────────────────────────────────────────────────────────────
 activeFormations: any[] = [];
 assignmentStats: any[] = [];

 // Create / Edit formation
 showCreateFormation = false;
 editingFormation: any = null;
 newFormation: any = {
  title: 'LLR', targetPhase: 'LLR', durationWeeks: 1, quizDurationMinutes: 30,
  passingScore: 80, description: '', lessons: [], quiz: []
 };
 // Temp lesson
 tempLesson: any = { name: '', resourceUrl: '', resourceType: 'VIDEO' };
 // Upload state
 uploadingLesson = false;
 uploadProgress = 0;
 uploadedFileName = '';
 // Temp quiz question
 tempQuestion: any = { question: '', options: ['', '', '', ''], correctIndex: 0 };

 addLesson() {
  if (!this.tempLesson.name || !this.tempLesson.resourceUrl) return;
  this.newFormation.lessons.push({ ...this.tempLesson });
  this.tempLesson = { name: '', resourceUrl: '', resourceType: 'VIDEO' };
  this.uploadedFileName = '';
 }
 removeLesson(i: number) { this.newFormation.lessons.splice(i, 1); }

 async handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) return;
  this.uploadingLesson = true;
  this.uploadedFileName = file.name;
  this.uploadProgress = 0;
  try {
   const res: any = await firstValueFrom(this.trainingService.uploadFile(file));
   this.tempLesson.resourceUrl = res.url;
   this.tempLesson.resourceType = res.resourceType;
   this.uploadProgress = 100;
  } catch (e: any) {
   this.errorMessage = e?.error?.message || 'Erreur lors de l\'upload du fichier';
   this.uploadedFileName = '';
  } finally {
   this.uploadingLesson = false;
   input.value = '';
  }
 }

 addQuizQuestion() {
  if (!this.tempQuestion.question || this.tempQuestion.options.some((o: string) => !o.trim())) return;
  this.newFormation.quiz.push({ ...this.tempQuestion, options: [...this.tempQuestion.options] });
  this.tempQuestion = { question: '', options: ['', '', '', ''], correctIndex: 0 };
 }
 removeQuestion(i: number) { this.newFormation.quiz.splice(i, 1); }

 openCreateFormation() {
  this.editingFormation = null;
  this.newFormation = { title: 'LLR', targetPhase: 'LLR', durationWeeks: 1, quizDurationMinutes: 30, passingScore: 80, description: '', lessons: [], quiz: [] };
  this.tempLesson = { name: '', resourceUrl: '', resourceType: 'VIDEO' };
  this.tempQuestion = { question: '', options: ['', '', '', ''], correctIndex: 0 };
  this.showCreateFormation = true;
 }

 openEditFormation(f: any) {
  this.editingFormation = f;
  this.newFormation = {
   title: f.title, targetPhase: f.targetPhase, durationWeeks: f.durationWeeks,
   quizDurationMinutes: f.quizDurationMinutes, passingScore: f.passingScore || 80,
   description: f.description,
   lessons: f.lessons ? [...f.lessons.map((l: any) => ({ ...l }))] : [],
   quiz: f.quiz ? [...f.quiz.map((q: any) => ({ ...q, options: [...q.options] }))] : [],
  };
  this.tempLesson = { name: '', resourceUrl: '', resourceType: 'VIDEO' };
  this.tempQuestion = { question: '', options: ['', '', '', ''], correctIndex: 0 };
  this.showCreateFormation = true;
 }

 async saveFormation() {
  this.newFormation.targetPhase = this.newFormation.title;
  try {
   if (this.editingFormation?._id) {
    await firstValueFrom(this.trainingService.updateFormation(this.editingFormation._id, this.newFormation));
    this.showSuccess('Formation mise à jour !');
   } else {
    await firstValueFrom(this.trainingService.createFormation(this.newFormation));
    this.showSuccess('Formation créée !');
   }
   this.showCreateFormation = false;
   await this.loadFormations();
  } catch (e: any) { this.errorMessage = e?.error?.message || 'Erreur lors de la sauvegarde'; }
 }

 async deleteFormation(f: any) {
  this.confirmAction('Supprimer la formation', `Voulez-vous vraiment supprimer "${f.title}" ?`, async () => {
   await firstValueFrom(this.trainingService.deleteFormation(f._id));
   await this.loadFormations();
   this.showSuccess('Formation supprimée.');
  });
 }

 // ── Assign Modal ──────────────────────────────────────────────────────────────
 showAssignModal = false;
 assigningFormation: any = null;
 assignableUsers: any[] = [];
 selectedUserIds: Set<string> = new Set();

 async openAssignModal(f: any) {
  this.assigningFormation = f;
  this.selectedUserIds = new Set();
  // Load members/managers only
  try {
   const res: any = await firstValueFrom(this.adminService.getUsers({ limit: 100 }));
   this.assignableUsers = (res?.users || res || []).filter((u: any) => u.role !== 'ADMIN');
  } catch (e) { this.assignableUsers = []; }
  this.showAssignModal = true;
 }

 toggleUserSelection(uid: string) {
  this.selectedUserIds.has(uid) ? this.selectedUserIds.delete(uid) : this.selectedUserIds.add(uid);
 }

 async confirmAssign() {
  if (!this.assigningFormation || this.selectedUserIds.size === 0) return;
  try {
   const res: any = await firstValueFrom(
    this.trainingService.assignMembers(this.assigningFormation._id, Array.from(this.selectedUserIds))
   );
   this.showAssignModal = false;
   this.showSuccess(`${res.assigned} membre(s) assigné(s) à la formation.`);
  } catch (e: any) { this.errorMessage = e?.error?.message || 'Erreur d\'assignation'; }
 }

 // ── Transfer Requests ─────────────────────────────────────────────────────────
 transferRequests: any[] = [];
 rejectNoteMap: Record<string, string> = {};

 async loadTransferRequests() {
  try {
   this.transferRequests = await firstValueFrom(this.trainingService.getAllTransferRequests());
  } catch (e) { this.transferRequests = []; }
 }

 async approveTransfer(r: any) {
  this.confirmAction('Approuver le transfert',
   `Approuver le transfert de ${r.userId?.firstName} vers l'équipe ${r.toEquipe} ?`,
   async () => {
    await firstValueFrom(this.trainingService.approveTransfer(r._id));
    await this.loadTransferRequests();
    this.showSuccess('Transfert approuvé — équipe mise à jour.');
   });
 }

 async rejectTransfer(r: any) {
  const note = this.rejectNoteMap[r._id] || 'Demande refusée';
  await firstValueFrom(this.trainingService.rejectTransfer(r._id, note));
  await this.loadTransferRequests();
  this.showSuccess('Demande rejetée.');
 }

 // Alerts
 alerts: any[] = [];
 alertTotal = 0;
 alertPage = 1;
 alertStats: any = {};
 alertFilter = '';
 alertSeverityFilter = '';

 // AI
 aiStatus: any = {};
 aiStats: any = {};
 aiRefreshing = false;

 // Settings
 settings: any = { orgName: '', contactEmail: '', holidays: [] };
 settingsSaving = false;
 newHoliday = '';

 constructor(
  private adminService: AdminService,
  private trainingService: TrainingService,
  private router: Router,
  private cdr: ChangeDetectorRef
 ) {}

 async ngOnInit() {
  // Restore last active tab from localStorage
  const savedTab = localStorage.getItem('smartpm_admin_tab') as TabId;
  if (savedTab) this.activeTab = savedTab;
  await this.loadOverview();
  // Load data for the restored tab if it's not overview
  if (this.activeTab !== 'overview') {
   switch (this.activeTab) {
    case 'users':     this.loadUsers();     break;
    case 'formations':  this.loadFormations(); this.loadTransferRequests(); break;
    case 'alerts':    this.loadAlerts();    break;
    case 'ai':      this.loadAI();      break;
    case 'settings':   this.loadSettings();   break;
   }
  }
 }

 switchTab(tab: TabId) {
  if (this.activeTab === tab) return;
  this.activeTab = tab;
  localStorage.setItem('smartpm_admin_tab', tab); // Persist tab on refresh
  
  // Fire and forget loading to keep UI responsive
  switch (tab) {
   case 'overview':    this.loadOverview();    break;
   case 'users':     this.loadUsers();      break;
   case 'formations':   this.loadFormations(); this.loadTransferRequests(); break;
   case 'alerts':     this.loadAlerts();     break;
   case 'ai':       this.loadAI();       break;
   case 'settings':    this.loadSettings();    break;
  }
  
  this.errorMessage = ''; // Clear errors on tab switch
  this.cdr.detectChanges(); // Immediate UI update for tab switch
 }

 // ─── OVERVIEW ─────────────────────────────────────────────────────────────
 async loadOverview() {
  // Only show full loader if we have no data yet
  if (!this.kpis.totalUsers) this.loading['overview'] = true;
  try {
   const [kpis, snap] = await Promise.all([
    firstValueFrom(this.adminService.getKPIs()),
    firstValueFrom(this.adminService.getGovernanceSnapshot()),
   ]);
   this.kpis = kpis || {};
   this.snapshot = snap || {};
  } catch(err) {
   console.error(err);
  } finally { 
   this.loading['overview'] = false; 
   this.cdr.detectChanges();
  }
 }

 getRoleData() { return this.snapshot?.roles || []; }
 getCertData() { return this.snapshot?.certifications || []; }
 getSnapshotAlerts() { return this.snapshot?.recentAlerts || []; }

 // ─── USERS ────────────────────────────────────────────────────────────────
 async loadUsers() {
  // Optimization: Only show full loading card if user list is empty
  if (this.users.length === 0) {
   this.loading['users'] = true;
  }
  this.cdr.detectChanges();
  console.log('Fetching users...');
  try {
   const res: any = await firstValueFrom(this.adminService.getUsers({
    search: this.userSearch,
    role:  this.userRoleFilter,
    isActive: this.userStatusFilter,
    page:  this.userPage,
    limit: 15,
   }));
   console.log('Users res:', res);
   if (Array.isArray(res)) {
    this.users = res;
    this.userTotal = res.length;
   } else if (res && res.users) {
    this.users = res.users;
    this.userTotal = res.total || res.users.length;
   } else {
    this.users = [];
    this.userTotal = 0;
   }
   this.allUsers = [...this.users];
  } catch (err: any) {
   console.error('Error loading users:', err);
   this.users = [];
   this.userTotal = 0;
  } finally { 
   this.loading['users'] = false; 
   this.cdr.detectChanges();
  }
 }

 async searchUsers() { this.userPage = 1; await this.loadUsers(); }

 async createUser() {
  if (!this.newUser.firstName || !this.newUser.email || !this.newUser.password) {
   this.errorMessage = 'Please fill in all mandatory fields.';
   this.cdr.detectChanges();
   return;
  }
  if (this.newUser.password.length < 8) {
   this.errorMessage = 'Password must be at least 8 characters long for security.';
   this.cdr.detectChanges();
   return;
  }
  this.errorMessage = '';
  this.loading['createUser'] = true;
  try {
   await firstValueFrom(this.adminService.createUser(this.newUser));
   this.showCreateUser = false;
   this.newUser = { firstName: '', lastName: '', email: '', password: '', role: 'MEMBER' };
   this.showSuccess('User created successfully!');
   await this.loadUsers();
  } catch(e) { 
   this.errorMessage = 'Failed to create user. Email may be already in use.';
   this.cdr.detectChanges();
  }
  finally { this.loading['createUser'] = false; }
 }

 openCreateUser() {
  this.newUser = { firstName: '', lastName: '', email: '', password: '', role: 'MEMBER', equipe: '' };
  this.errorMessage = '';
  this.showCreateUser = true;
  this.cdr.detectChanges();
 }

 openEditUser(u: any) { 
  this.editingUser = { ...u }; 
  this.errorMessage = '';
  this.showEditUser = true; 
  this.cdr.detectChanges();
 }
 
 async saveEditUser() {
  if (!this.editingUser) return;
  this.loading['editUser'] = true;
  try {
   await firstValueFrom(this.adminService.updateUser(this.editingUser._id, {
    firstName: this.editingUser.firstName,
    lastName: this.editingUser.lastName,
    equipe: this.editingUser.equipe,
   }));
   this.showEditUser = false;
   this.showSuccess('Profile updated!');
   await this.loadUsers();
  } catch(e) { 
   this.errorMessage = 'Update failed. System error.'; 
   this.cdr.detectChanges();
  }
  finally { this.loading['editUser'] = false; }
 }

 async updateRole(user: any) {
  this.savingUserId = user._id;
  try { await firstValueFrom(this.adminService.assignRole(user._id, user.role)); }
  finally { this.savingUserId = null; }
 }

 async updateEquipe(user: any) {
  this.savingUserId = user._id;
  try { await firstValueFrom(this.adminService.updateUser(user._id, { equipe: user.equipe })); }
  finally { this.savingUserId = null; }
 }

 async toggleActive(user: any) {
  try {
   if (user.isActive) await firstValueFrom(this.adminService.deactivateUser(user._id));
   else await firstValueFrom(this.adminService.activateUser(user._id));
   await this.loadUsers();
  } catch(e) { console.error(e); }
 }

 async deleteUser(id: string) {
  this.confirmAction('Delete User Account', 'Are you sure you want to delete this user? This action is permanent.', async () => {
   await firstValueFrom(this.adminService.deleteUser(id));
   await this.loadUsers();
  });
 }

 openResetPass(u: any) { 
  this.editingUser = u; 
  this.newPassword = ''; 
  this.errorMessage = '';
  this.showResetPass = true; 
  this.cdr.detectChanges();
 }
 async doResetPass() {
  if (!this.newPassword || !this.editingUser) return;
  if (this.newPassword.length < 8) {
   this.errorMessage = 'Password must be at least 8 characters long.';
   this.cdr.detectChanges();
   return;
  }
  this.errorMessage = '';
  try {
   await firstValueFrom(this.adminService.resetPassword(this.editingUser._id, this.newPassword));
   this.showResetPass = false;
   this.showSuccess('Password updated successfully!');
  } catch(e) { 
   console.error(e);
   this.errorMessage = 'Reset failed. System error.';
  }
 }

 async loadAuditLogs() {
  this.showAuditLogs = true;
  try {
   const res: any = await firstValueFrom(this.adminService.getAuditLogs(1));
   this.auditLogs = res?.logs || [];
  } catch(e) { console.error(e); this.auditLogs = []; }
 }

 // ─── FORMATIONS ───────────────────────────────────────────────────────────
 async loadFormations() {
  this.loading['formations'] = true;
  this.cdr.detectChanges();
  try {
   const [formations, allProgress, usersRes]: any = await Promise.all([
    firstValueFrom(this.trainingService.getAllFormations()),
    firstValueFrom(this.trainingService.getAllUsersProgress()).catch(() => []),
    firstValueFrom(this.adminService.getUsers({ limit: 100 })),
   ]);
   this.activeFormations = formations || [];

   const allTeam = (usersRes?.users || usersRes || []).filter((u: any) => u.role !== 'ADMIN');
   // Build assignment stats per user
   this.assignmentStats = allTeam.map((u: any) => {
    const records = (allProgress || []).filter((r: any) => r.userId?._id === u._id || r.userId === u._id);
    const completed = records.filter((r: any) => r.status === 'COMPLETED').length;
    const latest = records.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
    return {
     _id: u._id,
     userName: `${u.firstName} ${u.lastName}`,
     role: u.role,
     equipe: u.equipe || '—',
     formation: latest?.trainingId?.title || 'None Assigned',
     progress: latest?.progress || 0,
     score: latest?.quizScore ?? null,
     status: latest?.status || 'Not Started',
     completedCount: completed,
    };
   });
  } catch(e) {
   console.error(e);
  } finally {
   this.loading['formations'] = false;
   this.cdr.detectChanges();
  }
 }

 // ─── ALERTS ───────────────────────────────────────────────────────────────
 async loadAlerts() {
  this.loading['alerts'] = true;
  this.cdr.detectChanges();
  try {
   const [res, stats]: any = await Promise.all([
    firstValueFrom(this.adminService.getAlerts({
     status: this.alertFilter,
     severity: this.alertSeverityFilter,
     page: this.alertPage,
    })),
    firstValueFrom(this.adminService.getAlertStats()),
   ]);
   this.alerts = res?.alerts || [];
   this.alertTotal = res?.total || this.alerts.length;
   this.alertStats = stats || {};
  } catch(e) { console.error(e); }
  finally { 
   this.loading['alerts'] = false; 
   this.cdr.detectChanges();
  }
 }

 async resolveAlert(id: string) {
  this.confirmAction('Resolve Alert', 'Are you sure you want to resolve this compliance alert?', async () => {
   await firstValueFrom(this.adminService.resolveAlert(id, 'Resolved by Admin'));
   await this.loadAlerts();
   this.showSuccess('Alert resolved.');
  });
 }

 async ignoreAlert(id: string) {
  this.confirmAction('Ignore Alert', 'This alert will be hidden but remains in the database. Continue?', async () => {
   await firstValueFrom(this.adminService.ignoreAlert(id));
   await this.loadAlerts();
   this.showSuccess('Alert ignored.');
  });
 }

 // ─── AI MONITORING ────────────────────────────────────────────────────────
 async loadAI() {
  this.loading['ai'] = true;
  await this.refreshAI();
  this.loading['ai'] = false;
 }

 async refreshAI() {
  this.aiRefreshing = true;
  try {
   const [status, stats] = await Promise.all([
    firstValueFrom(this.adminService.getAIStatus()),
    firstValueFrom(this.adminService.getAIStats()),
   ]);
   this.aiStatus = status || {};
   this.aiStats = stats || {};
  } catch(e) { console.error(e); }
  finally { 
   this.aiRefreshing = false; 
   this.cdr.detectChanges();
  }
 }

 // ─── SETTINGS ─────────────────────────────────────────────────────────────
 async loadSettings() {
  this.loading['settings'] = true;
  this.cdr.detectChanges();
  try {
   this.settings = await firstValueFrom(this.adminService.getSettings());
   if (!this.settings.holidays) this.settings.holidays = [];
  } catch(e) { console.error(e); }
  finally { 
   this.loading['settings'] = false; 
   this.cdr.detectChanges();
  }
 }

 async saveSettings() {
  this.settingsSaving = true;
  try {
   await firstValueFrom(this.adminService.updateSettings(this.settings));
   this.showSuccess('Settings updated successfully!');
  } catch(e) { 
   console.error(e);
   this.errorMessage = 'Configuration update failed.';
  }
  finally { this.settingsSaving = false; }
 }

 async addHoliday() {
  if (!this.newHoliday) return;
  try {
   await firstValueFrom(this.adminService.addHoliday(this.newHoliday));
   this.newHoliday = '';
   await this.loadSettings();
  } catch(e) { console.error(e); }
 }

 async removeHoliday(date: string) {
  this.confirmAction('Remove Holiday', `Are you sure you want to remove ${date} from holidays?`, async () => {
   await firstValueFrom(this.adminService.removeHoliday(date));
   await this.loadSettings();
   this.showSuccess('Holiday removed.');
  });
 }

 // ─── UTILS ────────────────────────────────────────────────────────────────
 trackById(i: number, item: any) { return item._id; }
 getInitials(u: any) { return (u?.firstName?.charAt(0) || '') + (u?.lastName?.charAt(0) || ''); }
 formatDate(d: string) { return d ? new Date(d).toLocaleDateString() : '—'; }
 formatTime(d: string) { return d ? new Date(d).toLocaleString() : '—'; }
 
 getSeverityClass(s: string) {
  return { CRITICAL: 'sev-critical', HIGH: 'sev-high', MEDIUM: 'sev-medium', LOW: 'sev-low' }[s] || 'sev-low';
 }
 getStatusClass(s: string) {
  return { OPEN: 'status-open', RESOLVED: 'status-resolved', IGNORED: 'status-ignored', PENDING: 'status-pending', APPROVED: 'status-approved', REJECTED: 'status-rejected' }[s] || '';
 }
 getServiceClass(s: string) {
  if (!s) return 'sc-warn';
  if (s.toLowerCase().includes('ok') || s === 'Online' || s === 'Available') return 'sc-ok';
  if (s.toLowerCase().includes('error') || s === 'Offline') return 'sc-error';
  return 'sc-warn';
 }

 logout() {
  localStorage.removeItem('token');
  this.router.navigate(['/login']);
 }

 // ─── NOTIFICATIONS & CONFIRM ──────────────────────────────────────────────
 confirmAction(title: string, message: string, action: () => Promise<void>) {
  this.confirmData = { show: true, title, message, action };
 }
 async executeConfirm() {
  const action = this.confirmData.action;
  this.confirmData.show = false; // Close first for better UX
  if (action) {
   try {
    await action();
   } catch (e) {
    console.error('Action failed:', e);
   }
  }
 }
 closeConfirm() { this.confirmData.show = false; }
 showSuccess(msg: string) {
  this.successMessage = msg;
  setTimeout(() => this.successMessage = '', 4000);
 }

 // ── 📊 Training Analytics Getter ─────────────────────────────────────────────
 get trainingAnalytics() {
  const stats = this.assignmentStats;
  if (!stats.length) return null;
  const total = stats.length;
  const completed  = stats.filter((s: any) => s.status === 'COMPLETED').length;
  const inProgress = stats.filter((s: any) => s.status === 'IN_PROGRESS').length;
  const failed     = stats.filter((s: any) => s.status === 'FAILED').length;
  const assigned   = stats.filter((s: any) => s.status === 'ASSIGNED' || s.status === 'Not Started').length;
  const withScore  = stats.filter((s: any) => s.score !== null && s.score !== undefined);
  const avgScore   = withScore.length
    ? Math.round(withScore.reduce((a: number, b: any) => a + b.score, 0) / withScore.length)
    : 0;

  const fMap: Record<string, { title: string; completed: number; total: number }> = {};
  for (const s of stats) {
   const key = s.formation || 'Non assignée';
   if (!fMap[key]) fMap[key] = { title: key, completed: 0, total: 0 };
   fMap[key].total++;
   if (s.status === 'COMPLETED') fMap[key].completed++;
  }

  return {
   total, completed, inProgress, failed, assigned,
   completionRate: Math.round((completed / total) * 100),
   avgScore,
   formations: Object.values(fMap).slice(0, 5)
  };
 }
}
