import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project';
import { TaskService } from '../../services/task';
import { AdminService } from '../../services/admin.service';
import { timeout, catchError, of } from 'rxjs';
import { AiChatbotComponent } from '../ai-chatbot/ai-chatbot';
import { AiToolsPanelComponent } from '../ai-tools-panel/ai-tools-panel';

@Component({
 selector: 'app-project-detail',
 standalone: true,
 imports: [CommonModule, FormsModule, AiChatbotComponent, AiToolsPanelComponent],
 templateUrl: './project-detail.html',
 styleUrls: ['./project-detail.scss']
})
export class ProjectDetail implements OnInit {
 projectId: string | null = null;
 projectData: any = null;
 members: any[] = [];
 isLoading = false;
 errorMessage: string | null = null;

 // Task creation state
 showTaskModal = false;
 selectedSubId: string | null = null;
 newTasks: any[] = [];

 // Doc attachment state
 showDocModal = false;
 useFile = false;
 selectedFile: File | null = null;
 newDoc = { name: '', url: '' };
 
 // Custom Alert state
 customAlert = { show: false, title: '', message: '' };

 today = new Date();

 showAlert(title: string, message: string) {
  this.customAlert = { show: true, title, message };
  this.cdr.detectChanges();
 }

 isDelayed(task: any): boolean {
   if (task.status === 'CLOSED') return false;
   if (!task.plannedEndDate) return false;
   return new Date(task.plannedEndDate) < this.today;
 }

 constructor(
  private route: ActivatedRoute,
  private router: Router,
  private location: Location,
  private projectService: ProjectService,
  private taskService: TaskService,
  private adminService: AdminService,
  private cdr: ChangeDetectorRef
 ) {}

 ngOnInit() {
  document.body.classList.add('no-shell');
  this.projectId = this.route.snapshot.paramMap.get('id');
  console.log("[INIT] ProjectDetail for ID:", this.projectId);
  if (this.projectId) {
   this.loadProjectDetails();
   this.loadMembers();
  } else {
   this.errorMessage = "ID de projet manquant dans l'URL.";
  }
 }

 ngOnDestroy() {
  document.body.classList.remove('no-shell');
 }

 loadProjectDetails() {
  this.isLoading = true;
  this.errorMessage = null;
  this.cdr.detectChanges();
  
  // Standard Aerospace Order (Robust version)
  const PHASE_ORDER: { [key: string]: number } = { 
   'HLR': 1, 'LLR': 2, 'CODE': 3, 'LLT': 4, 'HLT': 5,
   'hlr': 1, 'llr': 2, 'code': 3, 'llt': 4, 'hlt': 5,
   'DESIGN': 3, 'TEST': 4, 'INTEGRATION': 5, 'PLANNING': 0
  };

  this.projectService.getProjectStructure(this.projectId!)
   .pipe(
    timeout(15000),
    catchError(err => {
     console.error("Critical Fetch Error:", err);
     this.errorMessage = "Défaillance de la télémétrie. Vérifiez la structure du projet.";
     this.isLoading = false;
     this.cdr.detectChanges();
     return of(null);
    })
   )
   .subscribe({
    next: (data) => {
     if (!data || !data.activities) {
      console.warn("[WARN] Project has no activities or data is null");
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
     }
     
     try {
      // Log for debugging "incorrect" project
      console.log("[DEBUG] Mapping activities for:", data.project?.name);

      // 1. Sort Activities by Phase
      data.activities.sort((a: any, b: any) => {
       const pA = a.phase || a.name || '';
       const pB = b.phase || b.name || '';
       return (PHASE_ORDER[pA] ?? 99) - (PHASE_ORDER[pB] ?? 99);
      });
      
      // 2. Sort Sub-Activities by Priority
      data.activities.forEach((act: any) => {
       if (act.subActivities) {
        act.subActivities.sort((a: any, b: any) => {
         const getTagOrder = (cat: any) => {
           if (!cat) return 99;
           const c = cat.toLowerCase();
           if (c.includes('creation') || c.includes('création')) return 1;
           if (c.includes('review') || c.includes('revue') || c.includes('verif')) return 2;
           return 3;
         };
         return getTagOrder(a.category) - getTagOrder(b.category);
        });
       }
      });

      this.projectData = data;
     } catch (e) {
      console.error("[CRITICAL] Final Mapping Fail:", e);
     } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
     }
    }
   });
 }

 loadMembers() {
  this.adminService.getAllUsers().subscribe({
   next: (users) => {
    this.members = users.filter((u: any) => u.role === 'MEMBER');
    this.cdr.detectChanges();
   }
  });
 }

 getMemberName(id: any): string {
  if (!id) return 'Assignation...';
  const member = this.members.find(m => m._id === id || m.id === id);
  return member ? `${member.firstName} ${member.lastName}` : 'Membre PM';
 }

 isDocCategory(category: any, phase: string): boolean {
  if (!category || typeof category !== 'string') return false;
  const c = category.toLowerCase();
  
  // Exclusion spécifique pour LLR & HLT : pas de docs pour Creation ou Revue simple
  if (phase === 'LLR' || phase === 'HLT') {
   const isCodeReview = c.includes('code review');
   if (!isCodeReview && (c.includes('creation') || c.includes('création') || c.includes('revue') || c.includes('review'))) {
    return false;
   }
  }

  const docKeywords = ['review', 'architecture', 'revue', 'srs', 'sdd', 'llr', 'hlr', 'verif', 'scenario', 'case'];
  return docKeywords.some(key => c.includes(key));
 }

 // --- Task Operations ---
 openAddTaskModal(subId: string) {
  this.selectedSubId = subId;
  this.newTasks = [{
   title: '',
   estimatedDuration: 1,
   authorId: '',
   reviewerId: '',
   plannedStartDate: new Date().toISOString().slice(0, 16),
   plannedEndDate: '',
   docLink: ''
  }];
  this.showTaskModal = true;
 }

 addTaskRow() {
  this.newTasks.push({
   title: '',
   estimatedDuration: 1,
   authorId: '',
   reviewerId: '',
   plannedStartDate: new Date().toISOString().slice(0, 16),
   plannedEndDate: '',
   docLink: ''
  });
 }

 removeTaskRow(index: number) {
  if (this.newTasks.length > 1) this.newTasks.splice(index, 1);
 }

 closeTaskModal() {
  this.showTaskModal = false;
 }

 onTaskDateChange(index: number) {
  const task = this.newTasks[index];
  if (task.plannedStartDate && task.estimatedDuration) {
   const end = this.calculateEndDate(new Date(task.plannedStartDate), task.estimatedDuration);
   task.plannedEndDate = end.toISOString().slice(0, 16);
  }
 }

 private calculateEndDate(start: Date, hours: number): Date {
  const end = new Date(start.getTime());
  const days = Math.ceil(hours / 7); // 7 working hours per day
  end.setDate(end.getDate() + days);
  return end;
 }

 submitTask() {
  if (!this.selectedSubId) return;
  this.isLoading = true;
  const tasksToCreate = this.newTasks.map(t => ({
   ...t,
   subActivityId: this.selectedSubId,
   projectId: this.projectId,
   evidenceLinks: t.docLink ? [t.docLink] : []
  }));

  this.taskService.createTask(tasksToCreate).subscribe({
   next: () => {
    this.loadProjectDetails();
    this.closeTaskModal();
   },
   error: () => {
     this.isLoading = false;
     this.showAlert("Erreur Fonctions", "Échec de la création des fonctions. Vérifiez la connexion.");
     this.cdr.detectChanges();
   }
  });
 }

 // --- Documentation Operations ---
 openAddDocModal(subId: string) {
  this.selectedSubId = subId;
  this.newDoc = { name: '', url: '' };
  this.selectedFile = null;
  this.showDocModal = true;
 }

 closeDocModal() {
  this.showDocModal = false;
 }

 onFileSelected(event: any) {
  this.selectedFile = event.target.files[0];
 }

 submitDoc() {
  if (!this.selectedSubId) return;
  this.isLoading = true;
  setTimeout(() => {
    this.showAlert("Document", this.useFile ? "Document synchronisé avec succès." : "Lien externe attaché au cockpit.");
    this.loadProjectDetails();
    this.closeDocModal();
    this.isLoading = false;
  }, 1200);
 }

 goBack() {
  this.location.back();
 }
}
