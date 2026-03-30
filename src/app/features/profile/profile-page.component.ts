import { Component, inject, signal, computed, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe, PercentPipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Observable, of, throwError } from 'rxjs';
import { delay, catchError, map } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

// --- MOCK API DATA MODELS ---
interface StatData { hoursWorked: number; expectedHours: number; leaveRemaining: number; daysPresent: number; totalDays: number; pendingTasks: number; }
interface ActivityAction { id: string; title: string; date: string; icon: string; }
interface ScheduleItem { date: string; title: string; sub: string; type: 'shift' | 'leave'; }
interface DocItem { id: string; title: string; status: 'pending' | 'signed'; }
interface ManagerSummary { teamSize: number; presentToday: number; pendingApprovals: number; }
interface PersonalInfo { fullName: string; preferredName: string; dob: string; email: string; phone: string; emergencyContactName: string; emergencyContactPhone: string; }
interface WorkDetails { employeeId: string; joinDate: string; contractType: string; department: string; team: string; manager: string; location: string; shiftPattern: string; }
interface ContactInfo { office: string; desk: string; workPhone: string; workEmail: string; }

// --- THE COMPONENT ---
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatDividerModule, 
    MatListModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, 
    MatSnackBarModule, MatProgressSpinnerModule, FormsModule, ReactiveFormsModule, PageHeaderComponent,
    DatePipe, PercentPipe, DecimalPipe
  ],
  templateUrl: './profile-page.component.html',
  styleUrls: ['./profile-page.component.scss']
})
export class ProfilePageComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);

  // --- STATE SIGNALS ---
  protected readonly role = computed(() => this.auth.user()?.role || 'EMPLOYEE');
  protected readonly isManager = computed(() => ['MANAGER', 'ADMIN'].includes(this.role()));
  protected readonly isAdmin = computed(() => this.role() === 'ADMIN');

  protected editingSection = signal<string | null>(null);
  protected isAvatarUploading = signal(false);

  // Data Signals
  protected stats = signal<StatData | null>(null);
  protected personalInfo = signal<PersonalInfo | null>(null);
  protected workDetails = signal<WorkDetails | null>(null);
  protected contactInfo = signal<ContactInfo | null>(null);
  protected activity = signal<ActivityAction[] | null>(null);
  protected schedule = signal<ScheduleItem[] | null>(null);
  protected documents = signal<DocItem[] | null>(null);
  protected teamSummary = signal<ManagerSummary | null>(null);
  protected adminPermissions = signal<string[] | null>(null);

  // Loading Signals
  protected loadIdentity = signal(true);
  protected loadStats = signal(true);
  protected loadLeftCol = signal(true);
  protected loadActivity = signal(true);
  protected loadSchedule = signal(true);
  protected loadDocs = signal(true);
  protected loadTeam = signal(true);
  
  // Error Signals
  protected errIdentity = signal(false);
  protected errStats = signal(false);
  protected errLeftCol = signal(false);
  protected errActivity = signal(false);
  protected errSchedule = signal(false);
  protected errDocs = signal(false);
  protected errTeam = signal(false);

  // Forms
  protected identityForm!: FormGroup;
  protected personalForm!: FormGroup;
  protected contactForm!: FormGroup;
  protected passwordForm!: FormGroup;
  
  // Settings
  protected emailNotif = signal(true);
  protected pushNotif = signal(false);
  protected inAppNotif = signal(true);
  protected datePref = signal('MM/DD/YYYY');
  protected timePref = signal('12h');
  protected langPref = signal('en');

  protected showPassword = signal(false);
  protected isPasswordSaving = signal(false);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  ngOnInit() {
    this.initForms();
    this.fetchAllData();
  }

  // --- INITIALIZATION ---
  private initForms() {
    this.identityForm = this.fb.group({
      fullName: ['', Validators.required],
      role: ['', Validators.required],
      status: ['', Validators.required],
      location: ['', Validators.required]
    });

    this.personalForm = this.fb.group({
      fullName: ['', Validators.required],
      preferredName: [''],
      dob: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      emergencyContactName: ['', Validators.required],
      emergencyContactPhone: ['', Validators.required]
    });

    this.contactForm = this.fb.group({
      office: ['', Validators.required],
      desk: [''],
      workPhone: ['', Validators.required],
      workEmail: ['', [Validators.required, Validators.email]]
    });

    this.passwordForm = this.fb.group({
      current: ['', Validators.required],
      new: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(g: any) {
    return g.get('new').value === g.get('confirm').value ? null : { mismatch: true };
  }

  // --- DATA FETCHING (MOCKED) ---
  protected fetchAllData() {
    this.fetchIdentity();
    this.fetchStats();
    this.fetchLeftCol();
    this.fetchActivity();
    this.fetchSchedule();
    this.fetchDocs();
    
    if (this.isManager()) this.fetchTeamSummary();
    if (this.isAdmin()) this.fetchAdminPerms();
  }

  protected fetchIdentity() {
    this.loadIdentity.set(true); this.errIdentity.set(false);
    of(true).pipe(delay(600)).subscribe(() => {
      const u = this.auth.user();
      this.identityForm.patchValue({
        fullName: u?.name || 'Unknown User',
        role: u?.role || 'Employee',
        status: 'Active',
        location: 'Headquarters - Floor 3'
      });
      this.loadIdentity.set(false);
    });
  }

  protected fetchStats() {
    this.loadStats.set(true); this.errStats.set(false);
    of({
      hoursWorked: 34.5, expectedHours: 40,
      leaveRemaining: 12, daysPresent: 18, totalDays: 20,
      pendingTasks: this.isAdmin() ? 5 : 0
    }).pipe(delay(800)).subscribe(res => {
      this.stats.set(res);
      this.loadStats.set(false);
    });
  }

  protected fetchLeftCol() {
    this.loadLeftCol.set(true); this.errLeftCol.set(false);
    of(true).pipe(delay(1000)).subscribe(() => {
      const u = this.auth.user();
      
      const pInfo = {
        fullName: u?.name || 'Unknown', preferredName: (u?.name || '').split(' ')[0],
        dob: '1985-06-15', email: u?.email || 'user@example.com', phone: '+1 (555) 987-6543',
        emergencyContactName: 'Jane Doe', emergencyContactPhone: '+1 (555) 123-4567'
      };
      this.personalInfo.set(pInfo);
      this.personalForm.patchValue(pInfo);

      this.workDetails.set({
        employeeId: 'EWMS-' + (u?.id?.toString().padStart(4, '0') || '0000'),
        joinDate: '2021-03-10', contractType: 'Full-time Permanent',
        department: 'Operations', team: 'Core Platform', manager: 'Sarah Connor',
        location: 'HQ - New York', shiftPattern: 'Mon-Fri, 9am-5pm EST'
      });

      const cInfo = { office: 'New York HQ', desk: 'Floor 3, Desk 42', workPhone: '+1 (555) 555-0199', workEmail: u?.email || 'work@company.com' };
      this.contactInfo.set(cInfo);
      this.contactForm.patchValue(cInfo);

      this.loadLeftCol.set(false);
    });
  }

  protected fetchActivity() {
    this.loadActivity.set(true); this.errActivity.set(false);
    of([
      { id: '1', title: 'Clocked in from HQ', date: new Date().toISOString(), icon: 'login' },
      { id: '2', title: 'Vacation leave approved', date: new Date(Date.now() - 86400000).toISOString(), icon: 'event_available' },
      { id: '3', title: 'Completed annual security training', date: new Date(Date.now() - 172800000).toISOString(), icon: 'school' },
      { id: '4', title: 'Shift swapped with Alex', date: new Date(Date.now() - 345600000).toISOString(), icon: 'swap_horiz' }
    ]).pipe(delay(1200)).subscribe(res => {
      this.activity.set(res);
      this.loadActivity.set(false);
    });
  }

  protected triggerActivityError() {
    this.loadActivity.set(true); this.errActivity.set(false);
    of(null).pipe(delay(500), map(() => { throw new Error('API Drop'); }), catchError(() => {
      this.errActivity.set(true);
      this.loadActivity.set(false);
      return of(null);
    })).subscribe();
  }

  protected fetchSchedule() {
    this.loadSchedule.set(true); this.errSchedule.set(false);
    of([
      { date: 'Today, Oct 24', title: 'Morning Shift', sub: '09:00 AM - 05:00 PM', type: 'shift' as const },
      { date: 'Tomorrow, Oct 25', title: 'Morning Shift', sub: '09:00 AM - 05:00 PM', type: 'shift' as const },
      { date: 'Next Mon, Oct 29', title: 'Vacation', sub: 'All Day', type: 'leave' as const }
    ]).pipe(delay(700)).subscribe(res => {
      this.schedule.set(res);
      this.loadSchedule.set(false);
    });
  }

  protected fetchDocs() {
    this.loadDocs.set(true); this.errDocs.set(false);
    of([
      { id: 'd1', title: 'Q4 Compliance Policy', status: 'pending' as const },
      { id: 'd2', title: 'Remote Work Agreement', status: 'signed' as const }
    ]).pipe(delay(900)).subscribe(res => {
      // simulate empty state for standard employees sometimes, but let's give them data
      this.documents.set(res);
      this.loadDocs.set(false);
    });
  }

  protected fetchTeamSummary() {
    this.loadTeam.set(true); this.errTeam.set(false);
    of({ teamSize: 12, presentToday: 10, pendingApprovals: 3 }).pipe(delay(1100)).subscribe(res => {
      this.teamSummary.set(res);
      this.loadTeam.set(false);
    });
  }

  protected fetchAdminPerms() {
    this.adminPermissions.set(['Super Admin', 'System Config', 'User Management', 'Payroll Approver']);
  }


  // --- USER ACTIONS & EDITING ---
  
  protected toggleEdit(section: string) {
    if (this.editingSection() === section) {
      this.editingSection.set(null); // Cancel
      // Revert form values
      if(section==='IDENTITY') this.identityForm.patchValue({ ...this.identityForm.value }); // handled via fetchIdentity logic or signals
      if(section==='PERSONAL') this.personalForm.patchValue(this.personalInfo()!);
      if(section==='CONTACT') this.contactForm.patchValue(this.contactInfo()!);
    } else {
      this.editingSection.set(section);
    }
  }

  protected saveIdentity() {
    if (this.identityForm.invalid) return;
    this.snack.open('Identity updated.', 'OK', { duration: 2000 });
    this.editingSection.set(null);
  }

  protected savePersonal() {
    if (this.personalForm.invalid) return;
    // Mock save
    const btn = document.activeElement as HTMLButtonElement;
    if(btn) btn.disabled = true;
    
    setTimeout(() => {
      this.personalInfo.set(this.personalForm.value);
      this.snack.open('Personal details saved successfully.', 'OK', { duration: 3000 });
      this.editingSection.set(null);
    }, 600);
  }

  protected saveContact() {
    if (this.contactForm.invalid) return;
    setTimeout(() => {
      this.contactInfo.set(this.contactForm.value);
      this.snack.open('Contact & Location updated.', 'OK', { duration: 3000 });
      this.editingSection.set(null);
    }, 600);
  }

  protected onAvatarClick() {
    this.fileInput.nativeElement.click();
  }

  protected onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.isAvatarUploading.set(true);
      // Simulate fake upload
      setTimeout(() => {
        this.isAvatarUploading.set(false);
        this.snack.open('Profile photo updated!', 'OK', { duration: 3000 });
      }, 1500);
    } else if(file) {
      this.snack.open('Please select a valid image file.', 'OK', { duration: 3000 });
    }
    event.target.value = null; // reset
  }

  protected savePassword() {
    if (this.passwordForm.invalid) return;
    this.isPasswordSaving.set(true);
    setTimeout(() => {
      this.isPasswordSaving.set(false);
      this.passwordForm.reset();
      this.snack.open('Password successfully changed.', 'OK', { duration: 3000 });
    }, 1000);
  }

  protected savePreference(type: string) {
    this.snack.open('Preference saved.', '', { duration: 1500 });
  }

  protected downloadData() {
    this.snack.open('Preparing data export. You will receive an email shortly.', 'OK', { duration: 4000 });
  }

  // --- HELPERS ---
  protected min(a: number, b: number) { return Math.min(a, b); }
  protected getInitials(name?: string) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }
}
