import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AttendanceService, Attendance } from '../../../core/services/attendance.service';
import { ApiService } from '../../../core/services/api.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Employee } from '../../employees/employees-page.component';

@Component({
  selector: 'app-who-is-in',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatDividerModule],
  template: `
    <mat-card class="who-is-in-card">
      <div class="card-header">
        <h3 class="font-bold m-0">Currently In</h3>
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
                    <span class="text-xs text-green-600 font-bold">IN</span>
                  </div>
                  <div class="flex justify-between items-center mt-1">
                    <span class="text-xs text-slate-500">Since {{ entry.clockIn | date:'shortTime' }}</span>
                    <span class="text-xs text-slate-400">{{ getDuration(entry.clockIn) }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
      <div class="card-footer p-3 bg-slate-50 border-t text-center">
        <button class="text-xs font-bold text-blue-600 uppercase tracking-wider hover:underline">View Live Console</button>
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
    .flex { display: flex; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .gap-3 { gap: 0.75rem; }
    .mt-1 { margin-top: 0.25rem; }
  `]
})
export class WhoIsInComponent {
  private readonly attendanceApi = inject(AttendanceService);
  private readonly api = inject(ApiService);

  protected readonly employees = toSignal(this.api.get<Employee[]>('/api/employees', []), { initialValue: [] });
  
  protected readonly todayAttendance = toSignal(
    this.attendanceApi.getTodayAttendance(0), // Using 0 or something to get all? Wait, service might need a better API
    { initialValue: [] }
  );

  // Actually, getTodayAttendance is for a single employee in the service.
  // I should use getAttendanceRange for all.
  protected readonly allAttendance = toSignal(
    this.attendanceApi.getAttendanceRange(
      new Date().toISOString().split('T')[0] + 'T00:00:00Z',
      new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T00:00:00Z'
    ),
    { initialValue: [] }
  );

  protected readonly activeAttendance = computed(() => 
    this.allAttendance().filter(a => a.clockOut === null)
  );

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
