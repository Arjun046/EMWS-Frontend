import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSnackBarModule, RouterLink],
  template: `
    <section class="auth-gate">
      <div class="auth-container">
        <!-- BRAND SIDE -->
        <div class="auth-brand-side">
          <div class="auth-logo-row">
            <div class="logo-orb">
              <mat-icon style="font-size: 18px;">domain</mat-icon>
            </div>
            <strong>EWMS Console</strong>
          </div>

          <div class="auth-hero-text">
            <h1>Identity Registration <span>Required.</span></h1>
            <p>Provision your secure credentials to access the enterprise workforce directory, operational telemetry, and compliance ledger.</p>
          </div>

          <div class="auth-signals-grid">
            <div class="auth-signal-card">
              <span>PROVISION</span>
              <strong>ACTIVE</strong>
            </div>
            <div class="auth-signal-card">
              <span>SSL</span>
              <strong>ENABLED</strong>
            </div>
            <div class="auth-signal-card">
              <span>SYNC</span>
              <strong>LIVE</strong>
            </div>
          </div>
        </div>

        <!-- FORM SIDE -->
        <div class="auth-form-side">
          <div class="auth-header">
            <h2>Initialize Account</h2>
            <p>Set up your professional identity nodes</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="f-group">
              <label>Full Name</label>
              <div class="input-icon-wrap">
                <mat-icon class="material-icons">person</mat-icon>
                <input type="text" class="f-input" formControlName="fullName" placeholder="Enter full name">
              </div>
            </div>

            <div class="f-group">
              <label>Work Email</label>
              <div class="input-icon-wrap">
                <mat-icon class="material-icons">mail</mat-icon>
                <input type="email" class="f-input" formControlName="email" placeholder="Enter work email" [readonly]="isEmailReadonly()">
              </div>
              <p *ngIf="isEmailReadonly()" style="font-size: 10px; color: var(--txt-muted); margin: 0; padding-left: 0.25rem;">Node-locked email provided by organization</p>
            </div>

            <div class="f-group">
              <label>Create Password</label>
              <div class="input-icon-wrap">
                <mat-icon class="material-icons">lock</mat-icon>
                <input type="password" class="f-input" formControlName="password" placeholder="Set secure password">
              </div>
            </div>

            <div class="f-group">
              <label>Verify Password</label>
              <div class="input-icon-wrap">
                <mat-icon class="material-icons">lock_reset</mat-icon>
                <input type="password" class="f-input" formControlName="confirmPassword" placeholder="Confirm secure password">
              </div>
              @if (form.get('confirmPassword')?.hasError('mismatch')) {
                <p style="font-size: 10px; color: var(--danger); margin: 0; padding-left: 0.25rem;">Telemetry mismatch: Passwords do not align</p>
              }
            </div>

            <button class="btn-submit" type="submit" [disabled]="form.invalid || loading()">
              <span>{{ loading() ? 'Provisioning...' : 'Lock and Provision Node' }}</span>
              <mat-icon style="margin-left: auto;">verified_user</mat-icon>
            </button>
          </form>

          <p class="auth-helper-note" style="margin-top: 1.5rem;">
            Already synchronized? <a routerLink="/auth/login" style="color: var(--primary); font-weight: 700; text-decoration: none;">Sign In</a>
          </p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class SignupPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);

  protected readonly loading = signal(false);
  protected readonly isEmailReadonly = signal(false);

  protected readonly form = this.fb.group({
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const email = params.get('email');
      const name = params.get('name');
      if (email) {
        this.form.patchValue({ email, fullName: name || '' });
        this.isEmailReadonly.set(true);
      }
    });
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirm = control.get('confirmPassword');
    if (password && confirm && password.value !== confirm.value) {
      confirm.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }

    const { email, password, fullName } = this.form.getRawValue();
    this.loading.set(true);
    this.auth.signup(email ?? '', password ?? '', fullName ?? '').subscribe({
      next: () => {
        this.loading.set(false);
        this.snack.open('Identity provisioned! You can now authenticate.', 'OK', { duration: 5000 });
        void this.router.navigateByUrl('/auth/login');
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Provision protocol failed. Connection interrupted.', 'Dismiss', { duration: 5000 });
      }
    });
  }
}
