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
    { label: 'Active Missions', value: '03', icon: '🚀', trend: '+12%', color: 'blue' },
    { label: 'Compliance Index', value: '100%', icon: '🛡️', trend: 'DO-178C', color: 'green' },
    { label: 'Engineers on Deck', value: '14', icon: '👨‍🚀', trend: 'Optimal', color: 'purple' },
    { label: 'Pending Reviews', value: '08', icon: '⏳', trend: '-2', color: 'orange' }
  ];

  activities = [
    { action: 'V-Cycle Synced', project: 'Flight Control V2', time: '10 mins ago', status: 'success' },
    { action: 'AI Planning Executed', project: 'Nose Gear System', time: '1 hour ago', status: 'info' },
    { action: 'DO-178C Warning: Reviewer match', project: 'Auth Module', time: '3 hours ago', status: 'warning' },
  ];

  constructor(private router: Router) {}

  ngOnInit() {}

  launchWizard() {
    this.router.navigate(['/manager/project-wizard']);
  }
}
