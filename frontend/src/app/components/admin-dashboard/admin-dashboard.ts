import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss']
})
export class AdminDashboard implements OnInit {
  users: any[] = [];
  isLoading = true;
  savingId: string | null = null;

  readonly roles = ['ADMIN', 'MANAGER', 'MEMBER'];

  async ngOnInit() {
    await this.loadUsers();
  }

  async loadUsers() {
    this.isLoading = true;
    try {
      const res = await fetch('http://localhost:3000/users');
      this.users = await res.json();
    } catch {
      alert('Erreur de connexion au serveur.');
    } finally {
      this.isLoading = false;
    }
  }

  async updateRole(user: any) {
    this.savingId = user._id;
    try {
      await fetch(`http://localhost:3000/users/${user._id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: user.role })
      });
    } finally {
      this.savingId = null;
    }
  }

  async deleteUser(userId: string) {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    await fetch(`http://localhost:3000/users/${userId}`, { method: 'DELETE' });
    this.users = this.users.filter(u => u._id !== userId);
  }

  getRoleBadgeClass(role: string): string {
    return { ADMIN: 'badge-red', MANAGER: 'badge-blue', MEMBER: 'badge-green' }[role] || '';
  }
}
