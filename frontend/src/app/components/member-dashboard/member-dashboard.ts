import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TaskService } from '../../services/task';
import { NotificationService } from '../../services/notification';
import { CommentService } from '../../services/comment';
import { FormsModule } from '@angular/forms';
import { AiChatbotComponent } from '../ai-chatbot/ai-chatbot';

@Component({
 selector: 'app-member-dashboard',
 standalone: true,
 imports: [CommonModule, FormsModule, AiChatbotComponent],
 templateUrl: './member-dashboard.html',
 styleUrls: ['./member-dashboard.scss']
})
export class MemberDashboard implements OnInit, OnDestroy {
 userName = 'Member';
 activeTab = 'tasks';
 isLoading = false;
 
 notifications: any[] = [];
 showNotifs = false;
 unreadCount = 0;

 // Timer state
 timerActive = false;
 timerSeconds = 0;
 timerInterval: any;

 todayTasks: any[] = [];
 reviewsToDone: any[] = [];
 myProjects: any[] = [];
 selectedProject: any = null;
 projectTasks: any[] = [];
 performanceStats: any[] = [];
 
 // ⏱️ TIMER & TASK EXECUTION
 timerRunning: boolean = false;
 timerTime: number = 0;
 activeTask: any = null;

 trainingTracks = [
  { name: 'LLT Certification Track', progress: 72, status: 'In Progress' },
  { name: ' Fundamentals', progress: 100, status: 'Certified ✅' }
 ];
 teamComments: any[] = [];
 newCommentText: string = '';

 constructor(
  private router: Router,
  private taskService: TaskService,
  private notificationService: NotificationService,
  private commentService: CommentService
 ) {}

 ngOnInit() {
  this.extractUser();
  this.fetchDashboardData();
  this.fetchNotifications();
  this.fetchComments();
  
  // Polling des notifications toutes les 3 secondes (Live feel)
  setInterval(() => this.fetchNotifications(), 3000);
  
  // Polling des commentaires toutes les 5 secondes
  setInterval(() => this.fetchComments(), 5000);
 }

 fetchNotifications() {
  this.notificationService.getNotifications().subscribe({
   next: (notifs) => {
    const newUnread = notifs.filter(n => !n.isRead).length;
    if (newUnread > this.unreadCount) {
     console.log("Nouvelle notification reçue !");
     // On pourrait ajouter un son ou un toast ici
    }
    this.notifications = notifs;
    this.unreadCount = newUnread;
   }
  });
 }

 markRead(id: string) {
  this.notificationService.markAsRead(id).subscribe(() => this.fetchNotifications());
 }

 toggleNotifs() {
  this.showNotifs = !this.showNotifs;
 }

 fetchDashboardData() {
  this.isLoading = true;
  this.taskService.getDashboard().subscribe({
   next: (data) => {
    this.todayTasks = data.todayTasks;
    this.reviewsToDone = data.reviewsToDone;
    this.myProjects = data.myProjects;
    this.performanceStats = data.performanceStats;
    this.isLoading = false;
   },
   error: (err) => {
    console.error('Failed to fetch member dashboard data', err);
    this.isLoading = false;
   }
  });
 }

 extractUser() {
  const token = localStorage.getItem('token');
  if (token) {
   try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const emailUser = payload.email?.split('@')[0] || 'Member';
    this.userName = emailUser.charAt(0).toUpperCase() + emailUser.slice(1);
   } catch {}
  }
 }

 ngOnDestroy() {
  if (this.timerInterval) clearInterval(this.timerInterval);
 }

 logout() {
  localStorage.removeItem('token');
  window.location.href = '/login';
 }

 switchTab(tab: string) {
  this.activeTab = tab;
  if (tab !== 'project-detail') this.selectedProject = null;
 }

 enterProject(project: any) {
  this.selectedProject = project;
  this.isLoading = true;
  this.taskService.getProjectTasks(project.id).subscribe({
   next: (tasks) => {
    this.projectTasks = tasks;
    this.activeTab = 'project-detail';
    this.isLoading = false;
   },
   error: () => this.isLoading = false
  });
 }

 exitProject() {
  this.selectedProject = null;
  this.activeTab = 'projects';
 }

 // ⏱️ TIMER METHODS
 startTask(task: any) {
  if (this.activeTask && this.activeTask.id !== task.id) {
   alert("Une autre tâche est déjà en cours. Terminez-la d'abord.");
   return;
  }

  this.activeTask = task;
  this.taskService.updateTaskStatus(task.id, 'IN_PROGRESS').subscribe({
   next: () => {
    this.timerRunning = true;
    this.startTimer();
    this.fetchDashboardData(); // Refresh list to show 'current' status
   }
  });
 }

 finishTask() {
  if (!this.activeTask) return;

  const taskId = this.activeTask.id;
  this.taskService.updateTaskStatus(taskId, 'READY_FOR_REVIEW').subscribe({
   next: () => {
    this.stopTimer();
    this.timerTime = 0;
    this.activeTask = null;
    this.timerRunning = false;
    this.fetchDashboardData();
    alert("Bravo ! Mission accomplie. La tâche a été envoyée pour revue.");
   }
  });
 }

 startTimer() {
  clearInterval(this.timerInterval);
  this.timerInterval = setInterval(() => {
   this.timerTime++;
  }, 1000);
 }

 stopTimer() {
  clearInterval(this.timerInterval);
  this.timerRunning = false;
 }

 formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => v < 10 ? '0' + v : v).join(':');
 }

 fetchComments() {
  this.commentService.getComments().subscribe({
   next: (data) => {
    this.teamComments = data.map(c => ({
     author: c.authorId?.name || 'Inconnu',
     msg: c.text,
     time: new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
   }
  });
 }

 sendComment() {
  if (!this.newCommentText.trim()) return;
  this.commentService.postComment(this.newCommentText).subscribe({
   next: () => {
    this.newCommentText = '';
    this.fetchComments();
   }
  });
 }
}
