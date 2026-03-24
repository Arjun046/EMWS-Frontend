import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  status: string;
  department: string;
}

@Component({
  selector: 'app-employees-page',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatPaginatorModule, MatSortModule, MatMenuModule, MatChipsModule, 
    MatDialogModule, MatFormFieldModule, MatInputModule, MatDividerModule,
    PageHeaderComponent
  ],
  template: `
    <app-page-header 
      title="Workforce Directory" 
      subtitle="Manage employee identities, contracts, and operational roles across all locations."
      actionLabel="Add Employee"
      icon="person_add"
    />

    <mat-card class="directory-card">
      <div class="table-header">
        <mat-form-field appearance="outline" class="search-field">
          <mat-icon matPrefix>search</mat-icon>
          <mat-label>Filter directory...</mat-label>
          <input matInput (keyup)="applyFilter($event)" placeholder="Name, role, or department">
        </mat-form-field>
        
        <div class="view-actions">
          <button mat-icon-button title="Filter"><mat-icon>filter_list</mat-icon></button>
          <button mat-icon-button title="Columns"><mat-icon>view_column</mat-icon></button>
        </div>
      </div>

      <table mat-table [dataSource]="filteredEmployees()" class="full-width-table">
        <!-- Name Column -->
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Employee</th>
          <td mat-cell *matCellDef="let emp">
            <div class="employee-cell">
              <div class="avatar">{{ emp.firstName.charAt(0) }}{{ emp.lastName.charAt(0) }}</div>
              <div class="info">
                <strong>{{ emp.firstName }} {{ emp.lastName }}</strong>
                <span>{{ emp.email }}</span>
              </div>
            </div>
          </td>
        </ng-container>

        <!-- Role Column -->
        <ng-container matColumnDef="role">
          <th mat-header-cell *matHeaderCellDef>Position & Dept</th>
          <td mat-cell *matCellDef="let emp">
            <div class="role-cell">
              <strong>{{ emp.jobTitle || 'N/A' }}</strong>
              <span>{{ emp.department || 'Operations' }}</span>
            </div>
          </td>
        </ng-container>

        <!-- Status Column -->
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let emp">
            <span class="status-badge" [class]="emp.status?.toLowerCase()">
              {{ emp.status }}
            </span>
          </td>
        </ng-container>

        <!-- Actions Column -->
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let emp">
            <button mat-icon-button [matMenuTriggerFor]="menu">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item>
                <mat-icon>edit</mat-icon>
                <span>Edit Profile</span>
              </button>
              <button mat-menu-item>
                <mat-icon>history</mat-icon>
                <span>View Timeline</span>
              </button>
              <mat-divider></mat-divider>
              <button mat-menu-item class="text-red-500">
                <mat-icon color="warn">person_off</mat-icon>
                <span>Deactivate</span>
              </button>
            </mat-menu>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      <mat-paginator [length]="employees().length" [pageSize]="10" [pageSizeOptions]="[5, 10, 25, 100]"></mat-paginator>
    </mat-card>
  `,
  styles: [`
    .directory-card { border-radius: 1rem; border: 1px solid var(--wa-border, #e2e8f0); box-shadow: none !important; overflow: hidden; }
    .table-header { padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; background: #fff; }
    .search-field { width: 20rem; }
    ::ng-deep .search-field .mat-mdc-text-field-wrapper { height: 2.75rem; border-radius: 0.75rem !important; }
    
    .full-width-table { width: 100%; }
    
    .employee-cell { display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0; }
    .employee-cell .avatar { width: 2.5rem; height: 2.5rem; border-radius: 50%; background: #3b82f615; color: #3b82f6; display: grid; place-items: center; font-weight: 700; font-size: 0.8rem; }
    .employee-cell .info { display: flex; flex-direction: column; }
    .employee-cell .info strong { color: #0f172a; font-size: 0.9rem; }
    .employee-cell .info span { color: #64748b; font-size: 0.75rem; }

    .role-cell { display: flex; flex-direction: column; }
    .role-cell strong { font-size: 0.85rem; color: #334155; }
    .role-cell span { font-size: 0.75rem; color: #94a3b8; }

    .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; }
    .status-badge.active { background: #f0fdf4; color: #166534; }
    .status-badge.onboarding { background: #eff6ff; color: #1e40af; }
    .status-badge.inactive { background: #f1f5f9; color: #475569; }

    :host-context(.global-dark-mode) {
      .directory-card, .table-header, table { background: #1e293b; border-color: #334155; }
      th { color: #94a3b8; }
      td { color: #cbd5e1; }
      .employee-cell .info strong { color: #f1f5f9; }
      .role-cell strong { color: #f1f5f9; }
    }
  `]
})
export class EmployeesPageComponent {
  private readonly api = inject(ApiService);
  protected readonly employees = toSignal(this.api.get<Employee[]>('/api/employees', []), { initialValue: [] });
  protected readonly filter = signal('');
  
  protected readonly displayedColumns = ['name', 'role', 'status', 'actions'];

  protected readonly filteredEmployees = computed(() => {
    const s = this.filter().toLowerCase();
    const list = this.employees();
    if (!s) return list;
    return list.filter(e => 
      e.firstName.toLowerCase().includes(s) || 
      e.lastName.toLowerCase().includes(s) || 
      e.jobTitle?.toLowerCase().includes(s)
    );
  });

  protected applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filter.set(value);
  }
}
