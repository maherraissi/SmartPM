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
    const payload = JSON.parse(atob(token.split('.')[1]));
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
