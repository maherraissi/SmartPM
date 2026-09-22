import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService, User } from '../../services/user';
import { environment } from '../../../environments/environment';
import { ProjectService } from '../../services/project';

@Component({
 selector: 'app-project-wizard',
 standalone: true,
 imports: [CommonModule, FormsModule],
 templateUrl: './project-wizard.html',
 styleUrls: ['./project-wizard.scss']
})
export class ProjectWizard implements OnInit {
 public router = inject(Router);
 private route = inject(ActivatedRoute);
 private userService = inject(UserService);
 private projectService = inject(ProjectService);
 
 currentStep: number = 1;
 isDeploying: boolean = false;
 deploymentSuccess: boolean = false;
 newProjectId: string = '';
 isEditMode: boolean = false;
 editingProjectId: string = '';

 
 availableMembers: User[] = [];
 selectedMemberIds: string[] = [];

 projectData = {
  name: '',
  description: '',
  startDate: '',
  endDate: ''
 };

 ngOnInit() {
  this.fetchMembers();
  this.route.queryParams.subscribe(params => {
   if (params['edit']) {
    this.isEditMode = true;
    this.editingProjectId = params['edit'];
    this.loadProjectData(this.editingProjectId);
   }
  });
 }

 loadProjectData(id: string) {
  this.projectService.getProjectStructure(id).subscribe({
   next: (data: any) => {
    this.projectData = {
     name: data.name,
     description: data.description,
     startDate: data.targetStartDate?.split('T')[0] || '',
     endDate: data.targetEndDate?.split('T')[0] || ''
    };
    this.selectedMemberIds = data.teamMembers || [];
    // Map activities if needed, but for now we focus on basic info
   }
  });
 }

 fetchMembers() {
  (this.userService.getAllUsers() as any).subscribe({
   next: (users: User[]) => {
    this.availableMembers = users.filter((u: User) => u.role === 'MEMBER');
   }
  });
 }

 toggleMember(id: string) {
  if (this.selectedMemberIds.includes(id)) {
   this.selectedMemberIds = this.selectedMemberIds.filter(mid => mid !== id);
  } else {
   this.selectedMemberIds.push(id);
  }
 }

 // ... (rest of activities data)
 activities = [
  { 
   id: 'LLR', name: 'Low Level Requirements (LLR)',
   icon: '🧩', selected: true, startDate: '', endDate: '',
   subActivities: [
    { id: 'LLR_ARCH', name: 'Architecture Design', selected: true, startDate: '', endDate: '' },
    { id: 'LLR_REV', name: 'Creation & Revue', selected: true, startDate: '', endDate: '' },
    { id: 'LLR_CODE', name: 'Code Review', selected: true, startDate: '', endDate: '' }
   ]
  },
  { 
   id: 'LLT', name: 'Low Level Testing (LLT)',
   icon: '🧪', selected: false, startDate: '', endDate: '',
   subActivities: [
    { id: 'LLT_CRV', name: 'Creation & Revue', selected: false, startDate: '', endDate: '' }
   ]
  },
  { 
   id: 'HLT', name: 'High Level Testing (HLT)',
   icon: '✈️', selected: false, startDate: '', endDate: '',
   subActivities: [
    { id: 'HLT_TCH', name: 'Create Test Cases from HLR', selected: false, startDate: '', endDate: '' },
    { id: 'HLT_DSC', name: 'Define Scenarios & Cases', selected: false, startDate: '', endDate: '' }
   ]
  }
 ];

 newActivityName: string = '';
 newActivityStartDate: string = '';
 newActivityEndDate: string = '';

 // 🎭 Modal State
 modal = {
  show: false,
  type: 'confirm' as 'confirm' | 'input' | 'dates',
  title: '',
  message: '',
  value: '',
  startDate: '',
  endDate: '',
  callback: null as ((val?: any) => void) | null
 };

 openModal(type: 'confirm' | 'input' | 'dates', title: string, message: string, defaultValue: string = '', callback: (val?: any) => void, start: string = '', end: string = '') {
  this.modal = { show: true, type, title, message, value: defaultValue, startDate: start, endDate: end, callback };
 }

 closeModal() {
  this.modal.show = false;
 }

 executeModal() {
  if (this.modal.callback) {
   if (this.modal.type === 'input') {
    this.modal.callback(this.modal.value);
   } else if (this.modal.type === 'dates') {
    this.modal.callback({ start: this.modal.startDate, end: this.modal.endDate });
   } else {
    this.modal.callback();
   }
  }
  this.closeModal();
 }

 errorMessage: string = '';

 nextStep() {
  this.errorMessage = '';

  if (this.currentStep === 1) {
   if (!this.projectData.name || !this.projectData.description || !this.projectData.startDate || !this.projectData.endDate) {
    this.errorMessage = "Veuillez définir le Nom, la Description et les Dates.";
    return;
   }
  }
  
  if (this.currentStep === 2) {
    if (this.selectedMemberIds.length === 0) {
      this.errorMessage = "Vous devez sélectionner au moins un membre pour l'équipe.";
      return;
    }
  }

  if (this.currentStep < 4) this.currentStep++;
  window.scrollTo({ top: 0, behavior: 'smooth' });
 }

 prevStep() {
  if (this.currentStep > 1) this.currentStep--;
 }

 get isProjectValid(): boolean {
  return this.activities.some(act => 
   act.selected && act.subActivities.some(sub => sub.selected)
  ) && this.selectedMemberIds.length > 0;
 }

 toggleActivity(act: any) {
  act.selected = !act.selected;
  act.subActivities.forEach((sub: any) => sub.selected = act.selected);
 }

 toggleSubActivity(sub: any, act: any) {
  sub.selected = !sub.selected;
  if (sub.selected) act.selected = true;
 }

 addCustomActivity() {
  if (!this.newActivityName.trim() || !this.newActivityStartDate || !this.newActivityEndDate) {
   this.openModal('confirm', 'Données Manquantes', "Veuillez définir le nom et les dates de l'activité.", '', () => {});
   return;
  }
  this.activities.push({
   id: `CUST_${new Date().getTime()}`,
   name: this.newActivityName,
   icon: '✨',
   selected: true,
   startDate: this.newActivityStartDate,
   endDate: this.newActivityEndDate,
   subActivities: [{ id: `C_S_${new Date().getTime()}`, name: 'Init', selected: true, startDate: this.newActivityStartDate, endDate: this.newActivityEndDate }]
  });
  this.newActivityName = '';
 }

 addSubActivity(act: any) {
  this.openModal('input', 'Nouvelle Sous-Activité', `Ajouter à "${act.name}"`, '', (val) => {
   if (val) {
    act.subActivities.push({ id: `S_${new Date().getTime()}`, name: val, selected: true, startDate: '', endDate: '' });
    act.selected = true;
   }
  });
 }

 editActivity(act: any) {
  this.openModal('input', 'Modifier', 'Nom :', act.name, (val) => { if (val) act.name = val; });
 }

 editActivityDates(act: any) {
  this.openModal('dates', 'Dates', `Dates pour "${act.name}"`, '', (res) => {
   if (res) { act.startDate = res.start; act.endDate = res.end; }
  }, act.startDate, act.endDate);
 }

 deleteActivity(act: any) {
  this.openModal('confirm', 'Supprimer', `Supprimer "${act.name}" ?`, '', () => {
   this.activities = this.activities.filter(a => a !== act);
  });
 }

 editSubActivity(sub: any) {
  this.openModal('input', 'Modifier', 'Nom :', sub.name, (val) => { if (val) sub.name = val; });
 }

 deleteSubActivity(sub: any, act: any) {
  this.openModal('confirm', 'Supprimer', `Supprimer "${sub.name}" ?`, '', () => {
   act.subActivities = act.subActivities.filter((s: any) => s !== sub);
  });
 }

 async deployProject() {
  const hasActivity = this.activities.some(a => a.selected && a.subActivities.some((s: any) => s.selected));
  const hasMembers = this.selectedMemberIds.length > 0;

  if (!hasActivity || !hasMembers) {
   this.openModal('confirm', 'Erreur de Validation', `Projet invalide.\n- Activités sélectionnées: ${hasActivity}\n- Membres sélectionnés: ${hasMembers}`, '', () => {});
   return;
  }

  this.isDeploying = true;
  const selectedTree = this.activities.filter(a => a.selected).map(a => ({
   id: a.id.split('_')[0],
   name: a.name,
   subActivities: a.subActivities.filter((s: any) => s.selected).map((s: any) => ({ name: s.name }))
  }));

  const payload = {
   ...this.projectData,
   teamMembers: this.selectedMemberIds,
   activities: selectedTree
  };

  console.log('[DEPLOY] Payload envoyé:', JSON.stringify(payload, null, 2));

  const endpoint = this.isEditMode ? `${environment.apiUrl}/projects/${this.editingProjectId}` : `${environment.apiUrl}/projects/deploy`;
  const method = this.isEditMode ? 'POST' : 'POST'; // Backend controller has @Post(':id') for update too

  try {
   const token = localStorage.getItem('token') || '';
   const res = await fetch(endpoint, {
    method: method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload)
   });

   console.log('[DEPLOY] Réponse HTTP status:', res.status);

   if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
     const err = await res.json();
     console.error('[DEPLOY] Erreur backend:', err);
     errMsg = err?.message || errMsg;
    } catch {
     const text = await res.text();
     console.error('[DEPLOY] Erreur texte brut:', text);
     errMsg = text || errMsg;
    }
    this.openModal('confirm', 'Erreur Déploiement', errMsg, '', () => {});
    this.isDeploying = false;
    return;
   }

   const data = await res.json();
   console.log('[DEPLOY] Succès:', data);
   this.isDeploying = false;
   this.deploymentSuccess = true;
   this.newProjectId = data.projectId;
   
   // Auto-navigation after 2s or user click
   setTimeout(() => {
    if (this.deploymentSuccess) this.finishWizard();
   }, 3000);

  } catch (err) {
   console.error('[DEPLOY] Exception réseau:', err);
   this.openModal('confirm', 'Échec Réseau', (err as any)?.message || String(err), '', () => {});
   this.isDeploying = false;
  }
 }

 finishWizard() {
  if (this.newProjectId) {
   this.router.navigate(['/manager/project', this.newProjectId]);
  } else {
   this.router.navigate(['/manager']);
  }
 }

 logout() {
  localStorage.removeItem('token');
  this.router.navigate(['/login']);
 }
}

