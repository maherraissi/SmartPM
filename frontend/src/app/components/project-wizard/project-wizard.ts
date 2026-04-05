import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-project-wizard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-wizard.html',
  styleUrls: ['./project-wizard.scss']
})
export class ProjectWizard {
  currentStep: number = 1;

  projectData = {
    name: '',
    description: '',
    vCycle: ''
  };

  phases = [
    { id: 'HLR', name: 'High Level Requirements', icon: '📝' },
    { id: 'LLR', name: 'Low Level Requirements', icon: '🧩' },
    { id: 'CODE', name: 'Coding & Architecture', icon: '💻' },
    { id: 'LLT', name: 'Low Level Testing', icon: '🧪' },
    { id: 'HLT', name: 'High Level Testing', icon: '✈️' }
  ];

  nextStep() {
    if (this.currentStep < 3) this.currentStep++;
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  selectPhase(phaseId: string) {
    this.projectData.vCycle = phaseId;
  }

  deployProject() {
    console.log("✈️ Deploying Project DO-178C...", this.projectData);
    alert("Project Generated! 60 DO-178C Functions injected into the Matrix.");
  }
}
