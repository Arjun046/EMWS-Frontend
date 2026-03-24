import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { LeaveService, LeaveRequest, LeaveBalance, LeaveStatus, LeaveType } from '../../core/services/leave.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-leaves-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatDividerModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    DatePipe
  ],
  template: `
    <app-page-header 
      title="Leave Management" 
      subtitle="Track time off requests, monitor team availability, and manage entitlement balances." 
      actionLabel="Request Leave"
      (action)="openRequestDialog()"
    />

    <section class="leaves-shell">
      <!-- Entitlement Balances -->
      <div class="balances-grid">
        @for (bal of balances(); track bal.id) {
          <mat-card class="balance-card">
            <div class="balance-header">
              <span class="type-label">{{ bal.leaveType }}</span>
              <mat-icon color="primary">event_available</mat-icon>
            </div>
            <div class="balance-value">{{ bal.totalEntitled - bal.used - bal.pending }}d</div>
            <p class="balance-sub">Remaining from {{ bal.totalEntitled }} days</p>
            <div class="progress-track">
              <div class="progress-fill" [style.width.%]="(bal.used / bal.totalEntitled) * 100"></div>
            </div>
          </mat-card>
        }
      </div>

      <mat-tab-group class="mt-6">
        <mat-tab label="Team Requests">
          <div class="tab-content mt-4">
            <mat-card class="data-card">
              <table mat-table [dataSource]="pendingRequests()" class="w-full">
                <ng-container matColumnDef="employee">
                  <th mat-header-cell *matHeaderCellDef>Employee</th>
                  <td mat-cell *matCellDef="let row"><strong>Staff #{{row.employeeId}}</strong></td>
                </ng-container>
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>Leave Type</th>
                  <td mat-cell *matCellDef="let row">{{row.leaveType}}</td>
                </ng-container>
                <ng-container matColumnDef="period">
                  <th mat-header-cell *matHeaderCellDef>Period</th>
                  <td mat-cell *matCellDef="let row">
                    {{row.startDate | date:'shortDate'}} - {{row.endDate | date:'shortDate'}}
                  </td>
                </ng-container>
                <ng-container matColumnDef="reason">
                  <th mat-header-cell *matHeaderCellDef>Reason</th>
                  <td mat-cell *matCellDef="let row" class="reason-cell">{{row.reason}}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let row" class="text-right">
                    <button mat-flat-button color="primary" class="mr-2" (click)="approveRequest(row)">Approve</button>
                    <button mat-stroked-button color="warn" (click)="rejectRequest(row)">Reject</button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['employee', 'type', 'period', 'reason', 'actions']"></tr>
                <tr mat-row *matRowDef="let row; columns: ['employee', 'type', 'period', 'reason', 'actions'];"></tr>
              </table>
              @if (pendingRequests().length === 0) {
                <div class="empty-state">No pending requests to review.</div>
              }
            </mat-card>
          </div>
        </mat-tab>

        <mat-tab label="My Request History">
          <div class="tab-content mt-4">
            <mat-card class="data-card">
              <table mat-table [dataSource]="myRequests()" class="w-full">
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let row"><strong>{{row.leaveType}}</strong></td>
                </ng-container>
                <ng-container matColumnDef="period">
                  <th mat-header-cell *matHeaderCellDef>Period</th>
                  <td mat-cell *matCellDef="let row">
                    {{row.startDate | date:'mediumDate'}} - {{row.endDate | date:'mediumDate'}}
                  </td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let row">
                    <app-status-badge [value]="row.status" />
                  </td>
                </ng-container>
                <ng-container matColumnDef="comments">
                  <th mat-header-cell *matHeaderCellDef>Feedback</th>
                  <td mat-cell *matCellDef="let row" class="text-muted">{{row.managerComments || '-'}}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['type', 'period', 'status', 'comments']"></tr>
                <tr mat-row *matRowDef="let row; columns: ['type', 'period', 'status', 'comments'];"></tr>
              </table>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>
    </section>
  `,
  styles: [`
    .leaves-shell { margin-top: 1.5rem; }
    .balances-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.5rem; }
    .balance-card { padding: 1.5rem; border-radius: 1.2rem; border: 1px solid #e2e8f0; }
    .balance-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .type-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
    .balance-value { font-size: 2rem; font-weight: 800; color: #1e293b; margin-bottom: 0.25rem; }
    .balance-sub { margin: 0; font-size: 0.8rem; color: #64748b; margin-bottom: 1rem; }
    .progress-track { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; background: #3b82f6; border-radius: 3px; }

    .mt-6 { margin-top: 1.5rem; }
    .mt-4 { margin-top: 1rem; }
    .w-full { width: 100%; }
    .text-right { text-align: right; }
    .mr-2 { margin-right: 0.5rem; }
    
    .data-card { border-radius: 1.2rem; border: 1px solid #e2e8f0; overflow-x: auto; padding: 0; }
    .enterprise-grid { min-width: 800px; }
    th { background: #f8fafc; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; font-weight: 700; color: #64748b; }
    td { border-bottom: 1px solid #f1f5f9; padding: 1rem !important; }
    
    .reason-cell { max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #64748b; font-size: 0.85rem; }
    .empty-state { padding: 3rem; text-align: center; color: #94a3b8; font-weight: 500; }

    @media (max-width: 640px) {
      .balances-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class LeavesPageComponent {
  private readonly leaveApi = inject(LeaveService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  // Mocking current user ID as 1 for demonstration
  private readonly currentUserId = 1;

  protected readonly balances = toSignal(this.leaveApi.getBalances(this.currentUserId), { initialValue: [] });
  protected readonly pendingRequests = toSignal(this.leaveApi.getRequestsByStatus(LeaveStatus.PENDING), { initialValue: [] });
  protected readonly myRequests = toSignal(this.leaveApi.getEmployeeRequests(this.currentUserId), { initialValue: [] });

  protected openRequestDialog(): void {
    const dialogRef = this.dialog.open(LeaveRequestDialog, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.snack.open('Leave request submitted successfully', 'OK', { duration: 3000 });
        window.location.reload();
      }
    });
  }

  protected approveRequest(req: LeaveRequest): void {
    this.leaveApi.updateStatus(req.id, LeaveStatus.APPROVED, 'Approved by manager').subscribe(() => {
      this.snack.open('Request approved', 'OK', { duration: 3000 });
      window.location.reload();
    });
  }

  protected rejectRequest(req: LeaveRequest): void {
    const comments = prompt('Reason for rejection?');
    if (comments !== null) {
      this.leaveApi.updateStatus(req.id, LeaveStatus.REJECTED, comments).subscribe(() => {
        this.snack.open('Request rejected', 'OK', { duration: 3000 });
        window.location.reload();
      });
    }
  }
}

@Component({
  selector: 'app-leave-request-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Request Time Off</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-4 mt-2">
        <mat-form-field appearance="outline">
          <mat-label>Leave Type</mat-label>
          <mat-select formControlName="leaveType">
            <mat-option value="VACATION">Vacation</mat-option>
            <mat-option value="SICK">Sick Leave</mat-option>
            <mat-option value="PERSONAL">Personal</mat-option>
            <mat-option value="BEREAVEMENT">Bereavement</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Start Date</mat-label>
            <input matInput type="date" formControlName="startDate">
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>End Date</mat-label>
            <input matInput type="date" formControlName="endDate">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Reason / Comments</mat-label>
          <textarea matInput formControlName="reason" rows="3" placeholder="Brief explanation for your request"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Submit Request</button>
    </mat-dialog-actions>
  `,
  styles: [`.flex { display: flex; } .flex-col { flex-direction: column; } .gap-4 { gap: 1rem; } .flex-1 { flex: 1; }`]
})
export class LeaveRequestDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly dialogRef = inject(MatDialogRef<LeaveRequestDialog>);
  private readonly leaveApi = inject(LeaveService);

  protected readonly form = this.fb.group({
    employeeId: [1], // Hardcoded for demo
    leaveType: ['VACATION', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    reason: ['', Validators.required]
  });

  save() {
    this.leaveApi.createRequest(this.form.getRawValue() as any).subscribe(() => {
      this.dialogRef.close(true);
    });
  }
}
