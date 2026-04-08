import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
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

  showCreateUser = false;
  newUser: any = { firstName: '', lastName: '', email: '', password: '', role: 'MEMBER' };
  
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

  // Formations Logic
  activeFormations: any[] = [
    { title: 'Low Level Requirements (LLR)', targetPhase: 'LLR', durationWeeks: 1, quizDurationMinutes: 30, description: 'LLR authoring/review flow.', materials: [] },
    { title: 'Low Level Testing (LLT)', targetPhase: 'LLT', durationWeeks: 2, quizDurationMinutes: 45, description: 'MCDC and Unit testing.', materials: [] },
    { title: 'High Level Testing (HLT)', targetPhase: 'HLT', durationWeeks: 2, quizDurationMinutes: 45, description: 'High Level testing for Aerospace.', materials: [] }
  ];
  assignmentStats: any[] = [];

  showCreateFormation = false;
  newFormation: any = { title: 'LLR', durationWeeks: 1, quizDurationMinutes: 30, description: '', materials: [] };
  tempMaterial: any = { title: '', type: 'VIDEO', url: '' };

  addMaterialToFormation() {
    if (this.tempMaterial.title) {
      this.newFormation.materials.push({ ...this.tempMaterial });
      this.tempMaterial = { title: '', type: 'VIDEO', url: '' };
    }
  }

  saveFormation() {
    this.activeFormations.push({ ...this.newFormation, targetPhase: this.newFormation.title });
    this.showCreateFormation = false;
    this.newFormation = { title: 'LLR', durationWeeks: 1, quizDurationMinutes: 30, description: '', materials: [] };
  }

  openAssignModal(f: any) {
    this.showSuccess(`Assignment manager for ${f.title} is coming soon!`);
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

  constructor(private adminService: AdminService, private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    await this.loadOverview();
  }

  switchTab(tab: TabId) {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    
    // Fire and forget loading to keep UI responsive
    switch (tab) {
      case 'overview':       this.loadOverview();        break;
      case 'users':          this.loadUsers();           break;
      case 'formations':     this.loadFormations();      break;
      case 'alerts':         this.loadAlerts();          break;
      case 'ai':             this.loadAI();              break;
      case 'settings':       this.loadSettings();        break;
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
        role:   this.userRoleFilter,
        isActive: this.userStatusFilter,
        page:   this.userPage,
        limit:  15,
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
    this.newUser = { firstName: '', lastName: '', email: '', password: '', role: 'MEMBER' };
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
        lastName:  this.editingUser.lastName,
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

  // ─── FORMATIONS (Replacing legacy Certs) ──────────────────────────────────
  async loadFormations() {
    this.loading['formations'] = true;
    this.cdr.detectChanges();
    try {
      // 1. Load active formations
      const formations: any = await firstValueFrom(this.adminService.getCompetencyMatrix()); // Re-using service for now or fetch list
      // 2. Load all users to show their status
      const usersRes: any = await firstValueFrom(this.adminService.getUsers({ limit: 100 }));
      const allTeam = usersRes?.users || usersRes || [];
      
      // Filter out Admins, keep Managers and Members
      this.assignmentStats = allTeam
        .filter((u: any) => u.role !== 'ADMIN')
        .map((u: any) => ({
          userName: `${u.firstName} ${u.lastName}`,
          role: u.role,
          formation: u.currentFormation || 'None Assigned',
          progress: u.trainingProgress || 0,
          score: u.lastQuizScore || null,
          status: u.trainingStatus || 'Not Started'
        }));

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
      this.aiStats  = stats  || {};
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
    window.location.href = '/login';
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
}
