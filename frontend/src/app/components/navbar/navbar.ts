import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
 selector: 'app-navbar',
 standalone: true,
 imports: [CommonModule],
 templateUrl: './navbar.html',
 styleUrl: './navbar.scss',
})
export class Navbar implements OnInit {
 userName = '';
 userRole = '';
 userInitials = '';

 constructor(private router: Router) {}

 ngOnInit() {
  const token = localStorage.getItem('token');
  if (token) {
   try {
    let b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
   b64 = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
   const payload = JSON.parse(atob(b64));
    this.userRole = payload.role || '';
    // Extract name from email if no firstName in token
    const emailUser = payload.email?.split('@')[0] || 'Utilisateur';
    this.userName = emailUser.charAt(0).toUpperCase() + emailUser.slice(1);
    this.userInitials = this.userName.charAt(0).toUpperCase();
   } catch {}
  }
 }

 logout() {
  localStorage.removeItem('token');
  this.router.navigate(['/login']);
 }
}
