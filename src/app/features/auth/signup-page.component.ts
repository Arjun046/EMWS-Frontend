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
    <section class="signup-shell">
      <div class="intro">
        <p class="eyebrow">Enterprise Workforce Management</p>
        <h1>Complete your employee registration.</h1>
        <p>You have been added to the enterprise workforce directory. Please set your secure password to access your dashboard, schedules, and payroll.</p>
        <div class="feature-grid">
          <article>
            <mat-icon>dashboard</mat-icon>
            <strong>Unified Surface</strong>
            <p>Access your shifts, leave requests, and payslips in one place.</p>
          </article>
          <article>
            <mat-icon>chat</mat-icon>
            <strong>Live Communication</strong>
            <p>Stay connected with your team through encrypted workforce chat.</p>
          </article>
        </div>
      </div>

      <mat-card class="signup-card">
        <p class="eyebrow">Onboarding</p>
        <h2>Set Password</h2>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Full Name</mat-label>
            <mat-icon matPrefix>person</mat-icon>
            <input matInput formControlName="fullName" placeholder="John Doe">
          </mat-form-field>
          
          <mat-form-field appearance="outline">
            <mat-label>Work Email</mat-label>
            <mat-icon matPrefix>mail</mat-icon>
            <input matInput formControlName="email" placeholder="john.doe@ewms.local" [readonly]="isEmailReadonly()">
            <mat-hint *ngIf="isEmailReadonly()">Email provided by your organization</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Create Password</mat-label>
            <mat-icon matPrefix>lock</mat-icon>
            <input matInput type="password" formControlName="password" placeholder="Min 6 characters">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Confirm Password</mat-label>
            <mat-icon matPrefix>lock_reset</mat-icon>
            <input matInput type="password" formControlName="confirmPassword" placeholder="Re-enter password">
            <mat-error *ngIf="form.get('confirmPassword')?.hasError('mismatch')">
              Passwords do not match
            </mat-error>
          </mat-form-field>

          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Finalizing...' : 'Complete Signup' }}
          </button>
        </form>
        <p class="footer-text">Already have an account? <a routerLink="/auth/login">Sign In</a></p>
      </mat-card>
    </section>
  `,
  styles: [`
    .signup-shell { min-height: 100vh; display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 2rem; padding: 2rem; background: radial-gradient(circle at top right, rgba(37, 99, 235, 0.1), transparent 30rem), radial-gradient(circle at bottom left, rgba(249, 115, 22, 0.08), transparent 24rem), #f8fafc; }
    .intro { padding: 2rem; align-self: center; }
    .eyebrow { margin: 0 0 0.8rem; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--app-primary-600); }
    h1 { margin: 0; font-size: clamp(2rem, 3.5vw, 3.5rem); line-height: 1.1; max-width: 15ch; color: #0f172a; }
    p { color: #64748b; margin-top: 1.5rem; line-height: 1.6; }
    .feature-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; margin-top: 3rem; }
    .feature-grid article { display: flex; align-items: flex-start; gap: 1rem; }
    .feature-grid mat-icon { color: var(--app-primary-600); }
    .feature-grid strong { display: block; color: #0f172a; }
    .feature-grid p { margin: 0.2rem 0 0; font-size: 0.9rem; }
    .signup-card { align-self: center; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 30px 60px -12px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.1); }
    .signup-card h2 { margin: 0 0 1.5rem; font-size: 1.8rem; }
    .signup-card form { display: grid; gap: 0.75rem; }
    .signup-card button { min-height: 3.5rem; font-weight: 700; margin-top: 1.5rem; border-radius: 0.75rem; }
    .footer-text { text-align: center; font-size: 0.9rem; margin-top: 1.5rem; }
    .footer-text a { color: var(--app-primary-600); font-weight: 600; text-decoration: none; }
    @media (max-width: 1100px) { .signup-shell { grid-template-columns: 1fr; } .intro { display: none; } }
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
        this.snack.open('Account verified! You can now sign in.', 'OK', { duration: 5000 });
        void this.router.navigateByUrl('/auth/login');
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Signup failed. Please try again later.', 'Dismiss', { duration: 5000 });
      }
    });
  }
}
