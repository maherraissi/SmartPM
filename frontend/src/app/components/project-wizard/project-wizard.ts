import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-project-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-wizard.html',
  styleUrls: ['./project-wizard.scss']
})
export class ProjectWizard {
  currentStep: number = 1;

  projectData = {
    name: '',
    description: '',
  };

  // DO-178C Predefined Standard Tree
  activities = [
    { 
      id: 'HLR', name: 'High Level Requirements',
      icon: '📝', selected: false,
      subActivities: [
        { id: 'HLR_1', name: 'Requirements Engineering', selected: false },
        { id: 'HLR_2', name: 'System Architecture Design', selected: false }
      ]
    },
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

  nextStep() {
    // Condition to pass Step 1
    if (this.currentStep === 1 && (!this.projectData.name || !this.projectData.description)) {
      alert("Please enter Project Name and Description first.");
      return;
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
    if (!this.newActivityName.trim()) return;
    this.activities.push({
      id: `CUST_${new Date().getTime()}`,
      name: this.newActivityName,
      icon: '✨',
      selected: true,
      subActivities: [
        { id: `CUST_SUB_${new Date().getTime()}`, name: 'Custom Setup Task', selected: true }
      ]
    });
    this.newActivityName = '';
  }

  deployProject() {
    if (!this.isProjectValid) {
      alert("Error: DO-178C Compliance dictates at least one Phase and Sub-Phase must be active.");
      return;
    }
    const selectedTree = this.activities.filter(a => a.selected).map(a => ({
      name: a.name,
      subs: a.subActivities.filter(s => s.selected)
    }));
    
    console.log("✈️ Deploying Final Aerospace Structure:", selectedTree);
    alert("Mission Deployed! AI Engine is generating tasks based on your selection...");
  }
}
