import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
 selector: 'app-login',
 standalone: true,
 imports: [CommonModule, FormsModule, RouterModule],
 templateUrl: './login.html',
 styleUrls: ['./login.scss']
})
export class Login {
 loginData = { email: '', password: '' };
 isLoading = false;
 errorMessage = '';
 showPassword = false;
 showForgot = false;

 constructor(private router: Router, private cdr: ChangeDetectorRef) {}

 async onSubmit() {
  this.isLoading = true;
  this.errorMessage = '';
  try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

   const res = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(this.loginData),
    signal: controller.signal
   });
   clearTimeout(timeoutId);

   const data = await res.json();
   if (data.access_token) {
    localStorage.setItem('token', data.access_token);
    const payload = JSON.parse(atob(data.access_token.split('.')[1]));
    const role: string = payload.role || 'MEMBER';
    const routes: Record<string, string> = {
     ADMIN: '/admin',
     MANAGER: '/manager',
     MEMBER: '/member'
    };
    this.router.navigate([routes[role] || '/member']);
   } else {
    this.errorMessage = '❌ Email ou mot de passe incorrect. Vérifiez vos identifiants.';
    this.cdr.detectChanges();
   }
  } catch (err: any) {
   if (err.name === 'AbortError') {
    this.errorMessage = '⏱️ Le serveur ne répond pas. Réessayez dans quelques secondes.';
   } else {
    this.errorMessage = '🔌 Erreur réseau. Vérifiez votre connexion.';
   }
   this.cdr.detectChanges();
  } finally {
   this.isLoading = false;
   this.cdr.detectChanges();
  }
 }

 loginWithGoogle() {
  window.location.href = 'http://localhost:3000/auth/google';
 }

 loginWithGithub() {
  window.location.href = 'http://localhost:3000/auth/github';
 }
}
