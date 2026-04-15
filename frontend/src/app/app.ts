import { Component, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Navbar } from './components/navbar/navbar';
import { Sidebar } from './components/sidebar/sidebar';
import { filter } from 'rxjs/operators';

@Component({
 selector: 'app-root',
 imports: [RouterOutlet, Navbar, Sidebar, CommonModule],
 templateUrl: './app.html',
 styleUrl: './app.scss'
})
export class App {
 protected readonly title = signal('SmartPM');
 isAuthPage = false;

 constructor(private router: Router) {
  // Listen to every navigation event to update the flag reactively
  this.router.events.pipe(
   filter(event => event instanceof NavigationEnd)
  ).subscribe((event: any) => {
   const url = event.urlAfterRedirects;
   this.isAuthPage = url.includes('/login') 
           || url.includes('/register')
           || url.includes('/admin')
           || url.includes('/manager')
           || url.includes('/member');
   
   // Force body class for CSS-level hiding if needed
   if (this.isAuthPage) {
    document.body.classList.add('no-shell');
   } else {
    document.body.classList.remove('no-shell');
   }

   // CAPTURE TOKEN FROM URL (FOR OAUTH REDIRECTS)
   // STRATEGIC OAUTH TOKEN CAPTURE
   const currentUrl = window.location.origin + event.urlAfterRedirects;
   const searchUrl = new URL(currentUrl);
   const token = searchUrl.searchParams.get('token');

   if (token) {
    console.log('✅ OAuth Token detected, authorizing search path...');
    localStorage.setItem('token', token);

    try {
     // Robust Base64 Decoding for JWT
     const base64Url = token.split('.')[1];
     const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
     const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
       return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
     }).join(''));

     const payload = JSON.parse(jsonPayload);
     const roleRoutes: Record<string, string> = { 
      ADMIN: '/admin', 
      MANAGER: '/manager', 
      MEMBER: '/member' 
     };

     const target = roleRoutes[payload.role] || '/member';
     console.log('🎯 Redirecting to:', target);
     this.router.navigateByUrl(target, { replaceUrl: true });
    } catch (e) {
     console.error('❌ Token decoding error:', e);
     this.router.navigate(['/login']);
    }
   }
  });
 }
}
