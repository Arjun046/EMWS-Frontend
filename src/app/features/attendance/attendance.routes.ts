import { Routes } from '@angular/router';
import { AttendanceContainerComponent } from './attendance-container.component';
import { MobileClockComponent } from './components/mobile-clock.component';

export const ATTENDANCE_ROUTES: Routes = [
  { path: '', component: AttendanceContainerComponent },
  { path: 'mobile-clock', component: MobileClockComponent }
];
