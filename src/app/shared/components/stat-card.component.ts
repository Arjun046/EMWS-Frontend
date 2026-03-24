import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { StatCard } from '../models/ui.models';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card class="stat-card" [ngClass]="card.tone ? 'tone-' + card.tone : 'tone-default'">
      <span class="label">{{ card.label }}</span>
      <strong class="value">{{ card.value }}</strong>
      <span class="delta" *ngIf="card.delta">{{ card.delta }}</span>
    </mat-card>
  `,
  styles: [`
    .stat-card { padding: 1.25rem; border-radius: 1.2rem; display: flex; flex-direction: column; gap: 0.4rem; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: none !important; }
    .label { font-size: 0.75rem; font-weight: 700; color: var(--app-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .value { font-size: 1.8rem; font-weight: 800; color: var(--app-text); line-height: 1.1; }
    .delta { font-size: 0.8rem; font-weight: 600; margin-top: 0.2rem; }
    
    .tone-good .delta { color: #10b981; }
    .tone-warn .delta { color: #f59e0b; }
    .tone-accent .delta { color: var(--app-primary-600); }
    .tone-default .delta { color: var(--app-text-muted); }
  `]
})
export class StatCardComponent {
  @Input() card!: StatCard;
}
