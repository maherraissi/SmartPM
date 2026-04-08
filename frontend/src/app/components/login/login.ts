import { Component } from '@angular/core';
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

  constructor(private router: Router) {}

  async onSubmit() {
    this.isLoading = true;
    try {
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.loginData)
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        // Decode JWT payload to get role
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        const role: string = payload.role || 'MEMBER';
        const routes: Record<string, string> = {
          ADMIN: '/admin',
          MANAGER: '/manager',
          MEMBER: '/member'
        };
        this.router.navigate([routes[role] || '/member']);
      } else {
        alert(data.message || 'Identifiants incorrects');
      }
    } catch (err) {
      alert('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      this.isLoading = false;
    }
  }

  loginWithGoogle() {
    console.log('Redirecting to Google Auth...');
    window.location.href = 'http://localhost:3000/auth/google';
  }

  loginWithGithub() {
    console.log('Redirecting to Github Auth...');
    window.location.href = 'http://localhost:3000/auth/github';
  }
}
