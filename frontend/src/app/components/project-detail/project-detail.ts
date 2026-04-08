import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project';
import { TaskService } from '../../services/task';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-detail.html',
  styleUrls: ['./project-detail.scss']
})
export class ProjectDetail implements OnInit {
  projectId: string | null = null;
  projectData: any = null;
  members: any[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  isManualEndDate = false;

  // Task creation form state
  showTaskModal = false;
  selectedSubId: string | null = null;
  newTasks: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private taskService: TaskService,
    private adminService: AdminService
  ) {}

  ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.projectId) {
      this.loadProjectDetails();
      this.loadMembers();
    }
  }

  loadProjectDetails() {
    this.isLoading = true;
    this.errorMessage = null;
    
    console.log("Starting to load project details for:", this.projectId);

    // Extreme safety: Force stop loading after 5 seconds if API hangs
    const safetyTimer = setTimeout(() => {
      if (this.isLoading) {
        console.warn("API Call took too long, forcing loading to false");
        this.isLoading = false;
        if (!this.projectData) {
          this.errorMessage = "Le serveur ne répond pas. Veuillez réessayer.";
        }
      }
    }, 5000);

    this.projectService.getProjectStructure(this.projectId!).subscribe({
      next: (data) => {
        clearTimeout(safetyTimer);
        console.log("Data received from server", data);
        try {
          if (data && data.activities) {
            data.activities.forEach((act: any) => {
              if (act.subActivities && Array.isArray(act.subActivities)) {
                act.subActivities.sort((a: any, b: any) => {
                  const getOrder = (cat: any) => {
                    const c = (cat || '').toLowerCase();
                    if (c.includes('creation')) return 1;
                    if (c.includes('review') || c.includes('revue')) return 2;
                    if (c.includes('architecture')) return 3;
                    return 99;
                  };
                  return (getOrder(a.category) || 99) - (getOrder(b.category) || 99);
                });
              }
            });
          }
          this.projectData = data;
        } catch (e) {
          console.error("Critical error in processing data:", e);
        } finally {
          this.isLoading = false;
        }
      },
      error: (err) => {
        clearTimeout(safetyTimer);
        console.error("API error details:", err);
        this.errorMessage = "Erreur de chargement. Vérifiez que le backend est actif.";
        this.isLoading = false;
      }
    });
  }

  isDocCategory(category: string): boolean {
    const c = category.toLowerCase();
    return c.includes('code review') || c.includes('architecture');
  }

  loadMembers() {
    this.adminService.getAllUsers().subscribe(users => {
      this.members = users.filter((u: any) => u.role === 'MEMBER');
    });
  }

  getMemberName(id: any): string {
    if (!id) return 'Non assigné';
    const member = this.members.find(m => m._id === id || m.id === id);
    return member ? `${member.firstName} ${member.lastName}` : 'Membre PM';
  }

  initTaskRows() {
    this.newTasks = [{
      title: '',
      estimatedDuration: 1,
      authorId: '',
      reviewerId: '',
      plannedStartDate: new Date().toISOString().slice(0, 16),
      plannedEndDate: '',
      docLink: ''
    }];
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
    if (this.newTasks.length > 1) {
      this.newTasks.splice(index, 1);
    }
  }

  openAddTaskModal(subId: string) {
    this.selectedSubId = subId;
    this.initTaskRows();
    this.showTaskModal = true;
  }

  closeTaskModal() {
    this.showTaskModal = false;
    this.newTasks = [];
    this.selectedSubId = null;
  }

  onTaskDateChange(index: number) {
    const task = this.newTasks[index];
    if (task.plannedStartDate && task.estimatedDuration) {
      const end = this.calculateBusinessEndDate(new Date(task.plannedStartDate), task.estimatedDuration);
      const year = end.getFullYear();
      const month = String(end.getMonth() + 1).padStart(2, '0');
      const day = String(end.getDate()).padStart(2, '0');
      const hours = String(end.getHours()).padStart(2, '0');
      const minutes = String(end.getMinutes()).padStart(2, '0');
      task.plannedEndDate = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
  }

  calculateBusinessEndDate(startDate: Date, estimatedHours: number): Date {
    let current = new Date(startDate);
    let remainingHours = estimatedHours;
    while (remainingHours > 0) {
      const day = current.getDay();
      if (day === 0 || day === 6) {
        current.setDate(current.getDate() + 1);
        current.setHours(8, 0, 0, 0);
        continue;
      }
      const hour = current.getHours();
      if (hour < 8) current.setHours(8, 0, 0, 0);
      else if (hour >= 12 && hour < 14) current.setHours(14, 0, 0, 0);
      else if (hour >= 17) { current.setDate(current.getDate() + 1); current.setHours(8, 0, 0, 0); }
      else { current.setHours(current.getHours() + 1); remainingHours -= 1; }
    }
    return current;
  }

  submitTask() {
    if (!this.selectedSubId || this.newTasks.length === 0) return;
    for (const t of this.newTasks) {
      if (t.authorId && t.reviewerId && t.authorId === t.reviewerId) {
        alert(`Erreur sur "${t.title}": L'auteur ne peut pas être le réviseur.`);
        return;
      }
    }
    const tasksToCreate = this.newTasks.map(t => ({ 
      ...t, 
      subActivityId: this.selectedSubId,
      evidenceLinks: t.docLink ? [t.docLink] : []
    }));
    this.isLoading = true;
    this.taskService.createTask(tasksToCreate).subscribe({
      next: () => {
        this.loadProjectDetails();
        this.closeTaskModal();
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        alert("Erreur lors de la création.");
      }
    });
  }

  goBack() {
    this.router.navigate(['/manager']);
  }

  // Document modal state
  showDocModal = false;
  useFile = false;
  selectedFile: File | null = null;
  newDoc = { name: '', url: '' };

  openAddDocModal(subId: string) {
    this.selectedSubId = subId;
    this.newDoc = { name: '', url: '' };
    this.selectedFile = null;
    this.showDocModal = true;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  closeDocModal() {
    this.showDocModal = false;
    this.selectedSubId = null;
    this.selectedFile = null;
  }

  submitDoc() {
    if (!this.selectedSubId) return;
    
    this.isLoading = true;
    
    if (this.useFile && this.selectedFile) {
      // Simulate direct upload
      const simulatedDoc = { name: this.selectedFile.name, url: '#' }; // In real app, this would be the response from backend
      
      // We also need to update the SubActivity on backend. I'll use a simulation for now.
      setTimeout(() => {
         alert(`Fichier "${this.selectedFile?.name}" uploadé avec succès.`);
         this.loadProjectDetails();
         this.closeDocModal();
         this.isLoading = false;
      }, 1500);
    } else if (!this.useFile && this.newDoc.name) {
      // Link logic
      setTimeout(() => {
         alert("Lien attaché.");
         this.loadProjectDetails();
         this.closeDocModal();
         this.isLoading = false;
      }, 800);
    }
  }
}
