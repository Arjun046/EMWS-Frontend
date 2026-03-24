import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <header class="page-header">
      <div class="content">
        <p class="context-label">Enterprise Workforce Management</p>
        <div class="title-row">
          <h1>{{ title }}</h1>
          <span class="status-indicator" *ngIf="status">
             <span class="dot"></span> {{ status }}
          </span>
        </div>
        <p class="subtitle">{{ subtitle }}</p>
      </div>
      <div class="actions">
        <button mat-stroked-button (click)="actionSecondary.emit()" *ngIf="secondaryActionLabel">
          <mat-icon *ngIf="secondaryIcon">{{ secondaryIcon }}</mat-icon>
          {{ secondaryActionLabel }}
        </button>
        <button mat-flat-button color="primary" (click)="action.emit()" *ngIf="actionLabel">
          <mat-icon *ngIf="icon">{{ icon }}</mat-icon>
          {{ actionLabel }}
        </button>
      </div>
    </header>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; border-bottom: 1px solid var(--wa-border, #e2e8f0); padding-bottom: 1.5rem; }
    .context-label { font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .title-row { display: flex; align-items: center; gap: 1rem; }
    h1 { margin: 0; font-size: 2.25rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .subtitle { margin: 0.25rem 0 0; color: #64748b; font-size: 1.1rem; }
    .actions { display: flex; gap: 1rem; }
    .status-indicator { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0.75rem; background: #f0fdf4; color: #166534; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
    .status-indicator .dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: #22c55e; }
    
    :host-context(.global-dark-mode) {
      h1 { color: #f1f5f9; }
      .page-header { border-color: #334155; }
    }
  `]
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() status?: string;
  @Input() actionLabel?: string;
  @Input() secondaryActionLabel?: string;
  @Input() icon?: string;
  @Input() secondaryIcon?: string;
  
  @Output() action = new EventEmitter<void>();
  @Output() actionSecondary = new EventEmitter<void>();
}
