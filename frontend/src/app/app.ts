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
 styleUrls: ['./app.scss']
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

  });
 }
}
