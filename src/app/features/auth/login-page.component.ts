import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { backendErrorMessage } from '../../shared/utils/password-policy';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSnackBarModule],
  template: `
    <section class="auth-gate">
      <div class="auth-container">
        <div class="auth-brand-side">
          <div class="auth-logo-row">
            <div class="logo-orb">
              <mat-icon style="font-size: 18px;">domain</mat-icon>
            </div>
            <strong>EWMS Console</strong>
          </div>

          <div class="auth-hero-text">
            <h1>Workforce Operations <span>Verified.</span></h1>
            <p>Secure operations portal for attendance, leaves, scheduling, compliance ledger, and payroll management.</p>
          </div>

          <div class="auth-signals-grid">
            <div class="auth-signal-card">
              <span>GATEWAY</span>
              <strong>ONLINE</strong>
            </div>
            <div class="auth-signal-card">
              <span>SESSION</span>
              <strong>SECURE JWT</strong>
            </div>
            <div class="auth-signal-card">
              <span>TENANT</span>
              <strong>LOCAL_ENV</strong>
            </div>
          </div>
        </div>

        <div class="auth-form-side">
          <div class="auth-header">
            <h2>Access Workspace</h2>
            <p>Authentication required for local operations</p>
          </div>

          @if (errorMessage()) {
            <div class="error-banner" style="margin-bottom: 1.5rem; padding: 0.75rem; background: var(--danger-soft); color: var(--danger); border-radius: 8px; font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem;">
              <mat-icon style="font-size: 18px; width: 18px; height: 18px;">error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="f-group">
              <label>Email Address</label>
              <div class="input-icon-wrap">
                <mat-icon class="material-icons">mail</mat-icon>
                <input type="email" class="f-input" formControlName="email" placeholder="Enter work email">
              </div>
            </div>

            <div class="f-group">
              <label>Password</label>
              <div class="input-icon-wrap">
                <mat-icon class="material-icons">lock</mat-icon>
                <input type="password" class="f-input" formControlName="password" placeholder="Enter password">
              </div>
            </div>

            @if (mfaToken()) {
              <div class="f-group">
                <label>MFA Code</label>
                <div class="input-icon-wrap">
                  <mat-icon class="material-icons">key</mat-icon>
                  <input type="text" class="f-input" formControlName="mfaCode" placeholder="6-digit code">
                </div>
              </div>
            }

            <button class="btn-submit" type="submit" [disabled]="form.invalid || loading()">
              <span>{{ loading() ? 'Authenticating...' : mfaToken() ? 'Verify MFA and Enter' : 'Authenticate and Enter' }}</span>
              <mat-icon style="margin-left: auto;">arrow_forward</mat-icon>
            </button>
          </form>

          <p class="auth-helper-note" style="margin-top: 2rem; font-size: 0.75rem; color: var(--txt-muted); text-align: center; line-height: 1.4;">
            Enterprise Identity verified via end-to-end encrypted SSL.<br>Unauthorized access attempts are logged to the compliance ledger.
          </p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly mfaToken = signal<string | null>(null);

  // Professional: login must NOT enforce password policy (BE LoginRequest is @NotBlank only).
  // Policy applies to register/reset/setup/change only.
  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    mfaCode: ['']
  });

  protected submit(): void {
    if (this.form.invalid) return;

    const { email, password, mfaCode } = this.form.getRawValue();
    // Step 2 of MFA: verify code against BE mfaToken from step 1.
    if (this.mfaToken() && (mfaCode ?? '').trim()) {
      this.loading.set(true);
      this.auth.verifyMfa(this.mfaToken()!, (mfaCode ?? '').trim()).subscribe({
        next: () => {
          this.loading.set(false);
          this.mfaToken.set(null);
          void this.router.navigateByUrl('/dashboard');
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Invalid MFA code. Retry.');
        }
      });
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.login(email ?? '', password ?? '').subscribe({
      next: (res: any) => {
        this.loading.set(false);
        // BE MFA challenge: {mfaRequired:true, mfaToken} — stay on page, ask for code.
        if (res?.mfaRequired) {
          this.mfaToken.set(res.mfaToken);
          this.errorMessage.set('MFA required — enter your authenticator code.');
          return;
        }
        void this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 429) {
          this.errorMessage.set('Too many attempts. Wait a minute and retry.');
        } else if (err?.status === 401) {
          this.errorMessage.set(backendErrorMessage(err, 'Invalid username or password.'));
        } else {
          this.errorMessage.set(backendErrorMessage(err, 'Sign-in failed. Retry.'));
        }
      }
    });
  }
}
