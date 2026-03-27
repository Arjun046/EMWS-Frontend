import { Component, computed, input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { StatusBadgeComponent } from './status-badge.component';
import { TableColumn } from '../models/ui.models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule, StatusBadgeComponent, DatePipe],
  template: `
    <div class="table-actions mb-4 flex justify-between items-center">
      <div class="count-pill">
        <strong>{{ rows().length }}</strong> records found
      </div>
      <button mat-stroked-button color="primary" (click)="exportToCSV()" [disabled]="rows().length === 0">
        <mat-icon>download</mat-icon> Export CSV
      </button>
    </div>

    <div class="table-container">
      <table mat-table [dataSource]="rows()" class="enterprise-grid">
        @for (column of columns(); track column.key) {
          <ng-container [matColumnDef]="column.key">
            <th mat-header-cell *matHeaderCellDef class="header-cell">
              <div class="header-content">
                {{ column.label }}
                <mat-icon class="sort-icon">unfold_more</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let row" class="body-cell">
              @switch (column.type) {
                @case ('status') {
                  <app-status-badge [value]="read(row, column.key)" />
                }
                @case ('date') {
                  <span class="date-text">{{ read(row, column.key) | date: 'mediumDate' }}</span>
                }
                @default {
                  <span class="default-text">{{ read(row, column.key) }}</span>
                }
              }
            </td>
          </ng-container>
        }

        <!-- Actions Column -->
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef class="header-cell"></th>
          <td mat-cell *matCellDef="let row" class="body-cell actions-cell">
            <button mat-icon-button [matMenuTriggerFor]="rowMenu">
              <mat-icon>more_vert</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="allColumns()"></tr>
        <tr mat-row *matRowDef="let row; columns: allColumns()" class="row-hover"></tr>
      </table>

      @if (rows().length === 0) {
        <div class="empty-state">
          <mat-icon>inventory_2</mat-icon>
          <p>No records found matching your current filters.</p>
        </div>
      }
    </div>

    <mat-menu #rowMenu="matMenu">
      <button mat-menu-item><mat-icon>edit</mat-icon> Edit Record</button>
      <button mat-menu-item><mat-icon>visibility</mat-icon> View Details</button>
      <mat-divider></mat-divider>
      <button mat-menu-item color="warn"><mat-icon>delete</mat-icon> Delete</button>
    </mat-menu>
  `,
  styles: [`
    .table-container { overflow: auto; background: #fff; border-radius: 1rem; border: 1px solid #e2e8f0; position: relative; }
    .enterprise-grid { width: 100%; min-width: 50rem; border-collapse: separate; border-spacing: 0; }
    
    .header-cell { background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 1rem !important; }
    .header-content { display: flex; align-items: center; gap: 0.5rem; }
    .sort-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; color: #cbd5e1; cursor: pointer; }
    
    .body-cell { border-bottom: 1px solid #f1f5f9; padding: 0.85rem 1rem !important; transition: background 0.2s; font-size: 0.92rem; }
    .row-hover:hover .body-cell { background: #f1f5f9; }
    
    .date-text { color: #475569; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; }
    .default-text { color: #1e293b; font-weight: 500; }
    
    .actions-cell { text-align: right; width: 3rem; }
    
    .empty-state { padding: 4rem 2rem; text-align: center; color: #94a3b8; }
    .empty-state mat-icon { font-size: 3rem; width: 3rem; height: 3rem; margin-bottom: 1rem; }

    .mb-4 { margin-bottom: 1rem; }
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .items-center { align-items: center; }
    .count-pill { background: #f1f5f9; padding: 0.4rem 1rem; border-radius: 999px; font-size: 0.85rem; color: #64748b; }
    .count-pill strong { color: #1e293b; }

    @media (max-width: 768px) {
      .enterprise-grid { min-width: 100%; }
      .header-cell:not(.actions-cell) { display: none; }
      .body-cell:not(.actions-cell) { display: block; border: none; padding: 0.25rem 1rem !important; }
      .body-cell:first-child { padding-top: 1rem !important; font-weight: 900; font-size: 1rem; }
      .body-cell:last-child { padding-bottom: 1rem !important; border-bottom: 1px solid #e2e8f0; }
      .row-hover { display: block; border-bottom: 8px solid #f8fafc; position: relative; }
      .actions-cell { position: absolute; top: 0.5rem; right: 0.5rem; border: none !important; }
    }
  `]
})
export class DataTableComponent {
  readonly columns = input.required<TableColumn[]>();
  readonly rows = input.required<Record<string, unknown>[]>();
  
  protected readonly allColumns = computed(() => [...this.columns().map((c) => c.key), 'actions']);

  protected read(row: Record<string, unknown>, key: string): string {
    const value = row[key];
    return value === undefined || value === null ? '—' : String(value);
  }

  exportToCSV() {
    const headers = this.columns().map(c => c.label).join(',');
    const dataRows = this.rows().map(row => 
      this.columns().map(c => {
        let val = this.read(row, c.key);
        // Basic escaping for CSV
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    );

    const csvContent = [headers, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `export_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
