import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiService } from '../../services/ai';

@Component({
  selector: 'app-ai-tools-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-tools-panel.html',
  styleUrls: ['./ai-tools-panel.scss']
})
export class AiToolsPanelComponent implements OnInit {
  @Input() projectId: string = '';

  activeTab: 'simulator' | 'report' | 'alerts' = 'simulator';

  // Simulator
  simResult: any = null;
  isSimulating = false;
  simError = '';

  // Report
  reportResult: any = null;
  isReporting = false;
  reportError = '';

  // Alerts
  alertsResult: any[] = [];
  isAlerting = false;
  alertsError = '';
  alertsLoaded = false;

  constructor(private aiService: AiService) {}

  ngOnInit() {}

  setTab(tab: 'simulator' | 'report' | 'alerts') {
    this.activeTab = tab;
    if (tab === 'alerts' && !this.alertsLoaded) this.loadAlerts();
  }

  // ── SIMULATOR ─────────────────────────────
  runSimulator() {
    if (!this.projectId) return;
    this.isSimulating = true;
    this.simResult = null;
    this.simError = '';
    this.aiService.simulate(this.projectId).subscribe({
      next: (data) => { this.simResult = data.simulation; this.isSimulating = false; },
      error: (err) => { this.simError = 'Ollama inaccessible. Vérifiez qu\'Ollama tourne sur localhost:11434'; this.isSimulating = false; }
    });
  }

  // ── REPORT ────────────────────────────────
  generateReport() {
    if (!this.projectId) return;
    this.isReporting = true;
    this.reportResult = null;
    this.reportError = '';
    this.aiService.generateReport(this.projectId).subscribe({
      next: (data) => { this.reportResult = data.report; this.isReporting = false; },
      error: () => { this.reportError = 'Erreur lors de la génération du rapport.'; this.isReporting = false; }
    });
  }

  // ── ALERTS ────────────────────────────────
  loadAlerts() {
    if (!this.projectId) return;
    this.isAlerting = true;
    this.alertsResult = [];
    this.alertsError = '';
    this.aiService.getAlerts(this.projectId).subscribe({
      next: (data) => {
        this.alertsResult = data.alerts || [];
        this.isAlerting = false;
        this.alertsLoaded = true;
      },
      error: () => { this.alertsError = 'Erreur Ollama pour les alertes.'; this.isAlerting = false; }
    });
  }

  getRiskColor(level: string): string {
    return { FAIBLE: '#10b981', MOYEN: '#f59e0b', 'ÉLEVÉ': '#ef4444', CRITIQUE: '#7c2d12' }[level] || '#64748b';
  }

  getAlertColor(type: string): string {
    return { CRITICAL: '#ef4444', WARNING: '#f59e0b', INFO: '#3b82f6', SUCCESS: '#10b981' }[type] || '#94a3b8';
  }

  getAlertIcon(type: string): string {
    return { CRITICAL: '🚨', WARNING: '⚠️', INFO: 'ℹ️', SUCCESS: '✅' }[type] || '📌';
  }

  getHealthColor(s: string): string {
    return { NOMINAL: '#10b981', ATTENTION: '#f59e0b', CRITIQUE: '#ef4444' }[s] || '#64748b';
  }
}
