import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SideSheetDrawerComponent } from '../../shared/components/side-sheet-drawer/side-sheet-drawer.component';
import { PASSWORD_POLICY, passwordPolicyValidator, backendErrorMessage } from '../../shared/utils/password-policy';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatButtonModule, MatDividerModule, 
    MatSnackBarModule, MatProgressSpinnerModule, ReactiveFormsModule,
    SideSheetDrawerComponent
  ],
  template: `
    <div class="profile-viewport fade-up">
      <div class="profile-hero-card">
        <div class="profile-avatar-large">
          {{ getInitials() }}
        </div>
        <div class="profile-hero-info">
          <h2>{{ auth.user()?.name }}</h2>
          <p id="profileHeroRole">{{ auth.user()?.role }} · {{ auth.user()?.email }}</p>
          <div class="profile-hero-actions">
            <button class="ui-btn ui-btn-primary" (click)="openEditDrawer()">Edit Profile</button>
            <button class="ui-btn ui-btn-secondary" (click)="openPasswordDrawer()">Change Password</button>
          </div>
        </div>
      </div>

      <div class="ui-card mt-6">
        <div class="profile-section-title">Profile Details</div>
        <div class="profile-details-grid">
          <div class="profile-field-group">
            <label>Name</label>
            <div class="profile-field-value">{{ auth.user()?.name }}</div>
          </div>
          <div class="profile-field-group">
            <label>Email</label>
            <div class="profile-field-value">{{ auth.user()?.email }}</div>
          </div>
          <div class="profile-field-group">
            <label>Phone</label>
            <div class="profile-field-value">{{ auth.user()?.phoneNumber || '—' }}</div>
          </div>
          <div class="profile-field-group">
            <label>Role</label>
            <div class="profile-field-value text-mono" style="font-weight:700; color:var(--primary);">{{ auth.user()?.role }}</div>
          </div>
          <div class="profile-field-group">
            <label>Company ID</label>
            <div class="profile-field-value text-mono">{{ auth.user()?.companyId }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- EDIT PROFILE DRAWER -->
    <app-side-sheet-drawer
      [isOpen]="isEditDrawerOpen"
      [title]="'Edit Profile'"
      [subtitle]="'Update your profile information.'"
      [saveText]="'Save Changes'"
      [saveDisabled]="profileForm.invalid"
      (close)="isEditDrawerOpen = false"
      (save)="saveProfile()"
    >
      <form [formGroup]="profileForm" class="drawer-crud-form">
         <div class="f-grid">
            <div class="f-group"><label>First Name</label><input class="f-input" formControlName="firstName"></div>
            <div class="f-group"><label>Last Name</label><input class="f-input" formControlName="lastName"></div>
         </div>
         <div class="f-group"><label>Phone</label><input class="f-input" formControlName="phoneNumber"></div>
      </form>
    </app-side-sheet-drawer>

    <!-- PASSWORD DRAWER -->
    <app-side-sheet-drawer
      [isOpen]="isPasswordDrawerOpen"
      [title]="'Change Password'"
      [subtitle]="passwordHint"
      [saveText]="'Update Password'"
      [saveDisabled]="passwordForm.invalid"
      (close)="isPasswordDrawerOpen = false"
      (save)="savePassword()"
    >
      <form [formGroup]="passwordForm" class="drawer-crud-form">
         <div class="f-group"><label>Current Password</label><input class="f-input" type="password" formControlName="oldPassword" autocomplete="current-password"></div>
         <mat-divider style="margin:1rem 0;"></mat-divider>
         <div class="f-group"><label>New Password</label><input class="f-input" type="password" formControlName="newPassword" autocomplete="new-password"></div>
         <div class="f-group"><label>Confirm New Password</label><input class="f-input" type="password" formControlName="confirmPassword" autocomplete="new-password"></div>
      </form>
    </app-side-sheet-drawer>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .profile-viewport { max-width: 900px; margin: 0 auto; padding-bottom: 3rem; }
    .profile-hero-card { display: flex; align-items: center; gap: 3rem; padding: 3rem; background: var(--surface); border: 1px solid var(--border); border-radius: 24px; box-shadow: var(--shadow-md); margin-top: 1rem; }
    .profile-avatar-large { width: 140px; height: 140px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--accent)); color: #fff; display: grid; place-items: center; font-size: 3rem; font-weight: 900; position: relative; box-shadow: 0 10px 25px rgba(47, 111, 235, 0.3); }
    .profile-hero-info h2 { font-size: 2.25rem; font-weight: 900; letter-spacing: -0.04em; margin-bottom: 0.5rem; }
    .profile-hero-info p { color: var(--txt-muted); font-weight: 600; margin-bottom: 1.5rem; }
    .profile-hero-actions { display: flex; gap: 0.75rem; }

    .profile-section-title { font-size: 0.85rem; font-weight: 900; color: var(--primary); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; }
    .profile-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
    .profile-field-group label { font-size: 0.65rem; font-weight: 800; color: var(--txt-muted); text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 0.5rem; }
    .profile-field-value { font-size: 1rem; font-weight: 700; }

    .mt-6 { margin-top: 1.5rem; }
    .text-mono { font-family: 'JetBrains Mono', monospace; }

    .f-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1.25rem; }
    .f-group label { font-size: 0.75rem; font-weight: 700; color: var(--txt-secondary); text-transform: uppercase; }
    .f-input { height: 44px; border-radius: 10px; border: 1.5px solid var(--border); padding: 0 1rem; font-family: inherit; font-size: 0.9rem; background: var(--surface); color: var(--txt-main); width: 100%; outline: none; }
    .f-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .ui-btn { padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 800; font-size: 0.85rem; cursor: pointer; border: none; transition: 0.2s; }
    .ui-btn-primary { background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(47, 111, 235, 0.2); }
    .ui-btn-secondary { background: var(--surface-2); color: var(--txt-secondary); border: 1px solid var(--border); }
  `]
})
export class ProfilePageComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);

  protected isEditDrawerOpen = false;
  protected isPasswordDrawerOpen = false;

  profileForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    phoneNumber: [''],
    companyId: [null]
  });

  passwordForm: FormGroup = this.fb.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, passwordPolicyValidator()]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  protected readonly passwordHint = PASSWORD_POLICY.hint;

  ngOnInit(): void {
    const u = this.auth.user();
    if (u) {
      const names = u.name.split(' ');
      this.profileForm.patchValue({
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        phoneNumber: u.phoneNumber || '',
        companyId: u.companyId
      });
    }
  }

  openEditDrawer() { this.isEditDrawerOpen = true; }
  openPasswordDrawer() { this.isPasswordDrawerOpen = true; }

  saveProfile() {
    if (this.profileForm.invalid) return;
    this.auth.updateProfile(this.profileForm.value).subscribe({
      next: () => {
        this.snack.open('Profile updated.', 'OK', { duration: 3000 });
        this.isEditDrawerOpen = false;
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Could not update profile.'), 'Dismiss', { duration: 5000 })
    });
  }

  savePassword() {
    if (this.passwordForm.invalid) return;
    const { oldPassword, newPassword } = this.passwordForm.value;
    this.auth.changePassword(oldPassword, newPassword).subscribe({
      next: () => {
        this.snack.open('Password changed.', 'OK', { duration: 3000 });
        this.isPasswordDrawerOpen = false;
        this.passwordForm.reset();
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Could not change password.'), 'Dismiss', { duration: 6000 })
    });
  }

  protected getInitials() {
    return this.auth.user()?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'EW';
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true };
  }
}
