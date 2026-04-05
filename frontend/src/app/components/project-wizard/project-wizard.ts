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

  // DO-178C Predefined Standard Tree
  activities = [
    { 
      id: 'LLR', name: 'Low Level Requirements',
      icon: '🧩', selected: false,
      subActivities: [
        { id: 'LLR_1', name: 'Detailed Software Design', selected: false },
        { id: 'LLR_2', name: 'Code Construction', selected: false },
        { id: 'LLR_3', name: 'Peer Review', selected: false }
      ]
    },
    { 
      id: 'LLT', name: 'Low Level Testing',
      icon: '🧪', selected: false,
      subActivities: [
        { id: 'LLT_1', name: 'Unit Testing', selected: false },
        { id: 'LLT_2', name: 'Coverage Run (MCDC)', selected: false }
      ]
    },
    { 
      id: 'HLT', name: 'High Level Testing',
      icon: '✈️', selected: false,
      subActivities: [
        { id: 'HLT_1', name: 'Integration Testing', selected: false },
        { id: 'HLT_2', name: 'Hardware-in-the-Loop (HIL)', selected: false }
      ]
    }
  ];

  newActivityName: string = '';
  newActivityStartDate: string = '';
  newActivityEndDate: string = '';

  nextStep() {
    // Condition to pass Step 1
    if (this.currentStep === 1) {
      if (!this.projectData.name || !this.projectData.description || !this.projectData.startDate || !this.projectData.endDate) {
        alert("Please explicitly define Project Name, Description, and its Timeframe (Start & End Dates).");
        return;
      }
      if (new Date(this.projectData.startDate) > new Date(this.projectData.endDate)) {
        alert("Error: End Date cannot be before Start Date.");
        return;
      }
    }
    if (this.currentStep < 3) this.currentStep++;
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
      alert("Please define the Name and Timeframe (Dates) for the Custom Activity.");
      return;
    }
    this.activities.push({
      id: `CUST_${new Date().getTime()}`,
      name: this.newActivityName + ` (${this.newActivityStartDate} to ${this.newActivityEndDate})`,
      icon: '✨',
      selected: true,
      subActivities: [
        { id: `CUST_SUB_${new Date().getTime()}`, name: 'Custom Setup Task', selected: true }
      ]
    });
    this.newActivityName = '';
    this.newActivityStartDate = '';
    this.newActivityEndDate = '';
  }

  deployProject() {
    if (!this.isProjectValid) {
      alert("Error: DO-178C Compliance dictates at least one Phase and Sub-Phase must be active.");
      return;
    }
    
    // UI Loading State (AI Simulation)
    this.isDeploying = true;
    
    setTimeout(() => {
      this.isDeploying = false;
      this.router.navigate(['/manager']);
    }, 2500);
  }
}
