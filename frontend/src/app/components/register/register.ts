import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
 selector: 'app-register',
 standalone: true,
 imports: [CommonModule, FormsModule, RouterModule],
 templateUrl: './register.html',
 styleUrls: ['./register.scss']
})
export class Register {
 registerData = { firstName: '', lastName: '', email: '', password: '' };
 isLoading = false;

 constructor(private router: Router) {}

 async onSubmit() {
  this.isLoading = true;
  try {
   const res = await fetch(`${environment.apiUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...this.registerData, role: 'MEMBER' })
   });
   const data = await res.json();
   if (data.access_token) {
    alert('Compte créé avec succès !');
    this.router.navigate(['/login']);
   } else {
    alert(data.message || 'Échec de la création du compte.');
   }
  } catch (err) {
   alert('Erreur réseau. Vérifiez votre connexion.');
  } finally {
   this.isLoading = false;
  }
 }

 registerWithGoogle() {
  window.location.href = `${environment.apiUrl}/auth/google`;
 }

 registerWithGithub() {
  window.location.href = `${environment.apiUrl}/auth/github`;
 }
}
