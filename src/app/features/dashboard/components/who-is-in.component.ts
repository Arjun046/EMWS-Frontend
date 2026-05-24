import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AttendanceService, Attendance } from '../../../core/services/attendance.service';
import { ApiService } from '../../../core/services/api.service';
import { WidgetSocketService } from '../../../core/services/widget-socket.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Employee } from '../../../core/services/employee-data.service';

@Component({
  selector: 'app-who-is-in',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatDividerModule],
  template: `
    <mat-card class="who-is-in-card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <h3 class="font-bold m-0">Currently In</h3>
          <div class="live-indicator" [class.active]="socket.status() === 'connected'">
            <span class="pulse"></span> LIVE
          </div>
        </div>
        <span class="count-badge">{{ activeAttendance().length }}</span>
      </div>
      <div class="p-0 list-container">
        @if (activeAttendance().length === 0) {
          <div class="empty-state p-8 text-center text-slate-400">
            <mat-icon class="text-4xl mb-2">hail</mat-icon>
            <p class="text-sm">No one is clocked in right now.</p>
          </div>
        } @else {
          <div class="staff-list">
            @for (entry of activeAttendance(); track entry.id) {
              <div class="staff-item p-3 border-b flex items-center gap-3 hover:bg-slate-50 transition-colors">
                <div class="staff-avatar" [style.background-color]="getAvatarColor(entry.employeeId)">
                  {{ getInitials(entry.employeeId) }}
                </div>
                <div class="flex-1">
                  <div class="flex justify-between items-center">
                    <strong class="text-sm">{{ getEmployeeName(entry.employeeId) }}</strong>
                    <span class="text-xs text-green-600 font-bold flex items-center gap-1">
                      <span class="status-dot"></span> IN
                    </span>
                  </div>
                  <div class="flex justify-between items-center mt-1">
                    <span class="text-xs text-slate-500">Since {{ entry.clockIn | date:'shortTime' }}</span>
                    <span class="text-xs text-slate-400 font-mono">{{ getDuration(entry.clockIn) }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
      <div class="card-footer p-3 bg-slate-50 border-t text-center">
        <button class="text-xs font-bold text-blue-600 uppercase tracking-wider hover:underline" (click)="refresh()">Manual Refresh</button>
      </div>
    </mat-card>
  `,
  styles: [`
    .who-is-in-card { border-radius: 1rem; border: 1px solid #e2e8f0; box-shadow: none !important; overflow: hidden; height: 100%; display: flex; flex-direction: column; }
    .card-header { padding: 1rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .count-badge { background: #dcfce7; color: #166534; font-size: 0.75rem; font-weight: 800; padding: 0.1rem 0.5rem; border-radius: 999px; }
    .list-container { flex: 1; overflow-y: auto; max-height: 400px; }
    .staff-avatar { width: 2.25rem; height: 2.25rem; border-radius: 0.75rem; color: white; display: grid; place-items: center; font-weight: 800; font-size: 0.8rem; }
    .staff-item:last-child { border-bottom: none; }
    
    .live-indicator { font-size: 0.6rem; font-weight: 900; color: #94a3b8; display: flex; align-items: center; gap: 4px; border: 1px solid #e2e8f0; padding: 2px 6px; border-radius: 4px; }
    .live-indicator.active { color: #22c55e; border-color: #dcfce7; }
    .pulse { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .active .pulse { animation: pulse-animation 2s infinite; }
    
    @keyframes pulse-animation {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }

    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }
    
    .flex { display: flex; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .gap-1 { gap: 0.25rem; }
    .gap-2 { gap: 0.5rem; }
    .gap-3 { gap: 0.75rem; }
    .mt-1 { margin-top: 0.25rem; }
  `]
})
export class WhoIsInComponent {
  private readonly attendanceApi = inject(AttendanceService);
  private readonly api = inject(ApiService);
  protected readonly socket = inject(WidgetSocketService);

  protected readonly employees = toSignal(this.api.get<Employee[]>('/api/employees', []), { initialValue: [] });
  protected readonly allAttendance = signal<Attendance[]>([]);

  protected readonly activeAttendance = computed(() => 
    this.allAttendance().filter(a => a.clockOut === null)
  );

  constructor() {
    this.refresh();

    // Listen to socket events to refresh data
    effect(() => {
      const events = this.socket.events();
      if (events.length > 0) {
        const lastEvent = events[0];
        if (lastEvent.topic === '/topic/widgets/attendance') {
          this.refresh();
        }
      }
    });
  }

  refresh(): void {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    this.attendanceApi.getAttendanceRange(
      today + 'T00:00:00Z',
      tomorrow + 'T00:00:00Z'
    ).subscribe(data => {
      this.allAttendance.set(data);
    });
  }

  getEmployeeName(id: number): string {
    const emp = this.employees().find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : `Staff #${id}`;
  }

  getInitials(id: number): string {
    const emp = this.employees().find(e => e.id === id);
    if (!emp) return 'E';
    return `${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}`;
  }

  getAvatarColor(id: number): string {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    return colors[id % colors.length];
  }

  getDuration(clockIn: string): string {
    const diff = Date.now() - new Date(clockIn).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
}
