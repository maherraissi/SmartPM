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
        // Decode token or check role to navigate
        this.router.navigate(['/manager']);
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      this.isLoading = false;
    }
  }

  loginWithGoogle() {
    window.location.href = 'http://localhost:3000/auth/google';
  }

  loginWithGithub() {
    window.location.href = 'http://localhost:3000/auth/github';
  }
}
