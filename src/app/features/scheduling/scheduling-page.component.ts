import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SchedulingService, Shift } from '../../core/services/scheduling.service';
import { EmployeeDataService } from '../../core/services/employee-data.service';
import { OrganizationService } from '../../core/services/organization.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-scheduling-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatSnackBarModule,
    MatDividerModule,
    MatChipsModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    DatePipe
  ],
  template: `
    <app-page-header 
      title="Scheduling & Rosters" 
      subtitle="Optimize workforce coverage, manage shift swaps, and publish weekly schedules." 
      actionLabel="Create Shift"
      (action)="openShiftDialog()"
    />

    <section class="scheduling-shell">
      <!-- Summary Ribbon -->
      <div class="summary-ribbon">
        <mat-card class="summary-box">
          <label>Total Shifts</label>
          <div class="value">{{ shifts().length }}</div>
          <p class="delta">Scheduled this week</p>
        </mat-card>
        <mat-card class="summary-box">
          <label>Coverage Gap</label>
          <div class="value warn">24h</div>
          <p class="delta">Needs attention</p>
        </mat-card>
        <mat-card class="summary-box">
          <label>Published</label>
          <div class="value good">85%</div>
          <p class="delta">Of total roster</p>
        </mat-card>
      </div>

      <!-- Weekly Grid Placeholder -->
      <div class="roster-view mt-6">
        <mat-card class="data-card">
          <div class="card-header">
            <h3>Active Weekly Roster</h3>
            <div class="header-actions">
              <button mat-stroked-button class="mr-2">Previous Week</button>
              <button mat-stroked-button class="mr-2">Next Week</button>
              <button mat-flat-button color="primary">Publish All</button>
            </div>
          </div>
          
          <table mat-table [dataSource]="shifts()" class="w-full">
            <ng-container matColumnDef="employee">
              <th mat-header-cell *matHeaderCellDef>Employee</th>
              <td mat-cell *matCellDef="let row">
                <div class="user-cell">
                  <div class="mini-avatar">{{row.employeeId}}</div>
                  <strong>Staff #{{row.employeeId}}</strong>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="time">
              <th mat-header-cell *matHeaderCellDef>Shift Time</th>
              <td mat-cell *matCellDef="let row">
                <div class="time-block">
                  <span>{{row.startTime | date:'shortTime'}} - {{row.endTime | date:'shortTime'}}</span>
                  <p class="date-sub">{{row.startTime | date:'mediumDate'}}</p>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let row">
                <app-status-badge [value]="row.status" />
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row" class="text-right">
                <button mat-icon-button (click)="openShiftDialog(row)"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button color="warn"><mat-icon>delete</mat-icon></button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="['employee', 'time', 'status', 'actions']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['employee', 'time', 'status', 'actions'];"></tr>
          </table>
          @if (shifts().length === 0) {
            <div class="empty-state">No shifts found for the current period.</div>
          }
        </mat-card>
      </div>
    </section>
  `,
  styles: [`
    .scheduling-shell { margin-top: 1.5rem; }
    .summary-ribbon { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
    .summary-box { padding: 1.25rem; border-radius: 1rem; border: 1px solid #e2e8f0; }
    .summary-box label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
    .summary-box .value { font-size: 1.75rem; font-weight: 800; margin: 0.25rem 0; color: #1e293b; }
    .summary-box .value.warn { color: #f59e0b; }
    .summary-box .value.good { color: #10b981; }
    .summary-box .delta { margin: 0; font-size: 0.75rem; color: #64748b; }

    .mt-6 { margin-top: 1.5rem; }
    .w-full { width: 100%; }
    .text-right { text-align: right; }
    .mr-2 { margin-right: 0.5rem; }

    .data-card { border-radius: 1.2rem; border: 1px solid #e2e8f0; overflow-x: auto; padding: 0; }
    .card-header { padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
    .card-header h3 { margin: 0; font-size: 1rem; font-weight: 700; color: #1e293b; }
    
    th { background: #f8fafc; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; font-weight: 700; color: #64748b; }
    td { border-bottom: 1px solid #f1f5f9; padding: 1rem !important; }

    .user-cell { display: flex; align-items: center; gap: 0.75rem; }
    .mini-avatar { width: 2rem; height: 2.2rem; border-radius: 0.5rem; background: #eff6ff; color: #2563eb; display: grid; place-items: center; font-weight: 800; font-size: 0.75rem; }
    
    .time-block { display: flex; flex-direction: column; }
    .date-sub { margin: 0; font-size: 0.75rem; color: #64748b; }
    .empty-state { padding: 3rem; text-align: center; color: #94a3b8; font-weight: 500; }

    @media (max-width: 768px) {
      .card-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .header-actions { width: 100%; display: flex; gap: 0.5rem; }
      .header-actions button { flex: 1; font-size: 0.7rem; padding: 0 0.5rem; }
    }
  `]
})
export class SchedulingPageComponent {
  private readonly scheduleApi = inject(SchedulingService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly shifts = toSignal(this.scheduleApi.getShifts(), { initialValue: [] });

  protected openShiftDialog(shift?: Shift): void {
    const dialogRef = this.dialog.open(ShiftEditDialog, {
      width: '500px',
      data: { shift }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.snack.open('Shift updated successfully', 'OK', { duration: 3000 });
        window.location.reload();
      }
    });
  }
}

@Component({
  selector: 'app-shift-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.shift ? 'Edit Shift' : 'Create New Shift' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-4 mt-2">
        <mat-form-field appearance="outline">
          <mat-label>Employee</mat-label>
          <mat-select formControlName="employeeId">
            @for (emp of employees(); track emp.id) {
              <mat-option [value]="emp.id">{{emp.firstName}} {{emp.lastName}}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Start Time</mat-label>
            <input matInput type="datetime-local" formControlName="startTime">
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>End Time</mat-label>
            <input matInput type="datetime-local" formControlName="endTime">
          </mat-form-field>
        </div>

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Location</mat-label>
            <mat-select formControlName="locationId">
              @for (loc of locations(); track loc.id) {
                <mat-option [value]="loc.id">{{loc.name}}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="DRAFT">Draft</mat-option>
              <mat-option value="PUBLISHED">Published</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Save Shift</button>
    </mat-dialog-actions>
  `,
  styles: [`.flex { display: flex; } .flex-col { flex-direction: column; } .gap-4 { gap: 1rem; } .flex-1 { flex: 1; }`]
})
export class ShiftEditDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly dialogRef = inject(MatDialogRef<ShiftEditDialog>);
  private readonly scheduleApi = inject(SchedulingService);
  private readonly empApi = inject(EmployeeDataService);
  private readonly orgApi = inject(OrganizationService);
  protected readonly data = inject<{ shift?: Shift }>(MAT_DIALOG_DATA);

  protected readonly employees = toSignal(this.empApi.getEmployees(), { initialValue: [] });
  protected readonly locations = toSignal(this.orgApi.getLocations(), { initialValue: [] });

  protected readonly form = this.fb.group({
    employeeId: [this.data.shift?.employeeId || null, Validators.required],
    startTime: [this.data.shift?.startTime ? this.formatDate(this.data.shift.startTime) : '', Validators.required],
    endTime: [this.data.shift?.endTime ? this.formatDate(this.data.shift.endTime) : '', Validators.required],
    locationId: [this.data.shift?.locationId || null, Validators.required],
    departmentId: [this.data.shift?.departmentId || 1],
    status: [this.data.shift?.status || 'DRAFT', Validators.required],
    notes: [this.data.shift?.notes || '']
  });

  private formatDate(dateStr: string): string {
    return new Date(dateStr).toISOString().slice(0, 16);
  }

  save() {
    const raw = this.form.getRawValue();
    // Convert local time to ISO Instant
    const shiftData = {
      ...raw,
      startTime: new Date(raw.startTime!).toISOString(),
      endTime: new Date(raw.endTime!).toISOString()
    };

    const obs = this.data.shift 
      ? this.scheduleApi.updateShift(this.data.shift.id, shiftData as any)
      : this.scheduleApi.createShift(shiftData as any);

    obs.subscribe(() => this.dialogRef.close(true));
  }
}
