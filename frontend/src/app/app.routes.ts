import { Routes } from '@angular/router';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { ManagerDashboard } from './components/manager-dashboard/manager-dashboard';
import { MemberDashboard } from './components/member-dashboard/member-dashboard';
import { ProjectWizard } from './components/project-wizard/project-wizard';

export const routes: Routes = [
  { path: 'admin', component: AdminDashboard },
  { path: 'manager', component: ManagerDashboard },
  { path: 'member', component: MemberDashboard },
  { path: 'manager/project-wizard', component: ProjectWizard },
  { path: '', redirectTo: '/manager', pathMatch: 'full' },
  { path: '**', redirectTo: '/manager' }
];
