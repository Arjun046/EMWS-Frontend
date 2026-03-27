import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { StatCard } from '../models/ui.models';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card class="stat-card clickable" [ngClass]="card.tone ? 'tone-' + card.tone : 'tone-default'">
      <span class="label">{{ card.label }}</span>
      <div class="flex items-center justify-between">
        <strong class="value">{{ card.value }}</strong>
        <span class="delta" *ngIf="card.delta">{{ card.delta }}</span>
      </div>
    </mat-card>
  `,
  styles: [`
    .stat-card { padding: 1.25rem; border-radius: 1.2rem; display: flex; flex-direction: column; gap: 0.4rem; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: none !important; transition: all 0.2s; }
    .clickable { cursor: pointer; }
    .clickable:hover { transform: translateY(-3px); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05) !important; border-color: #3b82f633; }
    
    .label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .value { font-size: 2.2rem; font-weight: 900; color: #0f172a; line-height: 1.1; }
    .delta { font-size: 0.75rem; font-weight: 700; margin-top: 0.2rem; background: #f1f5f9; padding: 0.2rem 0.5rem; border-radius: 6px; }
    
    .tone-good .delta { color: #059669; background: #ecfdf5; }
    .tone-warn .delta { color: #d97706; background: #fffbeb; }
    .tone-accent .delta { color: #2563eb; background: #eff6ff; }
    .tone-default .delta { color: #64748b; background: #f8fafc; }

    .flex { display: flex; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
  `]
})
export class StatCardComponent {
  @Input() card!: StatCard;
}
