import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-project-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-wizard.html',
  styleUrls: ['./project-wizard.scss']
})
export class ProjectWizard {
  private router = inject(Router);
  currentStep: number = 1;
  isDeploying: boolean = false;

  projectData = {
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  };

  // DO-178C Predefined Standard Tree (Updated per User Specs)
  // DO-178C Predefined Standard Tree (Tailored for Aerospace V-Cycle)
  activities = [
    { 
      id: 'LLR', name: 'Low Level Requirements (LLR)',
      icon: '🧩', selected: true, startDate: '', endDate: '',
      subActivities: [
        { id: 'LLR_ARCH', name: 'Architecture Design', selected: true, startDate: '', endDate: '' },
        { id: 'LLR_REV',  name: 'Creation & Revue', selected: true, startDate: '', endDate: '' },
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

    // Condition to pass Step 1
    if (this.currentStep === 1) {
      if (!this.projectData.name || !this.projectData.description || !this.projectData.startDate || !this.projectData.endDate) {
        this.errorMessage = "Veuillez définir le Nom, la Description et les Dates (Début & Fin) du projet.";
        return;
      }
      if (new Date(this.projectData.startDate) > new Date(this.projectData.endDate)) {
        this.errorMessage = "Erreur : La date de fin ne peut pas être antérieure à la date de début.";
        return;
      }
    }
    if (this.currentStep < 3) this.currentStep++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  // Check if at least one Activity and its Sub-Activity is selected
  get isProjectValid(): boolean {
    return this.activities.some(act => 
      act.selected && act.subActivities.some(sub => sub.selected)
    );
  }

  toggleActivity(act: any) {
    act.selected = !act.selected;
    // Auto-select children if turning ON, or turn OFF children if OFF
    act.subActivities.forEach((sub: any) => sub.selected = act.selected);
  }

  toggleSubActivity(sub: any, act: any) {
    sub.selected = !sub.selected;
    // If a sub becomes selected, the parent must be selected logically
    if (sub.selected) {
      act.selected = true;
    }
  }

  addCustomActivity() {
    if (!this.newActivityName.trim() || !this.newActivityStartDate || !this.newActivityEndDate) {
      alert("Veuillez définir le nom et les dates pour la phase personnalisée.");
      return;
    }
    this.activities.push({
      id: `CUST_${new Date().getTime()}`,
      name: this.newActivityName,
      icon: '✨',
      selected: true,
      startDate: this.newActivityStartDate,
      endDate: this.newActivityEndDate,
      subActivities: [
        { 
          id: `CUST_SUB_${new Date().getTime()}`, 
          name: 'Configuration initiale', 
          selected: true,
          startDate: this.newActivityStartDate,
          endDate: this.newActivityEndDate
        }
      ]
    });
    this.newActivityName = '';
  }

  addSubActivity(act: any) {
    this.openModal('input', 'Nouvelle Sous-Activité', `Ajouter une tâche à la phase "${act.name}"`, '', (val) => {
      if (val) {
        act.subActivities.push({
          id: `SUB_${new Date().getTime()}`,
          name: val,
          selected: true,
          startDate: act.startDate || '',
          endDate: act.endDate || ''
        });
        act.selected = true;
      }
    });
  }

  editActivity(act: any) {
    this.openModal('input', 'Modifier l\'Activité', 'Entrez le nouveau nom de la phase :', act.name, (val) => {
      if (val) act.name = val;
    });
  }

  editActivityDates(act: any) {
    this.openModal('dates', 'Calendrier de l\'Activité', `Définir les dates pour "${act.name}"`, '', (res) => {
      if (res) {
        act.startDate = res.start;
        act.endDate = res.end;
      }
    }, act.startDate, act.endDate);
  }

  deleteActivity(act: any) {
    this.openModal('confirm', 'Supprimer l\'Activité', `Voulez-vous vraiment supprimer "${act.name}" ?`, '', () => {
      this.activities = this.activities.filter(a => a !== act);
    });
  }

  editSubActivity(sub: any) {
    this.openModal('input', 'Modifier la Sous-Activité', 'Nouveau nom de la tâche :', sub.name, (val) => {
      if (val) sub.name = val;
    });
  }

  editSubActivityDates(sub: any) {
    this.openModal('dates', 'Calendrier de la Tâche', `Définir les dates pour "${sub.name}"`, '', (res) => {
      if (res) {
        sub.startDate = res.start;
        sub.endDate = res.end;
      }
    }, sub.startDate, sub.endDate);
  }

  deleteSubActivity(sub: any, act: any) {
    this.openModal('confirm', 'Supprimer la Tâche', `Supprimer "${sub.name}" ?`, '', () => {
      act.subActivities = act.subActivities.filter((s: any) => s !== sub);
    });
  }

  async deployProject() {
    if (!this.isProjectValid) {
      alert("Erreur : Vous devez sélectionner au moins une phase et une sous-activité pour continuer.");
      return;
    }
    
    // UI Loading State (AI Simulation & Network Sync)
    this.isDeploying = true;
    
    const selectedTree = this.activities.filter(a => a.selected).map(a => ({
      id: a.id.split('_')[0], // Retain base LLR, LLT, etc.
      name: a.name,
      subs: a.subActivities.filter(s => s.selected)
    }));
    
    const payload = {
      ...this.projectData,
      activities: selectedTree
    };
    
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('http://localhost:3000/projects/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Deploy failed:', err);
        alert(`Erreur de déploiement : ${err?.message || res.status}`);
        this.isDeploying = false;
        return;
      }

      const data = await res.json();
      console.log('🚀 Synchronisation réussie :', data);
      this.isDeploying = false;
      this.router.navigate(['/manager']);
    } catch (err) {
      console.error('Failed to sync to backend:', err);
      alert('Échec de la connexion au serveur.');
      this.isDeploying = false;
    }
  }
}
