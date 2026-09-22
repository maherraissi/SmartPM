import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
 selector: 'app-login',
 standalone: true,
 imports: [CommonModule, FormsModule, RouterModule],
 templateUrl: './login.html',
 styleUrls: ['./login.scss']
})
export class Login implements OnInit {
 loginData = { email: '', password: '' };
 isLoading = false;
 errorMessage = '';
 showPassword = false;
 showForgot = false;

 constructor(private router: Router, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

 ngOnInit() {
  this.route.queryParams.subscribe(params => {
   const token = params['token'];
   if (token) {
    this.processTokenAndRedirect(token);
   }
  });
 }

 private processTokenAndRedirect(token: string) {
  try {
   localStorage.setItem('token', token);
   localStorage.removeItem('smartpm_admin_tab'); // Force default tab on fresh login
   let b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
   b64 = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
   const payload = JSON.parse(atob(b64));
   const role: string = payload.role || 'MEMBER';
   const routes: Record<string, string> = {
    ADMIN: '/admin',
    MANAGER: '/manager',
    MEMBER: '/member'
   };
   this.router.navigate([routes[role.toUpperCase()] || '/member']);
  } catch (err) {
   console.error("Token parse error:", err);
   this.errorMessage = '❌ Erreur de connexion (Token invalide).';
   this.cdr.detectChanges();
  }
 }

 async onSubmit() {
  this.isLoading = true;
  this.errorMessage = '';
  try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

   const res = await fetch(`${environment.apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(this.loginData),
    signal: controller.signal
   });
   clearTimeout(timeoutId);

   const data = await res.json();
   if (data.access_token) {
    this.processTokenAndRedirect(data.access_token);
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
  window.location.href = `${environment.apiUrl}/auth/google`;
 }

 loginWithGithub() {
  window.location.href = `${environment.apiUrl}/auth/github`;
 }
}
