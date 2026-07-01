import { Component, inject, signal, computed, OnInit, ViewChild, effect } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { AttendanceService, Attendance } from '../../core/services/attendance.service';
import { EmployeeDataService, Employee } from '../../core/services/employee-data.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { WidgetSocketService } from '../../core/services/widget-socket.service';
import { HasScopeDirective } from '../../shared/directives/has-scope.directive';
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

      @if (biometricScanning()) {
        <div class="biometric-overlay">
          <div class="scan-frame">
             <div class="scan-line"></div>
             <div style="position:absolute; inset:0; display:grid; place-items:center; font-size:60px; opacity:0.2;">
               <mat-icon style="width:100px; height:100px; font-size:100px;">face</mat-icon>
             </div>
          </div>
          <h2 style="margin-top:2rem; letter-spacing:0.2em; font-weight:900;">VERIFYING BIOMETRIC NODE...</h2>
          <p style="color:var(--txt-muted)">Hold position for operational synchronization.</p>
        </div>
      }
      
      <div class="attendance-grid-layout">
        
        <!-- RADAR & MAP PANEL -->
        <div class="ui-card">
          <div class="ui-card-header">
            <h3>Geoping Terminal</h3>
            <span class="ui-badge ui-badge-success">Sync_Active</span>
          </div>
          <p style="font-size:0.75rem; color:var(--txt-muted); margin-bottom:1rem;">Real-time workforce coordinate triangulation mapping.</p>
          
          <div class="terminal-radar-map">
            <div class="radar-grid-lines"></div>
            <!-- OFFICE GEO-FENCE CIRCLE -->
            <div class="radar-geo-fence" title="Primary Office Perimeter"></div>
            <div class="radar-sweep"></div>
            <div class="radar-crosshair"></div>
            
            @for (rec of activeRecords(); track rec.id) {
               <div class="map-ping-dot" 
                    [class.out-of-bounds]="isOutOfBounds(rec)"
                    [class.selected-node]="selectedRecord?.id === rec.id"
                    [style.top]="getRadarY(rec) + '%'" 
                    [style.left]="getRadarX(rec) + '%'"
                    (click)="openViewDrawer(rec)"
                    [title]="getEmployeeName(rec.employeeId)">
                 <span class="ping-label">{{ getInitials(rec.employeeId) }}</span>
               </div>
            }
          </div>

          <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
            <div class="ui-card" style="padding: 1rem; background: var(--surface-2); margin-bottom: 0; border-radius:12px;">
               <span style="font-size: 0.65rem; font-weight: 800; color: var(--txt-muted); text-transform: uppercase; letter-spacing:0.05em;">Active Nodes</span>
               <div style="font-size: 1.5rem; font-weight: 900;" id="attendanceActiveNodesCount">{{ activeSessionsCount() }}</div>
            </div>
            <div class="ui-card" style="padding: 1rem; background: var(--surface-2); margin-bottom: 0; border-radius:12px;">
               <span style="font-size: 0.65rem; font-weight: 800; color: var(--txt-muted); text-transform: uppercase; letter-spacing:0.05em;">Geo Integrity</span>
               <div style="font-size: 1.5rem; font-weight: 900; color: var(--success);" id="attendanceGeoIntegrity">{{ geoVerifiedPercent() }}%</div>
            </div>
          </div>
        </div>

        <!-- LOG PANEL -->
        <div class="ui-card" style="padding: 0; overflow: visible; border-radius:14px;">
          <div class="ui-card-header" style="padding: 1.5rem 1.5rem 1rem;">
            <h3>Operational Attendance Logs</h3>
            <div style="display:flex; gap:0.5rem;">
               <button class="ui-btn ui-btn-primary" (click)="manualClockIn()" *appHasScope="'ATTENDANCE_ORG_ADJUST'">
                 <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">add</mat-icon> Manual Entry
               </button>
               <button class="ui-btn ui-btn-secondary" style="height:40px; padding:0 1rem; font-size:0.8rem; font-weight:700; border-radius:10px;">
                 <mat-icon style="font-size:18px;">download</mat-icon> Export
               </button>
            </div>
          </div>

          <div class="filter-action-row" style="padding: 0 1.5rem 1rem;">
            <div class="input-icon-wrap" style="width:100%;">
              <mat-icon style="font-size:18px; width:18px; height:18px; left:0.75rem; color:var(--txt-muted)">search</mat-icon>
              <input type="text" class="f-input" style="padding-left:2.5rem; height:42px; border-radius:10px;" 
                     (keyup)="applyFilter($event)" placeholder="Filter attendance logs by personnel or status...">
            </div>
          </div>

          @if (isLoading()) {
            <div class="table-loading-overlay" style="padding:4rem; text-align:center;">
              <mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner>
              <p style="margin-top:1rem; color:var(--txt-muted); font-size:0.85rem;">Synchronizing biometric logs...</p>
            </div>
          } @else {
            <div class="table-container custom-scrollbar">
              <table mat-table [dataSource]="dataSource" matSort class="ui-table">
                
                <ng-container matColumnDef="identity">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Personnel Identity</th>
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
                      {{ rec.clockOut ? (rec.clockOut | date:'HH:mm:ss') : 'STATION_ACTIVE' }}
                    </div>
                    <div style="font-size:10px; color:var(--txt-muted)" *ngIf="rec.clockOut">{{ rec.clockOut | date:'MMM d, y' }}</div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="hours">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Duration</th>
                  <td mat-cell *matCellDef="let rec" class="text-mono">
                    {{ rec.totalHours ? (rec.totalHours | number:'1.1-1') + 'h' : '--' }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="integrity">
                   <th mat-header-cell *matHeaderCellDef mat-sort-header>Integrity</th>
                   <td mat-cell *matCellDef="let rec">
                     <span class="ui-badge" [class.ui-badge-success]="!rec.isLate" [class.ui-badge-warning]="rec.isLate">
                       {{ rec.isLate ? 'STATION_DEVIATION' : 'NOMINAL_SYNC' }}
                     </span>
                   </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef style="text-align:right; width:80px;"></th>
                  <td mat-cell *matCellDef="let rec" style="text-align:right;">
                    <button mat-icon-button [matMenuTriggerFor]="menu" class="action-trigger">
                      <mat-icon style="color:var(--txt-muted); font-size:18px;">more_vert</mat-icon>
                    </button>
                    <mat-menu #menu="matMenu" xPosition="before" class="ui-menu">
                      <button mat-menu-item (click)="openViewDrawer(rec)">
                        <mat-icon>visibility</mat-icon>
                        <span>Inspect Telemetry</span>
                      </button>
                      <button mat-menu-item (click)="terminate(rec)" *ngIf="!rec.clockOut" style="color:var(--danger);" appHasScope="['ATTENDANCE_TEAM_ADJUST', 'ATTENDANCE_ORG_ADJUST']">
                        <mat-icon style="color:var(--danger);">power_settings_new</mat-icon>
                        <span>Force Termination</span>
                      </button>
                    </mat-menu>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row-hover"></tr>
              </table>
            </div>

            <div class="table-pag-row" style="padding: 1rem 1.5rem; border-top:1px solid var(--border);">
              <span class="pag-counter-label">
                Showing {{ dataSource.filteredData.length }} recent telemetry packets
              </span>
              <mat-paginator [pageSizeOptions]="[10, 25, 100]" hidePageSize="true" style="background:transparent;"></mat-paginator>
            </div>
          }
        </div>

      </div>

    </div>

    <!-- VIEW DRAWER -->
    <app-side-sheet-drawer
      [isOpen]="isDrawerOpen"
      [title]="'Telemetry Inspection'"
      [subtitle]="'Deep analysis of biometric station node.'"
      [showFooter]="false"
      (close)="isDrawerOpen = false"
    >
      @if (selectedRecord) {
        <div class="telemetry-details">
          <div class="detail-section">
            <label>Personnel Node</label>
            <div class="val-box">{{ getEmployeeName(selectedRecord.employeeId) }}</div>
          </div>
          
          <div class="detail-grid">
            <div class="detail-section">
              <label>Clock In Epoch</label>
              <div class="val-box text-mono">{{ selectedRecord.clockIn | date:'MMM d, y, HH:mm:ss' }}</div>
            </div>
            <div class="detail-section">
              <label>Clock Out Epoch</label>
              <div class="val-box text-mono">{{ selectedRecord.clockOut ? (selectedRecord.clockOut | date:'MMM d, y, HH:mm:ss') : 'STATION_ACTIVE' }}</div>
            </div>
          </div>

          <div class="detail-grid">
            <div class="detail-section">
              <label>Total Duration</label>
              <div class="val-box text-mono">{{ selectedRecord.totalHours || '0.0' }} Hours</div>
            </div>
            <div class="detail-section">
              <label>Overtime Node</label>
              <div class="val-box text-mono">{{ selectedRecord.overtimeHours || '0.0' }} Hours</div>
            </div>
          </div>

          <div class="detail-section">
            <label>Geographic Coordinates</label>
            <div class="val-box text-mono" style="font-size:0.75rem;">
              LAT: {{ selectedRecord.latitude || '0.000000' }} <br>
              LNG: {{ selectedRecord.longitude || '0.000000' }}
            </div>
          </div>

          <div class="detail-section">
            <label>Administrative Status</label>
            <div style="margin-top:0.5rem;">
              <span class="ui-badge" [class.ui-badge-success]="!selectedRecord.isLate" [class.ui-badge-warning]="selectedRecord.isLate">
                 {{ selectedRecord.isLate ? 'FLAGGED_DEVIATION' : 'NOMINAL_OPERATIONS' }}
              </span>
            </div>
          </div>
        </div>
      }
    </app-side-sheet-drawer>

    <!-- MANUAL ENTRY DRAWER -->
    <app-side-sheet-drawer
      [isOpen]="isEntryDrawerOpen"
      [title]="'Manual Station Entry'"
      [subtitle]="'Administrative override for biometric node synchronization.'"
      (close)="isEntryDrawerOpen = false"
      (save)="saveManualEntry()"
      [saveText]="'Initialize Node'"
    >
      <form [formGroup]="entryForm" class="telemetry-details">
        <div class="detail-section">
          <label>Personnel Node</label>
          <select formControlName="employeeId" class="f-input" style="width:100%; height:42px; border-radius:8px;">
            <option [value]="null">Select Node...</option>
            @for (emp of employees(); track emp.id) {
              <option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }} (EMP-{{ emp.id }})</option>
            }
          </select>
        </div>

        <div class="detail-grid">
          <div class="detail-section">
            <label>Clock In (Local)</label>
            <input type="datetime-local" formControlName="clockIn" class="f-input" style="width:100%;">
          </div>
          <div class="detail-section">
            <label>Clock Out (Optional)</label>
            <input type="datetime-local" formControlName="clockOut" class="f-input" style="width:100%;">
          </div>
        </div>

        <div class="detail-section">
          <label>Override Logic</label>
          <textarea formControlName="note" class="f-input" style="width:100%; height:80px; padding:0.75rem;" placeholder="Reason for manual synchronization..."></textarea>
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
    
    .terminal-radar-map { width: 100%; height: 220px; border-radius: 12px; background: var(--surface-3); position: relative; overflow: hidden; margin-top: 0.75rem; border: 1px solid var(--border); }
    .radar-grid-lines { position: absolute; inset: 0; background-size: 30px 30px; background-image: linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px); }
    
    .radar-geo-fence {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 80px; height: 80px; border-radius: 50%;
      border: 1px dashed var(--success); background: rgba(34, 197, 94, 0.05);
      z-index: 1; pointer-events: none;
    }

    .radar-sweep { position: absolute; top: 50%; left: 50%; width: 200%; height: 200%; background: conic-gradient(from 0deg, transparent, rgba(47, 111, 235, 0.1) 45deg, transparent 90deg); transform-origin: top left; animation: radarRotate 4s linear infinite; pointer-events: none; z-index: 1; }
    @keyframes radarRotate { from { transform: rotate(0deg) translate(-50%, -50%); } to { transform: rotate(360deg) translate(-50%, -50%); } }

    .radar-crosshair { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--primary); z-index: 2; }
    .map-ping-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--success); border: 2px solid #ffffff; position: absolute; box-shadow: 0 0 8px var(--success); animation: pulseAlert 2s infinite; z-index: 3; cursor: pointer; transition: all 0.3s; }
    .map-ping-dot.out-of-bounds { background: var(--danger); box-shadow: 0 0 10px var(--danger); }
    .map-ping-dot.out-of-bounds .ping-label { border-color: var(--danger); color: var(--danger); }
    .selected-node { border: 2px solid #000 !important; transform: scale(1.4); z-index: 10 !important; }
    
    .ping-label { position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 9px; font-weight: 900; background: var(--surface); padding: 1px 4px; border-radius: 4px; border: 1px solid var(--border); white-space: nowrap; color: var(--txt-main); }
    
    @keyframes pulseAlert { 0% { box-shadow: 0 0 0 0px rgba(47, 111, 235, 0.6); } 100% { box-shadow: 0 0 0 12px rgba(47, 111, 235, 0); } }

    /* BIOMETRIC SCANNER ANIMATION */
    .biometric-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      backdrop-filter: blur(8px); color: var(--primary);
    }
    .scan-frame {
      width: 280px; height: 320px; border: 2px solid var(--primary); position: relative;
      border-radius: 40px; overflow: hidden; box-shadow: 0 0 30px var(--primary);
    }
    .scan-line {
      position: absolute; width: 100%; height: 4px; background: var(--primary);
      box-shadow: 0 0 15px var(--primary); animation: scanMove 2s ease-in-out infinite;
    }
    @keyframes scanMove { 0% { top: 0; } 100% { top: 100%; } }

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

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    if (mp) this.dataSource.paginator = mp;
  }
  @ViewChild(MatSort) set matSort(ms: MatSort) {
    if (ms) this.dataSource.sort = ms;
  }

  // Drawer State
  isDrawerOpen = false;
  isEntryDrawerOpen = false;
  selectedRecord: Attendance | null = null;
  entryForm: FormGroup;

  protected readonly biometricScanning = signal(false);

  // --- RADAR MAPPING LOGIC (DYNAMIC CENTERING) ---
  protected readonly OFFICE_LAT = 40.7128; // NYC HQ
  protected readonly OFFICE_LNG = -74.0060;
  protected readonly ALLOWED_RADIUS = 0.005; // Approx 500m

  protected isOutOfBounds(rec: Attendance): boolean {
    if (!rec.latitude || !rec.longitude) return false;
    const dist = Math.sqrt(Math.pow(rec.latitude - this.OFFICE_LAT, 2) + Math.pow(rec.longitude - this.OFFICE_LNG, 2));
    return dist > this.ALLOWED_RADIUS;
  }

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
    this.attendanceApi.getAttendanceRange(start, end).pipe(
      catchError(() => {
        this.snack.open('Telemetry synchronization failed.', 'RETRY', { duration: 4000 });
        return of([]);
      })
    ).subscribe((data: Attendance[]) => {
      this.dataSource.data = data;
      this.isLoading.set(false);
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  protected getEmployeeName(id: number): string {
    const emp = this.employees().find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : `NODE_${id}`;
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

  protected geoVerifiedPercent = computed(() => {
    const total = this.dataSource.data.length;
    if (total === 0) return 100;
    const verified = this.dataSource.data.filter(a => !a.isLate).length;
    return Math.round((verified / total) * 100);
  });

  openViewDrawer(rec: Attendance) {
    this.selectedRecord = rec;
    this.isDrawerOpen = true;
  }

  terminate(rec: Attendance) {
    if (confirm('FORCE_STATION_TERMINATION: Authenticate and proceed?')) {
      this.isLoading.set(true);
      this.attendanceApi.clockOut(rec.id).subscribe({
        next: () => {
          this.snack.open('Station terminated manually.', 'OK', { duration: 3000 });
          this.loadAttendance();
        },
        error: () => {
          this.snack.open('Termination protocol failed.', 'OK', { duration: 4000 });
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
      this.snack.open('Validation failure: Telemetry parameters incomplete.', 'OK', { duration: 3000 });
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
        this.snack.open('Node initialized successfully.', 'OK', { duration: 3000 });
        this.isEntryDrawerOpen = false;
        this.entryForm.reset({
          clockIn: new Date().toISOString().slice(0, 16),
          latitude: 40.7128,
          longitude: -74.0060
        });
        this.loadAttendance();
      },
      error: (err: any) => {
        this.snack.open('Synchronization error: ' + (err.error?.message || 'Server rejected packet'), 'OK', { duration: 4000 });
        this.isLoading.set(false);
      }
    });
  }
}
