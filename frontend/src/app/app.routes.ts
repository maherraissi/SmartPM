import { Routes } from '@angular/router';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { ManagerDashboard } from './components/manager-dashboard/manager-dashboard';
import { MemberDashboard } from './components/member-dashboard/member-dashboard';
import { ProjectWizard } from './components/project-wizard/project-wizard';
import { Login } from './components/login/login';
import { Register } from './components/register/register';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'admin', component: AdminDashboard },
  { path: 'manager', component: ManagerDashboard },
  { path: 'member', component: MemberDashboard },
  { path: 'manager/project-wizard', component: ProjectWizard },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
