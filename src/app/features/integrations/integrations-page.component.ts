import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { IntegrationService, IntegrationConfig, SyncLog } from '../../core/services/integration.service';
import { backendErrorMessage } from '../../shared/utils/password-policy';

/**
 * P1 close-out: minimal integrations console (BE /api/integrations already
 * shipped configs + logs/{system}; FE had no caller). Configs CRUD + per-system
 * sync-log viewer. BE has no INTEGRATION_* permission vocabulary yet, so this
 * route is admin-gated FE-side until the permission seed lands.
 */
@Component({
  selector: 'app-integrations-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="module-page active-page fade-up">
      <div class="filter-action-row">
        <div>
          <h2 style="margin:0;">Integrations</h2>
          <p style="margin:0;color:var(--txt-muted);font-size:0.8rem;">External system configs and sync logs.</p>
        </div>
        <button class="ui-btn ui-btn-primary" (click)="save()" [disabled]="!form.systemName.trim()">
          <mat-icon style="font-size:1.1rem;width:1.1rem;height:1.1rem;">add</mat-icon>
          {{ editingId ? 'Update config' : 'Add config' }}
        </button>
      </div>

      <div class="integ-grid">
        <div class="ui-card">
          <div class="ui-card-header"><h3>Configs ({{ configs().length }})</h3></div>
          @for (c of configs(); track c.id) {
            <div class="perf-row">
              <div style="flex:1;">
                <strong>{{ c.systemName }}</strong><br>
                <small>{{ c.endpointUrl || 'no endpoint' }} · {{ c.isActive === false ? 'disabled' : 'active' }}</small>
              </div>
              <button class="ui-btn" (click)="edit(c)">Edit</button>
              <button class="ui-btn" (click)="viewLogs(c.systemName)">Logs</button>
              <button class="ui-btn" style="color:var(--danger);" (click)="remove(c.id)">Delete</button>
            </div>
          }
          @if (!configs().length) {
            <p style="color:var(--txt-muted);font-size:0.85rem;">No configs yet — add the first one on the right.</p>
          }
        </div>

        <div class="ui-card">
          <div class="ui-card-header"><h3>{{ editingId ? 'Edit config' : 'New config' }}</h3></div>
          <div class="f-group"><label>System name</label><input class="f-input" [(ngModel)]="form.systemName" placeholder="e.g. payroll-sync"></div>
          <div class="f-group"><label>Endpoint URL</label><input class="f-input" [(ngModel)]="form.endpointUrl" placeholder="https://…"></div>
          <div class="f-group"><label>API key</label><input class="f-input" [(ngModel)]="form.apiKey" placeholder="stored per company"></div>
          <div class="f-group"><label>Active?</label>
            <select class="f-input" [(ngModel)]="form.isActive"><option [ngValue]="true">Yes</option><option [ngValue]="false">No</option></select>
          </div>
          @if (editingId) {
            <button class="ui-btn" (click)="cancelEdit()">Cancel edit</button>
          }
          <div class="form-section">Sync logs{{ logSystem ? ' — ' + logSystem : '' }}</div>
          <div class="f-group"><label>System filter</label>
            <div style="display:flex;gap:0.5rem;">
              <input class="f-input" [(ngModel)]="logSystem" placeholder="systemName">
              <button class="ui-btn" (click)="viewLogs(logSystem)">Load</button>
            </div>
          </div>
          @for (l of logs(); track l.id) {
            <div class="perf-row">
              <div style="flex:1;">
                <strong>{{ l.status }}</strong> · {{ l.systemName }}<br>
                <small>{{ l.syncDate || '' }} {{ l.details || '' }}</small>
              </div>
            </div>
          }
          @if (logSystem && !logs().length) {
            <p style="color:var(--txt-muted);font-size:0.85rem;">No logs for “{{ logSystem }}”.</p>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .integ-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem; }
    @media (max-width: 900px) { .integ-grid { grid-template-columns: 1fr; } }
    .perf-row { display: flex; gap: 0.5rem; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
    .form-section { font-size: 0.7rem; font-weight: 800; color: var(--primary); text-transform: uppercase; margin: 1.25rem 0 0.75rem; }
  `]
})
export class IntegrationsPageComponent implements OnInit {
  private readonly api = inject(IntegrationService);
  private readonly snack = inject(MatSnackBar);

  protected readonly configs = signal<IntegrationConfig[]>([]);
  protected readonly logs = signal<SyncLog[]>([]);
  protected editingId: number | null = null;
  protected logSystem = '';
  protected form: { systemName: string; endpointUrl: string; apiKey: string; isActive: boolean } = {
    systemName: '', endpointUrl: '', apiKey: '', isActive: true
  };

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.getConfigs().subscribe({
      next: (c) => this.configs.set(c ?? []),
      error: (err) => this.snack.open(backendErrorMessage(err, 'Could not load configs.'), 'Dismiss', { duration: 5000 })
    });
  }

  edit(c: IntegrationConfig): void {
    this.editingId = c.id;
    this.form = { systemName: c.systemName, endpointUrl: c.endpointUrl ?? '', apiKey: c.apiKey ?? '', isActive: c.isActive !== false };
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form = { systemName: '', endpointUrl: '', apiKey: '', isActive: true };
  }

  save(): void {
    const payload = { ...this.form };
    const done = () => { this.cancelEdit(); this.reload(); };
    if (this.editingId) {
      this.api.updateConfig(this.editingId, payload).subscribe({
        next: () => { this.snack.open('Config updated.', 'OK', { duration: 3000 }); done(); },
        error: (err) => this.snack.open(backendErrorMessage(err, 'Update failed.'), 'Dismiss', { duration: 6000 })
      });
    } else {
      this.api.createConfig(payload).subscribe({
        next: () => { this.snack.open('Config created.', 'OK', { duration: 3000 }); done(); },
        error: (err) => this.snack.open(backendErrorMessage(err, 'Create failed.'), 'Dismiss', { duration: 6000 })
      });
    }
  }

  remove(id: number): void {
    if (!confirm('Delete this config?')) return;
    this.api.deleteConfig(id).subscribe({
      next: () => this.reload(),
      error: (err) => this.snack.open(backendErrorMessage(err, 'Delete failed.'), 'Dismiss', { duration: 5000 })
    });
  }

  viewLogs(systemName: string): void {
    if (!systemName?.trim()) return;
    this.logSystem = systemName.trim();
    this.api.getLogs(this.logSystem).subscribe({ next: (l) => this.logs.set(l), error: () => this.logs.set([]) });
  }
}
