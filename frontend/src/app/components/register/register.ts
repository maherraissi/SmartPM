import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register {
  registerData = { firstName: '', lastName: '', email: '', password: '', role: 'MANAGER' };
  isLoading = false;

  constructor(private router: Router) {}

  async onSubmit() {
    this.isLoading = true;
    try {
      const res = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.registerData)
      });
      const data = await res.json();
      if (data.access_token) {
        alert('Account created successfully!');
        this.router.navigate(['/login']);
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      this.isLoading = false;
    }
  }
}
