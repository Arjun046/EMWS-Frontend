import { Component, effect, inject, signal, computed, OnInit } from '@angular/core';
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
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SchedulingService, Shift, ShiftConflictRecord, ShiftConflictResponse } from '../../core/services/scheduling.service';
import { EmployeeDataService } from '../../core/services/employee-data.service';
import { OrganizationService } from '../../core/services/organization.service';
import { WidgetSocketService } from '../../core/services/widget-socket.service';
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
    MatButtonToggleModule,
    DragDropModule,
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
        <mat-card class="summary-box good">
          <label>Published Coverage</label>
          <div class="value">{{ coveragePercentage() }}%</div>
          <p class="delta">Goal: 95%</p>
        </mat-card>
        <mat-card class="summary-box warn">
          <label>Coverage Gaps</label>
          <div class="value">{{ shiftsWithoutStaff().length }}</div>
          <p class="delta">Unassigned shifts</p>
        </mat-card>
        <mat-card class="summary-box alert" [class.danger]="conflicts().length > 0">
          <label>Schedule Conflicts</label>
          <div class="value">{{ conflicts().length }}</div>
          <p class="delta">{{ conflicts().length > 0 ? 'Resolution required' : 'All clear' }}</p>
        </mat-card>
      </div>

      <div class="roster-view mt-6">
        <mat-card class="data-card overflow-hidden">
          <div class="card-header bg-slate-50 border-b">
            <div class="flex items-center gap-4">
              <h3 class="font-bold m-0">Shift Registry</h3>
              <mat-button-toggle-group [value]="viewMode()" (change)="viewMode.set($event.value)">
                <mat-button-toggle value="list"><mat-icon>list</mat-icon></mat-button-toggle>
                <mat-button-toggle value="week"><mat-icon>view_week</mat-icon></mat-button-toggle>
              </mat-button-toggle-group>
            </div>
            
            <div class="header-actions">
              <button mat-stroked-button class="mr-2">Previous Week</button>
              <button mat-stroked-button class="mr-2">Next Week</button>
              <button mat-flat-button color="primary">Publish All</button>
            </div>
          </div>
          
          @if (viewMode() === 'list') {
            <table mat-table [dataSource]="shifts()" class="w-full">
              <ng-container matColumnDef="employee">
                <th mat-header-cell *matHeaderCellDef>Employee</th>
                <td mat-cell *matCellDef="let row">
                  <div class="user-cell">
                    <div class="mini-avatar" [style.background-color]="row.employeeId ? '#eff6ff' : '#fef2f2'">
                      {{row.employeeId || '?'}}
                    </div>
                    <div class="flex flex-col">
                      <strong>{{ row.employeeId ? 'Staff #' + row.employeeId : 'Unassigned' }}</strong>
                      <span class="text-xs text-slate-400">Main Location</span>
                    </div>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="time">
                <th mat-header-cell *matHeaderCellDef>Shift Interval</th>
                <td mat-cell *matCellDef="let row">
                  <div class="time-block">
                    <span class="font-bold text-slate-900">{{row.startTime | date:'shortTime'}} - {{row.endTime | date:'shortTime'}}</span>
                    <p class="date-sub">{{row.startTime | date:'EEEE, MMM d'}}</p>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Audit</th>
                <td mat-cell *matCellDef="let row">
                  <div class="flex items-center gap-2">
                    <app-status-badge [value]="row.status" />
                    @if (hasConflict(row)) {
                      <mat-icon class="text-red-500" title="Overlapping Shift Detected">warning</mat-icon>
                    }
                  </div>
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
              <tr mat-row *matRowDef="let row; columns: ['employee', 'time', 'status', 'actions'];" [class.row-conflict]="hasConflict(row)"></tr>
            </table>
          } @else {
            <div class="week-grid-container p-4" cdkDropListGroup>
              <div class="week-row">
                @for (day of weekDays(); track day.date) {
                  <div class="day-column">
                    <div class="day-header">
                      <span class="day-name">{{ day.name }}</span>
                      <span class="day-date">{{ day.date | date:'MMM d' }}</span>
                    </div>
                    <div class="shift-list" 
                         cdkDropList 
                         [cdkDropListData]="getShiftsForDay(day.date)"
                         (cdkDropListDropped)="onShiftDropped($event, day.date)">
                      @for (shift of getShiftsForDay(day.date); track shift.id) {
                        <div class="shift-card" cdkDrag [cdkDragData]="shift" [class.is-conflict]="hasConflict(shift)">
                          <div class="shift-time">{{ shift.startTime | date:'shortTime' }} - {{ shift.endTime | date:'shortTime' }}</div>
                          <div class="shift-staff">Staff #{{ shift.employeeId || '?' }}</div>
                          @if (hasConflict(shift)) {
                            <mat-icon class="conflict-icon">warning</mat-icon>
                          }
                          <div class="shift-placeholder" *cdkDragPlaceholder></div>
                        </div>
                      }
                      @if (getShiftsForDay(day.date).length === 0) {
                        <div class="day-empty">No shifts</div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }

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
    .summary-box { padding: 1.5rem; border-radius: 1.5rem; border: 1px solid #e2e8f0; box-shadow: none !important; }
    .summary-box label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.1em; }
    .summary-box .value { font-size: 2.25rem; font-weight: 900; margin: 0.25rem 0; color: #1e293b; }
    .summary-box.good { border-left: 4px solid #10b981; }
    .summary-box.warn { border-left: 4px solid #f59e0b; }
    .summary-box.alert { border-left: 4px solid #cbd5e1; }
    .summary-box.alert.danger { border-left-color: #ef4444; background: #fef2f2; }
    .summary-box.alert.danger .value { color: #ef4444; }
    .summary-box .delta { margin: 0; font-size: 0.8rem; font-weight: 600; color: #64748b; }

    .mt-6 { margin-top: 1.5rem; }
    .w-full { width: 100%; }
    .text-right { text-align: right; }
    .mr-2 { margin-right: 0.5rem; }

    .data-card { border-radius: 1.5rem; border: 1px solid #e2e8f0; box-shadow: none !important; }
    .card-header { padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; }
    .card-header h3 { font-size: 1.1rem; font-weight: 800; color: #0f172a; }
    
    th { background: #f8fafc; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.1em; font-weight: 800; color: #64748b; }
    td { border-bottom: 1px solid #f1f5f9; padding: 1rem !important; }

    .user-cell { display: flex; align-items: center; gap: 1rem; }
    .mini-avatar { width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; color: #1e40af; display: grid; place-items: center; font-weight: 900; font-size: 0.9rem; }
    
    .time-block { display: flex; flex-direction: column; }
    .date-sub { margin: 0; font-size: 0.75rem; color: #64748b; font-weight: 500; }
    .empty-state { padding: 4rem 1rem; text-align: center; color: #94a3b8; font-weight: 600; }

    .row-conflict { background-color: #fff1f2; }
    .row-conflict:hover { background-color: #ffe4e6 !important; }

    @media (max-width: 768px) {
      .card-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .header-actions { width: 100%; display: flex; gap: 0.5rem; }
      .header-actions button { flex: 1; font-size: 0.7rem; padding: 0 0.5rem; }
    }

    /* Week Grid Styles */
    .week-grid-container { min-height: 500px; overflow-x: auto; }
    .week-row { display: flex; gap: 1rem; min-width: 1200px; height: 100%; }
    .day-column { flex: 1; min-width: 160px; background: #f8fafc; border-radius: 1rem; display: flex; flex-direction: column; border: 1px solid #e2e8f0; }
    .day-header { padding: 1rem; border-bottom: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; background: #fff; border-radius: 1rem 1rem 0 0; }
    .day-name { font-weight: 800; font-size: 0.75rem; color: #64748b; text-transform: uppercase; }
    .day-date { font-weight: 900; font-size: 1.1rem; color: #1e293b; }
    
    .shift-list { flex: 1; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.75rem; min-height: 200px; }
    .shift-card { background: #fff; padding: 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); cursor: grab; position: relative; transition: transform 0.2s, box-shadow 0.2s; }
    .shift-card:active { cursor: grabbing; }
    .shift-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .shift-time { font-weight: 800; font-size: 0.8rem; color: #1e40af; }
    .shift-staff { font-size: 0.75rem; color: #64748b; margin-top: 0.25rem; font-weight: 600; }
    
    .is-conflict { border-left: 4px solid #ef4444; background: #fef2f2; }
    .conflict-icon { position: absolute; top: 0.5rem; right: 0.5rem; font-size: 1rem; width: 1rem; height: 1rem; color: #ef4444; }

    .day-empty { padding: 2rem 0; text-align: center; color: #cbd5e1; font-size: 0.75rem; font-weight: 600; font-style: italic; }
    
    .cdk-drag-preview { box-sizing: border-box; border-radius: 0.75rem; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
    .cdk-drag-placeholder { opacity: 0.3; }
    .cdk-drag-animating { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
    .shift-list.cdk-drop-list-dragging .shift-card:not(.cdk-drag-placeholder) { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
  `]
})
export class SchedulingPageComponent implements OnInit {
  private readonly scheduleApi = inject(SchedulingService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly socket = inject(WidgetSocketService);

  protected readonly viewMode = signal<'list' | 'week'>('list');
  protected readonly shifts = signal<Shift[]>([]);

  constructor() {
    effect(() => {
      const latestEvent = this.socket.events()[0];
      if (latestEvent?.topic === '/topic/widgets/scheduling') {
        this.loadShifts();
      }
    });
  }

  protected readonly weekDays = computed(() => {
    const days = [];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      days.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.toISOString().split('T')[0]
      });
    }
    return days;
  });

  protected getShiftsForDay(date: string): Shift[] {
    return this.shifts().filter(s => s.startTime.startsWith(date));
  }

  protected onShiftDropped(event: CdkDragDrop<Shift[]>, newDate: string): void {
    const shift = event.item.data as Shift;
    const oldDate = shift.startTime.split('T')[0];
    
    if (oldDate === newDate) return;

    // Update shift date while keeping time
    const startTimeObj = new Date(shift.startTime);
    const endTimeObj = new Date(shift.endTime);
    
    const [year, month, day] = newDate.split('-').map(Number);
    
    startTimeObj.setFullYear(year, month - 1, day);
    endTimeObj.setFullYear(year, month - 1, day);

    const updatedShift = {
      ...shift,
      startTime: startTimeObj.toISOString(),
      endTime: endTimeObj.toISOString()
    };

    this.scheduleApi.updateShift(shift.id, updatedShift).subscribe({
      next: () => {
        this.snack.open(`Shift moved to ${newDate}`, 'OK', { duration: 3000 });
        this.loadShifts();
      },
      error: (error) => this.handleShiftError(error, 'Unable to move shift right now.')
    });
  }

  protected readonly coveragePercentage = computed(() => {
    const total = this.shifts().length;
    if (total === 0) return 0;
    const assigned = this.shifts().filter(s => s.employeeId).length;
    return Math.round((assigned / total) * 100);
  });

  protected readonly shiftsWithoutStaff = computed(() => 
    this.shifts().filter(s => !s.employeeId)
  );

  protected readonly conflicts = computed(() => {
    const list = this.shifts();
    const conflictIds = new Set<number>();
    
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const s1 = list[i];
        const s2 = list[j];
        
        if (s1.employeeId && s1.employeeId === s2.employeeId) {
          const start1 = new Date(s1.startTime).getTime();
          const end1 = new Date(s1.endTime).getTime();
          const start2 = new Date(s2.startTime).getTime();
          const end2 = new Date(s2.endTime).getTime();
          
          if (start1 < end2 && start2 < end1) {
            conflictIds.add(s1.id);
            conflictIds.add(s2.id);
          }
        }
      }
    }
    return Array.from(conflictIds);
  });

  ngOnInit() {
    this.socket.connect();
    this.loadShifts();
  }

  protected hasConflict(shift: Shift): boolean {
    return this.conflicts().includes(shift.id);
  }

  protected openShiftDialog(shift?: Shift): void {
    const dialogRef = this.dialog.open(ShiftEditDialog, {
      width: '500px',
      data: { shift }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.snack.open('Shift saved successfully', 'OK', { duration: 3000 });
        this.loadShifts();
      }
    });
  }

  private loadShifts(): void {
    this.scheduleApi.getShifts().subscribe((shifts) => this.shifts.set(shifts));
  }

  private handleShiftError(error: unknown, fallbackMessage: string): void {
    const conflict = this.scheduleApi.extractShiftConflict(error);
    if (conflict) {
      const details = conflict.data.conflicts.slice(0, 2).map((entry) => formatConflict(entry)).join(' | ');
      this.snack.open(details ? `${conflict.message} ${details}` : conflict.message, 'OK', { duration: 7000 });
      return;
    }

    this.snack.open(fallbackMessage, 'OK', { duration: 3000 });
  }
}

@Component({
  selector: 'app-shift-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatDialogModule, MatSnackBarModule],
  template: `
    <h2 mat-dialog-title>{{ data.shift ? 'Edit Shift' : 'Create New Shift' }}</h2>
    <mat-dialog-content>
      @if (conflictResponse(); as conflict) {
        <div class="conflict-banner">
          <strong>{{ conflict.message }}</strong>
          <ul class="conflict-list">
            @for (item of conflict.data.conflicts; track item.type + '-' + item.recordId) {
              <li>{{ formatConflict(item) }}</li>
            }
          </ul>
        </div>
      }
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
  styles: [`
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .gap-4 { gap: 1rem; }
    .flex-1 { flex: 1; }
    .conflict-banner { margin-bottom: 1rem; padding: 0.75rem 1rem; border-radius: 0.75rem; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    .conflict-list { margin: 0.5rem 0 0; padding-left: 1rem; }
  `]
})
export class ShiftEditDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly dialogRef = inject(MatDialogRef<ShiftEditDialog>);
  private readonly scheduleApi = inject(SchedulingService);
  private readonly snack = inject(MatSnackBar);
  private readonly empApi = inject(EmployeeDataService);
  private readonly orgApi = inject(OrganizationService);
  protected readonly data = inject<{ shift?: Shift }>(MAT_DIALOG_DATA);

  protected readonly employees = toSignal(this.empApi.getEmployees(), { initialValue: [] });
  protected readonly locations = toSignal(this.orgApi.getLocations(), { initialValue: [] });
  protected readonly conflictResponse = signal<ShiftConflictResponse | null>(null);

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
    this.conflictResponse.set(null);
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

    obs.subscribe({
      next: () => this.dialogRef.close(true),
      error: (error) => {
        const conflict = this.scheduleApi.extractShiftConflict(error);
        if (conflict) {
          this.conflictResponse.set(conflict);
          return;
        }
        this.snack.open('Unable to save shift right now.', 'OK', { duration: 3000 });
      }
    });
  }

  protected formatConflict(conflict: ShiftConflictRecord): string {
    return formatConflict(conflict);
  }
}

function formatConflict(conflict: ShiftConflictRecord): string {
  const start = new Date(conflict.startTime);
  const end = new Date(conflict.endTime);

  if (conflict.type === 'LEAVE') {
    return `Approved leave #${conflict.recordId} blocks this assignment from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}.`;
  }

  return `Shift #${conflict.recordId} already runs from ${start.toLocaleString()} to ${end.toLocaleString()}.`;
}
