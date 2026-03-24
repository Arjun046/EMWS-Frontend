import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Change Password</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-4 mt-2">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Current Password</mat-label>
          <input matInput type="password" formControlName="oldPassword">
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>New Password</mat-label>
          <input matInput type="password" formControlName="newPassword">
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Confirm New Password</mat-label>
          <input matInput type="password" formControlName="confirmPassword">
        </mat-form-field>
        <div *ngIf="form.errors?.['mismatch']" class="text-red-500 text-xs mt-[-1rem] mb-2">Passwords do not match</div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="submit()">Update Password</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .w-full { width: 100%; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .gap-4 { gap: 1rem; }
    .mt-2 { margin-top: 0.5rem; }
    .text-red-500 { color: #ef4444; }
    .text-xs { font-size: 0.75rem; }
  `]
})
export class ChangePasswordDialog {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  protected readonly dialogRef = inject(MatDialogRef<ChangePasswordDialog>);

  protected readonly form = this.fb.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: (group: any) => group.get('newPassword').value === group.get('confirmPassword').value ? null : { mismatch: true } });

  protected submit(): void {
    const { oldPassword, newPassword } = this.form.getRawValue();
    this.auth.changePassword(oldPassword!, newPassword!).subscribe({
      next: () => {
        this.snack.open('Password updated successfully', 'OK', { duration: 3000 });
        this.dialogRef.close();
      },
      error: () => this.snack.open('Failed to update password. Please check your current password.', 'OK', { duration: 3000 })
    });
  }
}

@Component({
  selector: 'app-two-factor-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatSlideToggleModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Two-Factor Authentication</h2>
    <mat-dialog-content>
      <div class="flex flex-col gap-4 mt-2">
        <p>Enhance your account security by requiring a second verification step when you log in.</p>
        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <h4 class="margin-0">2FA Status</h4>
            <p class="margin-0 text-sm text-slate-500">{{ enabled ? 'Currently enabled' : 'Currently disabled' }}</p>
          </div>
          <mat-slide-toggle [(ngModel)]="enabled" (change)="toggle()"></mat-slide-toggle>
        </div>
        
        <div *ngIf="enabled" class="mt-4 p-4 border border-blue-100 bg-blue-50 rounded-lg">
          <p class="margin-0 text-sm">When enabled, you will receive a verification code via your registered email or mobile device during login.</p>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" (click)="dialogRef.close()">Done</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .gap-4 { gap: 1rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-4 { margin-top: 1rem; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .p-4 { padding: 1rem; }
    .bg-slate-50 { background-color: #f8fafc; }
    .bg-blue-50 { background-color: #eff6ff; }
    .border { border-width: 1px; }
    .border-blue-100 { border-color: #dbeafe; }
    .rounded-lg { border-radius: 0.5rem; }
    .margin-0 { margin: 0; }
    .text-sm { font-size: 0.875rem; }
    .text-slate-500 { color: #64748b; }
  `]
})
export class TwoFactorDialog {
  protected readonly dialogRef = inject(MatDialogRef<TwoFactorDialog>);
  private readonly snack = inject(MatSnackBar);
  protected enabled = false;

  protected toggle(): void {
    const status = this.enabled ? 'enabled' : 'disabled';
    this.snack.open(`Two-Factor Authentication ${status}`, 'OK', { duration: 3000 });
  }
}

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatDividerModule, MatListModule, PageHeaderComponent, MatSnackBarModule, MatDialogModule],
  template: `
    <app-page-header title="My Profile" subtitle="Manage your enterprise identity, workforce credentials, and personal preferences." />

    <div class="profile-grid">
      <mat-card class="main-card">
        <div class="user-header">
          <div class="large-avatar">
            <img *ngIf="auth.user()?.avatar?.startsWith('http')" [src]="auth.user()?.avatar" alt="Profile Image" class="profile-img">
            <span *ngIf="!auth.user()?.avatar?.startsWith('http')">{{ auth.user()?.avatar }}</span>
          </div>
          <div class="user-info">
            <h1>{{ auth.user()?.name }}</h1>
            <p class="role-badge">{{ auth.user()?.role }}</p>
            <p class="email-text">{{ auth.user()?.email }}</p>
          </div>
          <button mat-flat-button color="primary">Edit Profile</button>
        </div>

        <mat-divider></mat-divider>

        <div class="profile-details">
          <div class="section">
            <h3>Personal Information</h3>
            <div class="detail-row">
              <span class="label">Full Name</span>
              <span class="value">{{ auth.user()?.name }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Email Address</span>
              <span class="value">{{ auth.user()?.email }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Phone Number</span>
              <span class="value">+1 (555) 123-4567</span>
            </div>
          </div>

          <div class="section">
            <h3>Workforce Identity</h3>
            <div class="detail-row">
              <span class="label">Employee ID</span>
              <span class="value">EWMS-{{ auth.user()?.id?.toString()?.padStart(4, '0') }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Primary Role</span>
              <span class="value">{{ auth.user()?.role }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Status</span>
              <span class="value success">Active</span>
            </div>
          </div>
        </div>
      </mat-card>

      <div class="side-column">
        <mat-card class="security-card">
          <h3>Security & Access</h3>
          <p>Manage your account security and password.</p>
          <button mat-stroked-button class="w-full mb-3" (click)="openChangePassword()">Change Password</button>
          <button mat-stroked-button class="w-full" (click)="open2FA()">Two-Factor Auth</button>
        </mat-card>

        <mat-card class="activity-card mt-4">
          <h3>Recent Activity</h3>
          <mat-list>
            <mat-list-item>
              <mat-icon matListItemIcon>login</mat-icon>
              <div matListItemTitle>Successful Login</div>
              <div matListItemLine>Today, 08:45 AM</div>
            </mat-list-item>
            <mat-list-item>
              <mat-icon matListItemIcon>edit</mat-icon>
              <div matListItemTitle>Profile Updated</div>
              <div matListItemLine>Yesterday, 02:15 PM</div>
            </mat-list-item>
          </mat-list>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .profile-grid { display: grid; grid-template-columns: 1fr 22rem; gap: 1.5rem; margin-top: 1.5rem; }
    
    .main-card { border-radius: 1.2rem; border: 1px solid #e2e8f0; padding: 0; overflow: hidden; }
    .user-header { padding: 2.5rem; display: flex; align-items: center; gap: 2rem; }
    .large-avatar { width: 6.5rem; height: 6.5rem; border-radius: 1.5rem; background: linear-gradient(135deg, #3b82f6, #06b6d4); color: #fff; display: grid; place-items: center; font-size: 2.5rem; font-weight: 800; box-shadow: 0 12px 24px rgba(59, 130, 246, 0.25); overflow: hidden; }
    .profile-img { width: 100%; height: 100%; object-fit: cover; }
    .user-info { flex: 1; }
    .user-info h1 { margin: 0 0 0.5rem; font-size: 2rem; font-weight: 800; color: #0f172a; }
    .role-badge { display: inline-block; padding: 0.25rem 0.75rem; background: #eff6ff; color: #2563eb; border-radius: 0.5rem; font-weight: 700; font-size: 0.85rem; margin-bottom: 0.5rem; }
    .email-text { margin: 0; color: #64748b; font-weight: 500; }

    .profile-details { padding: 2.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; }
    .section h3 { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 1.5rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.75rem; }
    .detail-row { display: flex; flex-direction: column; margin-bottom: 1.25rem; }
    .label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
    .value { font-size: 1rem; color: #334155; font-weight: 500; }
    .value.success { color: #10b981; }

    .side-column h3 { font-size: 1rem; font-weight: 700; margin-bottom: 1rem; }
    .security-card, .activity-card { border-radius: 1.2rem; border: 1px solid #e2e8f0; padding: 1.5rem; }
    .w-full { width: 100%; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mt-4 { margin-top: 1rem; }

    @media (max-width: 1100px) {
      .profile-grid { grid-template-columns: 1fr; }
      .profile-details { grid-template-columns: 1fr; }
    }
  `]
})
export class ProfilePageComponent {
  protected readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected openChangePassword(): void {
    this.dialog.open(ChangePasswordDialog, { width: '400px' });
  }

  protected open2FA(): void {
    this.dialog.open(TwoFactorDialog, { width: '400px' });
  }
}
