import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  try {
    // Decoding JWT Payload (Robustly)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const payload = JSON.parse(jsonPayload);
    const userRole = (payload.role || '').toUpperCase();
    const expectedRole = (route.data['role'] || '').toUpperCase();

    console.log(`[Guard] Path: ${state.url}, Found Role: ${userRole}, Required: ${expectedRole}`);
    
    if (expectedRole && userRole !== expectedRole) {
      console.warn(`[Guard] Access denied. Redirecting to appropriate role dashboard.`);
      
      // Redirect to appropriate dashboard if they have a role but in the wrong place
      const roleRoot: Record<string, string> = { 
        ADMIN: '/admin', 
        MANAGER: '/manager', 
        MEMBER: '/member' 
      };
      router.navigate([roleRoot[userRole] || '/login']);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Guard] Token validation failed:', error);
    localStorage.removeItem('token');
    router.navigate(['/login']);
    return false;
  }
};
