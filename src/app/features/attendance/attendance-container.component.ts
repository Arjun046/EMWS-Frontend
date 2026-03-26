import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { AttendancePageComponent } from './attendance-page.component';
import { AttendanceEmployeeComponent } from './attendance-employee.component';

@Component({
  selector: 'app-attendance-container',
  standalone: true,
  imports: [CommonModule, AttendancePageComponent, AttendanceEmployeeComponent],
  template: `
    @if (isAdminOrManager()) {
      <app-attendance-page />
    } @else {
      <app-attendance-employee />
    }
  `
})
export class AttendanceContainerComponent {
  private readonly auth = inject(AuthService);
  
  protected readonly isAdminOrManager = computed(() => {
    const role = this.auth.user()?.role;
    return role === 'ADMIN' || role === 'MANAGER';
  });
}
