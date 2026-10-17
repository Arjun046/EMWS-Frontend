import { Component, inject, signal, computed, OnInit, ViewChild, effect } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { AttendanceService, Attendance } from '../../core/services/attendance.service';
import { EmployeeDataService, Employee } from '../../core/services/employee-data.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { WidgetSocketService } from '../../core/services/widget-socket.service';
import { HasScopeDirective } from '../../shared/directives/has-scope.directive';
import { backendErrorMessage } from '../../shared/utils/password-policy';
import { SideSheetDrawerComponent } from '../../shared/components/side-sheet-drawer/side-sheet-drawer.component';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-attendance-page',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatIconModule, MatButtonModule, MatMenuModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatPaginatorModule, MatSortModule,
    ReactiveFormsModule, DatePipe, DecimalPipe, HasScopeDirective, SideSheetDrawerComponent
  ],
  template: `
    <div class="module-page active-page fade-up" id="page-attendance">

      <div class="attendance-grid-layout">

        <!-- WHO'S IN PANEL -->
        <div class="ui-card">
          <div class="ui-card-header">
            <h3>Who's Clocked In</h3>
            <span class="ui-badge ui-badge-success">Live</span>
          </div>
          <p style="font-size:0.75rem; color:var(--txt-muted); margin-bottom:1rem;">Employees currently clocked in. Dots show approximate positions where GPS was shared.</p>

          <div class="terminal-radar-map">
            <div class="radar-grid-lines"></div>
            <div class="radar-sweep"></div>
            <div class="radar-crosshair"></div>

            @for (rec of activeRecords(); track rec.id) {
               <div class="map-ping-dot"
                    [class.selected-node]="selectedRecord?.id === rec.id"
                    [style.top]="getRadarY(rec) + '%'"
                    [style.left]="getRadarX(rec) + '%'"
                    (click)="openViewDrawer(rec)"
                    [title]="getEmployeeName(rec.employeeId)">
                 <span class="ping-label">{{ getInitials(rec.employeeId) }}</span>
               </div>
            }
            @if (activeRecords().length === 0) {
              <div style="position:absolute; inset:0; display:grid; place-items:center; font-size:0.8rem; color:var(--txt-muted);">Nobody clocked in right now.</div>
            }
          </div>

          <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
            <div class="ui-card" style="padding: 1rem; background: var(--surface-2); margin-bottom: 0; border-radius:12px;">
               <span style="font-size: 0.65rem; font-weight: 800; color: var(--txt-muted); text-transform: uppercase; letter-spacing:0.05em;">Clocked in</span>
               <div style="font-size: 1.5rem; font-weight: 900;" id="attendanceActiveNodesCount">{{ activeSessionsCount() }}</div>
            </div>
            <div class="ui-card" style="padding: 1rem; background: var(--surface-2); margin-bottom: 0; border-radius:12px;">
               <span style="font-size: 0.65rem; font-weight: 800; color: var(--txt-muted); text-transform: uppercase; letter-spacing:0.05em;">On-time rate</span>
               <div style="font-size: 1.5rem; font-weight: 900; color: var(--success);" id="attendanceOnTimeRate">{{ onTimePercent() }}%</div>
            </div>
          </div>
        </div>

        <!-- LOG PANEL -->
        <div class="ui-card" style="padding: 0; overflow: visible; border-radius:14px;">
          <div class="ui-card-header" style="padding: 1.5rem 1.5rem 1rem;">
            <h3>Attendance Records</h3>
            <div style="display:flex; gap:0.5rem;">
               <button class="ui-btn ui-btn-primary" (click)="manualClockIn()" *appHasScope="['ATTENDANCE_TEAM_ADJUST', 'ATTENDANCE_ORG_ADJUST']">
                 <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">add</mat-icon> Manual Entry
               </button>
               <button class="ui-btn ui-btn-secondary" style="height:40px; padding:0 1rem; font-size:0.8rem; font-weight:700; border-radius:10px;" (click)="exportCsv()" *appHasScope="['ATTENDANCE_TEAM_READ', 'ATTENDANCE_ORG_READ', 'ATTENDANCE_EXPORT']">
                 <mat-icon style="font-size:18px;">download</mat-icon> Export
               </button>
            </div>
          </div>

          <!-- OVERTIME RADAR (P2 flagship): 4-week projection from /summary/overtime -->
          <div class="overtime-strip" style="display:grid; grid-template-columns:repeat(3,1fr); gap:0.75rem; padding:0 1.5rem 1rem;">
            <div class="ui-card" style="padding:0.9rem 1rem; margin:0; border-radius:12px; background:var(--surface-2);">
              <span style="font-size:0.65rem; font-weight:800; color:var(--txt-muted); text-transform:uppercase;">Overtime (7d)</span>
              <div style="font-size:1.4rem; font-weight:900;" id="attendanceOvertimeWeek">{{ overtimeWeek() | number:'1.1-1' }}h</div>
              <div class="ot-trend" aria-hidden="true">
                @for (v of overtimeTrend(); track $index) {
                  <div class="ot-bar" [style.height.%]="trendHeight(v)" [title]="'W-' + ($index + 1) + ': ' + (v | number:'1.0-0') + 'h'"></div>
                }
              </div>
              <div style="font-size:0.7rem;color:var(--txt-muted);margin-top:0.25rem;">4-week trend · proj {{ projectedOvertime() | number:'1.1-1' }}h next 7d</div>
            </div>
            <div class="ui-card" style="padding:0.9rem 1rem; margin:0; border-radius:12px; background:var(--surface-2);">
              <span style="font-size:0.65rem; font-weight:800; color:var(--txt-muted); text-transform:uppercase;">Break violations (7d)</span>
              <div style="font-size:1.4rem; font-weight:900;" id="attendanceBreakViol">{{ breakViolWeek() }}</div>
            </div>
            <div class="ui-card" style="padding:0.9rem 1rem; margin:0; border-radius:12px; background:var(--surface-2);">
              <span style="font-size:0.65rem; font-weight:800; color:var(--txt-muted); text-transform:uppercase;">Clocked in now</span>
              <div style="font-size:1.4rem; font-weight:900;" id="attendanceClockedIn">{{ clockedInNow() }}</div>
            </div>
          </div>

          <div class="filter-action-row" style="padding: 0 1.5rem 1rem;">
            <div class="input-icon-wrap" style="width:100%;">
              <mat-icon style="font-size:18px; width:18px; height:18px; left:0.75rem; color:var(--txt-muted)">search</mat-icon>
              <input type="text" class="f-input" style="padding-left:2.5rem; height:42px; border-radius:10px;"
                     (keyup)="applyFilter($event)" placeholder="Search by name, ID, or status…" aria-label="Filter attendance on this page">
            </div>
          </div>

          @if (isLoading()) {
            <div class="table-loading-overlay" style="padding:4rem; text-align:center;">
              <mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner>
              <p style="margin-top:1rem; color:var(--txt-muted); font-size:0.85rem;">Loading attendance…</p>
            </div>
          } @else {
            <div class="table-container custom-scrollbar">
              <table mat-table [dataSource]="dataSource" matSort (matSortChange)="onSort($event)" class="ui-table" aria-label="Attendance records">

                <ng-container matColumnDef="identity">
                  <th mat-header-cell *matHeaderCellDef>Employee</th>
                  <td mat-cell *matCellDef="let rec">
                    <div style="line-height:1.2">
                      <strong style="font-size:0.85rem;">{{ getEmployeeName(rec.employeeId) }}</strong><br>
                      <span class="text-mono" style="font-size:11px; color:var(--txt-muted)">EMP-{{ rec.employeeId }}</span>
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="in">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Clock In</th>
                  <td mat-cell *matCellDef="let rec">
                    <div class="text-mono" style="font-size:0.85rem; font-weight:700;">{{ rec.clockIn | date:'HH:mm:ss' }}</div>
                    <div style="font-size:10px; color:var(--txt-muted)">{{ rec.clockIn | date:'MMM d, y' }}</div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="out">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Clock Out</th>
                    <td mat-cell *matCellDef="let rec">
                      <div class="text-mono" style="font-size:0.85rem; font-weight:700;" [style.color]="rec.clockOut ? 'inherit' : 'var(--primary)'">
                        {{ rec.clockOut ? (rec.clockOut | date:'HH:mm:ss') : 'Clocked in' }}
                      </div>
                    <div style="font-size:10px; color:var(--txt-muted)" *ngIf="rec.clockOut">{{ rec.clockOut | date:'MMM d, y' }}</div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="hours">
                  <th mat-header-cell *matHeaderCellDef>Duration</th>
                  <td mat-cell *matCellDef="let rec" class="text-mono">
                    {{ rec.totalHours ? (rec.totalHours | number:'1.1-1') + 'h' : '--' }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="integrity">
                   <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
                   <td mat-cell *matCellDef="let rec">
                     <span class="ui-badge" [class.ui-badge-success]="!rec.isLate" [class.ui-badge-warning]="rec.isLate">
                       {{ rec.isLate ? 'Late' : 'On time' }}
                     </span>
                   </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef style="text-align:right; width:80px;"></th>
                  <td mat-cell *matCellDef="let rec" style="text-align:right;">
                    <button mat-icon-button [matMenuTriggerFor]="menu" class="action-trigger" aria-label="Row actions">
                      <mat-icon style="color:var(--txt-muted); font-size:18px;">more_vert</mat-icon>
                    </button>
                    <mat-menu #menu="matMenu" xPosition="before" class="ui-menu">
                      <button mat-menu-item (click)="openViewDrawer(rec)">
                        <mat-icon>visibility</mat-icon>
                        <span>View details</span>
                      </button>
                      <ng-container *ngIf="!rec.clockOut">
                        <button mat-menu-item (click)="terminate(rec)" style="color:var(--danger);" *appHasScope="['ATTENDANCE_TEAM_ADJUST', 'ATTENDANCE_ORG_ADJUST']">
                          <mat-icon style="color:var(--danger);">power_settings_new</mat-icon>
                          <span>Force clock-out</span>
                        </button>
                      </ng-container>
                    </mat-menu>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row-hover"></tr>
              </table>
              @if (dataSource.filteredData.length === 0) {
                <div style="padding: 3rem; text-align: center; color: var(--txt-muted); font-size: 0.85rem;">No attendance records in this period.</div>
              }
            </div>

            <div class="table-pag-row" style="padding: 1rem 1.5rem; border-top:1px solid var(--border);">
              <span class="pag-counter-label">
                Showing {{ dataSource.filteredData.length }} of {{ totalElements() }} records
              </span>
              <mat-paginator [length]="totalElements()" [pageIndex]="pageIndex" [pageSize]="pageSize"
                             [pageSizeOptions]="[10, 25, 100]" (page)="onPage($event)"
                             style="background:transparent;"></mat-paginator>
            </div>
          }
        </div>

      </div>

    </div>

    <!-- VIEW DRAWER -->
    <app-side-sheet-drawer
      [isOpen]="isDrawerOpen"
      [title]="'Attendance Details'"
      [subtitle]="'Full record for this shift.'"
      [showFooter]="false"
      (close)="isDrawerOpen = false"
    >
      @if (selectedRecord) {
        <div class="telemetry-details">
          <div class="detail-section">
            <label>Employee</label>
            <div class="val-box">{{ getEmployeeName(selectedRecord.employeeId) }}</div>
          </div>

          <div class="detail-grid">
            <div class="detail-section">
              <label>Clock in</label>
              <div class="val-box text-mono">{{ selectedRecord.clockIn | date:'MMM d, y, HH:mm:ss' }}</div>
            </div>
            <div class="detail-section">
              <label>Clock out</label>
              <div class="val-box text-mono">{{ selectedRecord.clockOut ? (selectedRecord.clockOut | date:'MMM d, y, HH:mm:ss') : 'Still clocked in' }}</div>
            </div>
          </div>

          <div class="detail-grid">
            <div class="detail-section">
              <label>Total hours</label>
              <div class="val-box text-mono">{{ selectedRecord.totalHours || '0.0' }} Hours</div>
            </div>
            <div class="detail-section">
              <label>Overtime</label>
              <div class="val-box text-mono">{{ selectedRecord.overtimeHours || '0.0' }} Hours</div>
            </div>
          </div>

          <div class="detail-section">
            <label>Location</label>
            <div class="val-box text-mono" style="font-size:0.75rem;">
              @if (selectedRecord.latitude && selectedRecord.longitude) {
                LAT: {{ selectedRecord.latitude }} <br>
                LNG: {{ selectedRecord.longitude }}
              } @else {
                Not shared for this record.
              }
            </div>
          </div>

          <div class="detail-section">
            <label>Status</label>
            <div style="margin-top:0.5rem;">
              <span class="ui-badge" [class.ui-badge-success]="!selectedRecord.isLate" [class.ui-badge-warning]="selectedRecord.isLate">
                 {{ selectedRecord.isLate ? 'Late arrival' : 'On time' }}
              </span>
            </div>
          </div>
        </div>
      }
    </app-side-sheet-drawer>

    <!-- MANUAL ENTRY DRAWER -->
    <app-side-sheet-drawer
      [isOpen]="isEntryDrawerOpen"
      [title]="'Manual Entry'"
      [subtitle]="'Add an attendance record for an employee.'"
      (close)="isEntryDrawerOpen = false"
      (save)="saveManualEntry()"
      [saveText]="'Save Entry'"
    >
      <form [formGroup]="entryForm" class="telemetry-details">
        <div class="detail-section">
          <label>Employee</label>
          <select formControlName="employeeId" class="f-input" style="width:100%; height:42px; border-radius:8px;">
            <option [value]="null">Select employee…</option>
            @for (emp of employees(); track emp.id) {
              <option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }} (EMP-{{ emp.id }})</option>
            }
          </select>
        </div>

        <div class="detail-grid">
          <div class="detail-section">
            <label>Clock in (Local)</label>
            <input type="datetime-local" formControlName="clockIn" class="f-input" style="width:100%;">
          </div>
          <div class="detail-section">
            <label>Clock out (Optional)</label>
            <input type="datetime-local" formControlName="clockOut" class="f-input" style="width:100%;">
          </div>
        </div>

        <div class="detail-section">
          <label>Reason (required)</label>
          <textarea formControlName="note" class="f-input" style="width:100%; height:80px; padding:0.75rem;" placeholder="Why is this record being added manually?"></textarea>
        </div>

        <div class="detail-grid">
           <div class="detail-section">
             <label>LATITUDE</label>
             <input type="number" formControlName="latitude" class="f-input" style="width:100%; font-family:monospace;">
           </div>
           <div class="detail-section">
             <label>LONGITUDE</label>
             <input type="number" formControlName="longitude" class="f-input" style="width:100%; font-family:monospace;">
           </div>
        </div>
      </form>
    </app-side-sheet-drawer>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .attendance-grid-layout { display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; }
    .text-mono { font-family: 'JetBrains Mono', monospace; }
    .table-container { min-height: 400px; position: relative; border-radius: 0 0 14px 14px; }
    .action-trigger:hover { background: var(--surface-2); }
    
    .telemetry-details { display: flex; flex-direction: column; gap: 1.5rem; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .detail-section label { font-size: 0.65rem; font-weight: 800; color: var(--txt-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.4rem; display: block; }
    .val-box { padding: 0.75rem 1rem; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; font-size: 0.85rem; font-weight: 600; color: var(--txt-main); }
    
    .ot-trend { display: flex; align-items: flex-end; gap: 4px; height: 36px; margin-top: 0.5rem; }
    .ot-bar { flex: 1; min-height: 4px; border-radius: 3px; background: var(--primary); opacity: 0.85; }
    .terminal-radar-map { width: 100%; height: 220px; border-radius: 12px; background: var(--surface-3); position: relative; overflow: hidden; margin-top: 0.75rem; border: 1px solid var(--border); }
    .radar-grid-lines { position: absolute; inset: 0; background-size: 30px 30px; background-image: linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px); }
    
    .radar-sweep { position: absolute; top: 50%; left: 50%; width: 200%; height: 200%; background: conic-gradient(from 0deg, transparent, rgba(47, 111, 235, 0.1) 45deg, transparent 90deg); transform-origin: top left; animation: radarRotate 4s linear infinite; pointer-events: none; z-index: 1; }
    @keyframes radarRotate { from { transform: rotate(0deg) translate(-50%, -50%); } to { transform: rotate(360deg) translate(-50%, -50%); } }

    .radar-crosshair { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--primary); z-index: 2; }
    .map-ping-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--success); border: 2px solid #ffffff; position: absolute; box-shadow: 0 0 8px var(--success); animation: pulseAlert 2s infinite; z-index: 3; cursor: pointer; transition: all 0.3s; }
    .selected-node { border: 2px solid #000 !important; transform: scale(1.4); z-index: 10 !important; }
    
    .ping-label { position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 9px; font-weight: 900; background: var(--surface); padding: 1px 4px; border-radius: 4px; border: 1px solid var(--border); white-space: nowrap; color: var(--txt-main); }
    
    @keyframes pulseAlert { 0% { box-shadow: 0 0 0 0px rgba(47, 111, 235, 0.6); } 100% { box-shadow: 0 0 0 12px rgba(47, 111, 235, 0); } }

    .ui-table th { padding: 0.85rem 1.25rem; background: var(--surface-2); color: var(--txt-secondary); font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
    .ui-table td { padding: 1.1rem 1.25rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; color: var(--txt-main); }
    .table-row-hover:hover td { background: var(--surface-2); }
  `]
})
export class AttendancePageComponent implements OnInit {
  private readonly attendanceApi = inject(AttendanceService);
  private readonly empApi = inject(EmployeeDataService);
  private readonly socket = inject(WidgetSocketService);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected dataSource = new MatTableDataSource<Attendance>([]);
  protected isLoading = signal(true);
  protected readonly employees = toSignal(this.empApi.getEmployees(), { initialValue: [] });
  protected readonly displayedColumns = ['identity', 'in', 'out', 'hours', 'integrity', 'actions'];
  /** Server-side paging state (BE Page). Text search filters the loaded page only. */
  protected readonly totalElements = signal(0);
  protected pageIndex = 0;
  protected pageSize = 10;
  protected sortParam = 'clockIn,desc';

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    // Length/pages driven by (page) events + [length] binding, not MatTableDataSource.
  }
  @ViewChild(MatSort) set matSort(ms: MatSort) {
    // Sorting is server-side via (matSortChange); no client MatSort wiring.
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadAttendance();
  }

  /** Maps table columns to BE-sortable properties; unknown columns keep recency order. */
  onSort(sort: Sort): void {
    const mapping: Record<string, string> = { in: 'clockIn', out: 'clockOut', integrity: 'isLate' };
    const property = mapping[sort.active];
    this.sortParam = property && sort.direction ? `${property},${sort.direction}` : 'clockIn,desc';
    this.pageIndex = 0;
    this.loadAttendance();
  }

  // Drawer State
  isDrawerOpen = false;
  isEntryDrawerOpen = false;
  selectedRecord: Attendance | null = null;
  entryForm: FormGroup;

  protected readonly overtimeWeek = signal(0);
  protected readonly breakViolWeek = signal(0);
  protected readonly clockedInNow = signal(0);
  protected readonly overtimeTrend = signal<number[]>([0, 0, 0, 0]);
  /** Naive projection: mean of last 4 weeks, weighted to most recent. */
  protected readonly projectedOvertime = computed(() => {
    const t = this.overtimeTrend();
    if (!t.length) return 0;
    const weights = [0.1, 0.2, 0.3, 0.4].slice(-t.length);
    const wsum = weights.reduce((a, b) => a + b, 0);
    return t.reduce((acc, v, i) => acc + v * weights[i], 0) / wsum;
  });

  // --- MAP DEFAULTS (used when a record has no GPS; dots then sit near center) ---
  protected readonly OFFICE_LAT = 40.7128;
  protected readonly OFFICE_LNG = -74.0060;

  protected readonly radarCenter = computed(() => {
    const active = this.activeRecords();
    if (active.length === 0) return { lat: this.OFFICE_LAT, lng: this.OFFICE_LNG };

    let sumLat = 0, sumLng = 0, count = 0;
    for (const r of active) {
      if (r.latitude && r.longitude) {
        sumLat += r.latitude;
        sumLng += r.longitude;
        count++;
      }
    }
    return count > 0 
      ? { lat: sumLat / count, lng: sumLng / count }
      : { lat: this.OFFICE_LAT, lng: this.OFFICE_LNG };
  });

  protected getRadarX(rec: Attendance): number {
    if (!rec.longitude) return 50 + (rec.id * 7 % 30) - 15;
    const center = this.radarCenter();
    const normalized = (rec.longitude - center.lng) * 5000; 
    return Math.min(90, Math.max(10, 50 + normalized));
  }

  protected getRadarY(rec: Attendance): number {
    if (!rec.latitude) return 50 + (rec.id * 11 % 30) - 15;
    const center = this.radarCenter();
    const normalized = (rec.latitude - center.lat) * 5000;
    return Math.min(90, Math.max(10, 50 - normalized));
  }

  constructor() {
    this.entryForm = this.fb.group({
      employeeId: [null, Validators.required],
      clockIn: [new Date().toISOString().slice(0, 16), Validators.required],
      clockOut: [null],
      latitude: [40.7128],
      longitude: [-74.0060],
      note: ['', Validators.required]
    });

    effect(() => {
      const events = this.socket.events();
      if (events.length > 0 && events[0].topic.includes('attendance')) {
        this.loadAttendance();
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.loadAttendance();
    this.socket.connect();
  }

  loadAttendance() {
    this.isLoading.set(true);
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    this.attendanceApi.getAttendanceRange(start, end, { page: this.pageIndex, size: this.pageSize, sort: this.sortParam }).pipe(
      catchError((err) => {
        this.snack.open(backendErrorMessage(err, 'Could not load attendance. Please try again.'), 'Retry', { duration: 4000 });
        return of(null);
      })
    ).subscribe((page) => {
      this.dataSource.data = page?.content ?? [];
      this.totalElements.set(page?.totalElements ?? 0);
      this.dataSource.filter = '';
      this.isLoading.set(false);
    });
    this.loadRadar();
  }

  protected trendHeight(v: number): number {
    const max = Math.max(1, ...this.overtimeTrend());
    return Math.round((v / max) * 100);
  }

  private loadRadar(): void {
    const now = Date.now();
    const end = new Date(now).toISOString();
    const start = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    this.attendanceApi.getOvertimeHours(start, end).pipe(catchError(() => of(0))).subscribe((v) => this.overtimeWeek.set(Number(v) || 0));
    this.attendanceApi.getBreakViolations(start, end).pipe(catchError(() => of(0))).subscribe((v) => this.breakViolWeek.set(Number(v) || 0));
    this.attendanceApi.getClockedInCount().pipe(catchError(() => of(0))).subscribe((v) => this.clockedInNow.set(Number(v) || 0));
    // 4 weekly buckets ending now → trend + projection.
    const buckets = [28, 21, 14, 7].map((daysAgo) => ({
      s: new Date(now - daysAgo * 86400000).toISOString(),
      e: new Date(now - (daysAgo - 7) * 86400000).toISOString()
    }));
    buckets.forEach((b, i) => {
      this.attendanceApi.getOvertimeHours(b.s, b.e).pipe(catchError(() => of(0))).subscribe((v) => {
        this.overtimeTrend.update((t) => {
          const next = [...t];
          next[i] = Number(v) || 0;
          return next;
        });
      });
    });
  }

  exportCsv(): void {
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    // Prefer BE /export (ATTENDANCE_EXPORT); fall back to paged /range on 403.
    this.attendanceApi.exportRange(start, end).pipe(
      catchError(() => this.attendanceApi.getAllAttendanceRange(start, end))
    ).subscribe((rows) => {
      const header = 'id,employeeId,companyId,clockIn,clockOut,totalHours,overtimeHours,isLate';
      const lines = (rows ?? []).map((r) =>
        [r.id, r.employeeId, r.companyId, r.clockIn ?? '', r.clockOut ?? '', r.totalHours ?? '', r.overtimeHours ?? '', r.isLate].join(','));
      const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${start.slice(0, 10)}_${end.slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      this.snack.open(`Exported ${lines.length} rows.`, 'OK', { duration: 3000 });
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  protected getEmployeeName(id: number): string {
    const emp = this.employees().find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : `Employee #${id}`;
  }

  protected getInitials(id: number): string {
    const emp = this.employees().find(e => e.id === id);
    if (!emp) return '??';
    const first = emp.firstName ? emp.firstName[0] : '';
    const last = emp.lastName ? emp.lastName[0] : '';
    return (first + last).toUpperCase() || '??';
  }

  protected activeRecords = computed(() =>
    this.dataSource.data.filter(a => !a.clockOut)
  );

  protected activeSessionsCount = computed(() =>
    this.activeRecords().length
  );

  protected onTimePercent = computed(() => {
    const total = this.dataSource.data.length;
    if (total === 0) return 100;
    const onTime = this.dataSource.data.filter(a => !a.isLate).length;
    return Math.round((onTime / total) * 100);
  });

  openViewDrawer(rec: Attendance) {
    this.selectedRecord = rec;
    this.isDrawerOpen = true;
  }

  terminate(rec: Attendance) {
    if (confirm(`Force clock-out for ${this.getEmployeeName(rec.employeeId)}?`)) {
      this.isLoading.set(true);
      // Own session -> self clock-out; other user's session -> manager
      // force-clock-out (BE PATCH /{id}/force-clock-out requires TEAM/ORG_ADJUST).
      const isOwn = rec.employeeId === this.auth.user()?.id;
      const canForce = this.auth.hasAnyScope(['ATTENDANCE_TEAM_ADJUST', 'ATTENDANCE_ORG_ADJUST']);
      const req$ = !isOwn && canForce ? this.attendanceApi.forceClockOut(rec.id) : this.attendanceApi.clockOut(rec.id);
      req$.subscribe({
        next: () => {
          this.snack.open('Clocked out.', 'OK', { duration: 3000 });
          this.loadAttendance();
        },
        error: () => {
          this.snack.open('Could not clock out. Please try again.', 'OK', { duration: 4000 });
          this.isLoading.set(false);
        }
      });
    }
  }

  manualClockIn() {
    this.isEntryDrawerOpen = true;
  }

  saveManualEntry() {
    if (this.entryForm.invalid) {
      this.snack.open('Please complete all required fields.', 'OK', { duration: 3000 });
      return;
    }

    this.isLoading.set(true);
    const val = this.entryForm.value;
    const payload = {
      ...val,
      clockIn: new Date(val.clockIn).toISOString(),
      clockOut: val.clockOut ? new Date(val.clockOut).toISOString() : null,
      source: 'ADMIN_OVERRIDE'
    };

    this.attendanceApi.manualEntry(payload).subscribe({
      next: () => {
        this.snack.open('Entry saved.', 'OK', { duration: 3000 });
        this.isEntryDrawerOpen = false;
        this.entryForm.reset({
          clockIn: new Date().toISOString().slice(0, 16),
          latitude: 40.7128,
          longitude: -74.0060
        });
        this.loadAttendance();
      },
      error: (err: any) => {
        this.snack.open('Could not save entry: ' + (err.error?.message || 'Please try again.'), 'OK', { duration: 4000 });
        this.isLoading.set(false);
      }
    });
  }
}
