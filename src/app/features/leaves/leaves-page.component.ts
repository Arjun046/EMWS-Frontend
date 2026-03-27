import { Component, inject, signal, computed, OnInit } from '@angular/core';
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
import { AuthService } from '../../core/services/auth.service';
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
      [actionLabel]="'Request Leave'"
      (action)="openRequestDialog()"
    >
      <div class="header-extra flex items-center gap-4 mr-4">
        <div class="balance-pill" *ngIf="vacationBalance() as bal">
          <span class="label">Vacation Balance:</span>
          <span class="value">{{ bal.totalEntitled - bal.used - bal.pending }} days</span>
        </div>
      </div>
    </app-page-header>

    <section class="leaves-shell">
      <!-- Entitlement Balances -->
      <div class="balances-grid">
        @for (bal of balances(); track bal.id) {
          <mat-card class="balance-card">
            <div class="balance-header">
              <span class="type-label">{{ bal.leaveType }}</span>
              <mat-icon [color]="bal.leaveType === 'VACATION' ? 'primary' : 'accent'">
                {{ bal.leaveType === 'VACATION' ? 'beach_access' : 'medical_services' }}
              </mat-icon>
            </div>
            <div class="balance-value">{{ bal.totalEntitled - bal.used - bal.pending }}d</div>
            <div class="balance-footer">
              <div class="usage-stats">
                <span>{{ bal.used }} used</span>
                <span>•</span>
                <span>{{ bal.pending }} pending</span>
              </div>
              <div class="progress-track mt-2">
                <div class="progress-fill" [style.width.%]="(bal.used / bal.totalEntitled) * 100"></div>
              </div>
            </div>
          </mat-card>
        }
      </div>

      <mat-tab-group class="mt-8 enterprise-tabs">
        @if (isAdminOrManager()) {
          <mat-tab label="Team Approval Queue">
            <div class="tab-content mt-6">
              <mat-card class="data-card overflow-hidden">
                <div class="p-4 bg-slate-50 border-b flex justify-between items-center">
                  <h3 class="font-bold m-0">Pending Review ({{ pendingRequests().length }})</h3>
                  <button mat-button color="primary" class="font-bold" (click)="bulkApprove()" *ngIf="pendingRequests().length > 0">
                    <mat-icon>done_all</mat-icon> Bulk Approve All
                  </button>
                </div>
                <table mat-table [dataSource]="pendingRequests()" class="w-full">
                  <ng-container matColumnDef="employee">
                    <th mat-header-cell *matHeaderCellDef>Staff Member</th>
                    <td mat-cell *matCellDef="let row">
                      <div class="flex items-center gap-3">
                        <div class="mini-avatar">{{ row.employeeId }}</div>
                        <strong>Staff #{{row.employeeId}}</strong>
                      </div>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="type">
                    <th mat-header-cell *matHeaderCellDef>Leave Type</th>
                    <td mat-cell *matCellDef="let row">
                      <span class="type-badge">{{row.leaveType}}</span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="period">
                    <th mat-header-cell *matHeaderCellDef>Period</th>
                    <td mat-cell *matCellDef="let row">
                      <div class="period-cell">
                        <strong>{{row.startDate | date:'mediumDate'}}</strong>
                        <span class="text-xs text-slate-400">to {{row.endDate | date:'mediumDate'}}</span>
                      </div>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="reason">
                    <th mat-header-cell *matHeaderCellDef>Reason</th>
                    <td mat-cell *matCellDef="let row" class="reason-cell">{{row.reason}}</td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let row" class="text-right">
                      <div class="flex gap-2 justify-end">
                        <button mat-flat-button color="primary" (click)="approveRequest(row)">Approve</button>
                        <button mat-stroked-button color="warn" (click)="rejectRequest(row)">Reject</button>
                      </div>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="['employee', 'type', 'period', 'reason', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['employee', 'type', 'period', 'reason', 'actions'];"></tr>
                </table>
                @if (pendingRequests().length === 0) {
                  <div class="empty-state py-12">
                    <mat-icon class="text-slate-200 text-5xl mb-2">fact_check</mat-icon>
                    <p>All clear! No pending requests to review.</p>
                  </div>
                }
              </mat-card>
            </div>
          </mat-tab>
        }

        <mat-tab label="My Time Off History">
          <div class="tab-content mt-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-bold m-0">Personal History</h3>
              <div class="view-toggle">
                <button mat-icon-button [color]="viewMode() === 'list' ? 'primary' : ''" (click)="viewMode.set('list')" title="List View">
                  <mat-icon>view_list</mat-icon>
                </button>
                <button mat-icon-button [color]="viewMode() === 'calendar' ? 'primary' : ''" (click)="viewMode.set('calendar')" title="Calendar View">
                  <mat-icon>calendar_month</mat-icon>
                </button>
              </div>
            </div>

            @if (viewMode() === 'list') {
              <mat-card class="data-card overflow-hidden">
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
            } @else {
              <mat-card class="calendar-card p-6">
                <div class="calendar-header flex justify-between items-center mb-6">
                  <button mat-icon-button (click)="prevMonth()"><mat-icon>chevron_left</mat-icon></button>
                  <h2 class="m-0 font-black text-xl">{{ currentMonthName }} {{ currentYear }}</h2>
                  <button mat-icon-button (click)="nextMonth()"><mat-icon>chevron_right</mat-icon></button>
                </div>
                
                <div class="calendar-grid">
                  <div class="weekday" *ngFor="let day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']">{{ day }}</div>
                  <div class="day-cell empty" *ngFor="let blank of calendarBlanks"></div>
                  <div class="day-cell" *ngFor="let date of calendarDays" [class.today]="isToday(date)">
                    <span class="day-num">{{ date }}</span>
                    <div class="day-events">
                      @for (leave of getLeavesForDate(date); track leave.id) {
                        <div class="leave-indicator" [class]="leave.status.toLowerCase()" [title]="leave.leaveType"></div>
                      }
                    </div>
                  </div>
                </div>

                <div class="calendar-legend mt-6 flex gap-4">
                  <div class="legend-item"><span class="dot approved"></span> Approved</div>
                  <div class="legend-item"><span class="dot pending"></span> Pending</div>
                  <div class="legend-item"><span class="dot rejected"></span> Rejected</div>
                </div>
              </mat-card>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </section>
  `,
  styles: [`
    .leaves-shell { margin-top: 1.5rem; }
    .balances-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
    .balance-card { padding: 1.5rem; border-radius: 1.5rem; border: 1px solid #e2e8f0; box-shadow: none !important; }
    .balance-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .type-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.1em; }
    .balance-value { font-size: 2.5rem; font-weight: 900; color: #1e293b; margin-bottom: 0.25rem; }
    .usage-stats { display: flex; gap: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #64748b; }
    .progress-track { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: #3b82f6; border-radius: 4px; }

    .balance-pill { background: #3b82f615; color: #3b82f6; padding: 0.5rem 1rem; border-radius: 999px; display: flex; gap: 0.5rem; align-items: center; font-weight: 700; font-size: 0.85rem; }
    .balance-pill .label { opacity: 0.8; }
    .balance-pill .value { font-weight: 900; }

    .mini-avatar { width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background: #f1f5f9; display: grid; place-items: center; font-weight: 800; font-size: 0.8rem; color: #64748b; }
    .type-badge { font-size: 0.65rem; font-weight: 800; background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.2rem 0.5rem; border-radius: 6px; color: #64748b; }
    .period-cell { display: flex; flex-direction: column; }
    
    .view-toggle { background: #f1f5f9; padding: 0.25rem; border-radius: 0.75rem; }
    
    /* Calendar Styles */
    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0; border-radius: 0.75rem; overflow: hidden; }
    .weekday { background: #f8fafc; padding: 1rem; text-align: center; font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; }
    .day-cell { background: white; min-height: 100px; padding: 0.75rem; display: flex; flex-direction: column; position: relative; }
    .day-cell.empty { background: #f8fafc; }
    .day-num { font-weight: 800; color: #64748b; font-size: 0.9rem; }
    .day-cell.today { background: #eff6ff; }
    .day-cell.today .day-num { color: #3b82f6; }
    .day-events { margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 4px; }
    .leave-indicator { width: 100%; height: 6px; border-radius: 3px; }
    .leave-indicator.approved { background: #22c55e; }
    .leave-indicator.pending { background: #f59e0b; }
    .leave-indicator.rejected { background: #ef4444; }

    .legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; font-weight: 700; color: #64748b; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot.approved { background: #22c55e; }
    .dot.pending { background: #f59e0b; }
    .dot.rejected { background: #ef4444; }

    .empty-state { padding: 3rem; text-align: center; color: #94a3b8; }

    @media (max-width: 768px) {
      .day-cell { min-height: 60px; padding: 0.4rem; }
      .weekday { padding: 0.5rem; font-size: 0.6rem; }
    }
  `]
})
export class LeavesPageComponent implements OnInit {
  private readonly leaveApi = inject(LeaveService);
  protected readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly viewMode = signal<'list' | 'calendar'>('list');
  
  // Date tracking for calendar
  private readonly currentDate = new Date();
  protected calendarMonth = this.currentDate.getMonth();
  protected currentYear = this.currentDate.getFullYear();

  protected readonly balances = toSignal(this.leaveApi.getBalances(this.auth.user()?.id || 1), { initialValue: [] });
  protected readonly pendingRequests = toSignal(this.leaveApi.getRequestsByStatus(LeaveStatus.PENDING), { initialValue: [] });
  protected readonly myRequests = toSignal(this.leaveApi.getEmployeeRequests(this.auth.user()?.id || 1), { initialValue: [] });

  protected readonly vacationBalance = computed(() => 
    this.balances().find(b => b.leaveType === 'VACATION')
  );

  ngOnInit() {}

  protected isAdminOrManager(): boolean {
    const role = this.auth.user()?.role;
    return role === 'ADMIN' || role === 'MANAGER';
  }

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
      this.refreshData();
    });
  }

  protected bulkApprove(): void {
    const pending = this.pendingRequests();
    if (pending.length === 0) return;

    if (confirm(`Are you sure you want to approve all ${pending.length} requests?`)) {
      this.snack.open(`Processing ${pending.length} approvals...`, 'OK', { duration: 2000 });
      
      let completed = 0;
      pending.forEach(req => {
        this.leaveApi.updateStatus(req.id, LeaveStatus.APPROVED, 'Bulk approved by manager').subscribe({
          next: () => {
            completed++;
            if (completed === pending.length) {
              this.snack.open('All requests approved successfully', 'OK', { duration: 3000 });
              this.refreshData();
            }
          },
          error: () => {
            completed++;
            this.snack.open(`Error approving request for employee ${req.employeeId}`, 'OK', { duration: 3000 });
            if (completed === pending.length) this.refreshData();
          }
        });
      });
    }
  }

  protected rejectRequest(req: LeaveRequest): void {
    const comments = prompt('Reason for rejection?');
    if (comments !== null) {
      this.leaveApi.updateStatus(req.id, LeaveStatus.REJECTED, comments).subscribe(() => {
        this.snack.open('Request rejected', 'OK', { duration: 3000 });
        this.refreshData();
      });
    }
  }

  private refreshData(): void {
    // In a real app, signals would be updated or the API would be re-called
    // Since we are using toSignal with an observable, we might need a trigger signal
    // For now, I'll manually re-trigger the fetches if possible, 
    // but the cleanest way is to use a refresh trigger signal.
    window.location.reload(); // Reverting to reload temporarily as toSignal is not easily refreshable without a trigger
  }

  // Calendar Helpers
  get currentMonthName(): string {
    return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(this.currentYear, this.calendarMonth));
  }

  get calendarDays(): number[] {
    const daysInMonth = new Date(this.currentYear, this.calendarMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }

  get calendarBlanks(): number[] {
    const firstDay = new Date(this.currentYear, this.calendarMonth, 1).getDay();
    return Array.from({ length: firstDay }, (_, i) => i);
  }

  isToday(day: number): boolean {
    const d = new Date();
    return d.getDate() === day && d.getMonth() === this.calendarMonth && d.getFullYear() === this.currentYear;
  }

  getLeavesForDate(day: number): LeaveRequest[] {
    const d = new Date(this.currentYear, this.calendarMonth, day).toISOString().split('T')[0];
    return this.myRequests().filter(l => {
      const start = l.startDate.split('T')[0];
      const end = l.endDate.split('T')[0];
      return d >= start && d <= end;
    });
  }

  prevMonth() {
    if (this.calendarMonth === 0) {
      this.calendarMonth = 11;
      this.currentYear--;
    } else {
      this.calendarMonth--;
    }
  }

  nextMonth() {
    if (this.calendarMonth === 11) {
      this.calendarMonth = 0;
      this.currentYear++;
    } else {
      this.calendarMonth++;
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
  private readonly auth = inject(AuthService);

  protected readonly form = this.fb.group({
    employeeId: [this.auth.user()?.id || 1],
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
