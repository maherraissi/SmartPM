import { Routes } from '@angular/router';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { ManagerDashboard } from './components/manager-dashboard/manager-dashboard';
import { MemberDashboard } from './components/member-dashboard/member-dashboard';
import { ProjectWizard } from './components/project-wizard/project-wizard';
import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  
  // SECURE ROUTES PER ROLE
  { 
    path: 'admin', 
    component: AdminDashboard, 
    canActivate: [authGuard], 
    data: { role: 'ADMIN' } 
  },
  { 
    path: 'manager', 
    component: ManagerDashboard, 
    canActivate: [authGuard], 
    data: { role: 'MANAGER' } 
  },
  { 
    path: 'member', 
    component: MemberDashboard, 
    canActivate: [authGuard], 
    data: { role: 'MEMBER' } 
  },
  
  { 
    path: 'manager/project-wizard', 
    component: ProjectWizard, 
    canActivate: [authGuard], 
    data: { role: 'MANAGER' } 
  },

  { 
    path: 'manager/project/:id', 
    loadComponent: () => import('./components/project-detail/project-detail').then(m => m.ProjectDetail),
    canActivate: [authGuard], 
    data: { role: 'MANAGER' } 
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
