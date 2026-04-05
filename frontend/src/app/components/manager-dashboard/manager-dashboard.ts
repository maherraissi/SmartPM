import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manager-dashboard.html',
  styleUrls: ['./manager-dashboard.scss']
})
export class ManagerDashboard implements OnInit {
  stats = [
    { label: 'Total Projects', value: '3', icon: '📁' },
    { label: 'Active Activities', value: '12', icon: '⚙️' },
    { label: 'Engineers', value: '14', icon: '👥' },
    { label: 'Tasks Pending', value: '8', icon: '⏳' }
  ];

  // Dummy data representing the structured tracking
  currentProject = {
    name: 'Flight Control System V2.1',
    progress: 45,
    activities: [
      {
        name: 'Low Level Requirements (LLR)',
        progress: 80,
        tasks: [
          { name: 'Detailed Software Design', status: 'Completed' },
          { name: 'Code Construction', status: 'InProgress' },
          { name: 'Peer Review', status: 'Pending' }
        ]
      },
      {
        name: 'Low Level Testing (LLT)',
        progress: 10,
        tasks: [
          { name: 'Unit Testing', status: 'InProgress' },
          { name: 'Coverage Run (MCDC)', status: 'Pending' }
        ]
      }
    ]
  };

  constructor(private router: Router) {}

  ngOnInit() {}

  launchWizard() {
    this.router.navigate(['/manager/project-wizard']);
  }
}
