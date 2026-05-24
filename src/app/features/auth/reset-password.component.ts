import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="auth-card fade-up">
      <div class="auth-header">
        <div class="brand-logo">EW</div>
        <h2>Reset Password</h2>
        <p>Choose a new password for your EWMS account.</p>
      </div>

      <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="auth-form">
        <div class="form-field">
          <label>New Password</label>
          <div class="input-wrap">
            <mat-icon>lock_outline</mat-icon>
            <input
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              placeholder="At least 8 characters"
              class="f-input">
            <button type="button" class="toggle-pwd" (click)="showPassword.set(!showPassword())">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </div>
        </div>

        <div class="form-field">
          <label>Confirm Password</label>
          <div class="input-wrap">
            <mat-icon>verified_user</mat-icon>
            <input
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="confirmPassword"
              placeholder="Repeat password"
              class="f-input">
          </div>
        </div>

        <button type="submit" class="btn btn-p w-full mt-4" [disabled]="resetForm.invalid || isLoading()">
          @if (isLoading()) {
            <span class="spinner"></span>
            Updating password...
          } @else {
            Reset Password
          }
        </button>
      </form>

      <div class="auth-footer">
        <p>Remember your password? <a routerLink="/auth/login">Sign in</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-card { background: #fff; padding: 3.5rem; border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.08); width: 100%; max-width: 480px; border: 1px solid var(--border); }
    .auth-header { text-align: center; margin-bottom: 2.5rem; }
    .brand-logo { width: 48px; height: 48px; background: var(--primary); border-radius: 12px; color: #fff; display: grid; place-items: center; font-size: 1.2rem; font-weight: 900; margin: 0 auto 1.5rem; }
    .auth-header h2 { font-size: 1.75rem; font-weight: 800; letter-spacing: 0; margin-bottom: 0.5rem; }
    .auth-header p { color: var(--txt-muted); font-weight: 500; }
    .auth-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-field { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-field label { font-size: 0.85rem; font-weight: 700; color: var(--txt-main); }
    .input-wrap { position: relative; display: flex; align-items: center; }
    .input-wrap mat-icon { position: absolute; left: 1rem; font-size: 1.2rem; width: 1.2rem; height: 1.2rem; color: var(--txt-muted); }
    .f-input { padding-left: 3rem !important; }
    .toggle-pwd { position: absolute; right: 0.75rem; background: none; border: none; cursor: pointer; color: var(--txt-muted); padding: 0.5rem; }
    .w-full { width: 100%; justify-content: center; }
    .auth-footer { text-align: center; margin-top: 2rem; }
  `]
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  protected readonly showPassword = signal(false);
  protected readonly isLoading = signal(false);
  private token: string | null = null;

  protected readonly resetForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.snack.open('Invalid or missing reset token.', 'OK', { duration: 5000 });
      void this.router.navigate(['/auth/login']);
    }
  }

  private passwordMatchValidator(group: any) {
    return group.get('password').value === group.get('confirmPassword').value ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.resetForm.valid && this.token) {
      this.isLoading.set(true);
      const password = this.resetForm.value.password!;

      this.auth.resetPassword(this.token, password).subscribe({
        next: (res) => {
          this.snack.open(res.message || 'Password reset successfully.', 'Login Now', { duration: 5000 });
          void this.router.navigate(['/auth/login']);
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err.error?.message || 'Failed to reset password. The link may have expired.';
          this.snack.open(msg, 'OK', { duration: 5000 });
        }
      });
    }
  }
}
