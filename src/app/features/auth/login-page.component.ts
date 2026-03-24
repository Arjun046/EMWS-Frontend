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

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSnackBarModule],
  template: `
    <section class="login-shell">
      <div class="intro">
        <p class="eyebrow">EWMS Workforce Console</p>
        <h1>Run workforce operations from one deliberate command surface.</h1>
        <p>Premium Angular frontend for attendance, leave, payroll, scheduling, compliance, communication, analytics, and live operational widgets.</p>
        <div class="hero-grid">
          <article><span>Realtime</span><strong>Widget feeds, chat, and live alerts through gateway sockets.</strong></article>
          <article><span>Control</span><strong>Protected shell, token handling, and scalable feature routing.</strong></article>
          <article><span>Execution</span><strong>Workforce modules shaped for real operations teams, not a template demo.</strong></article>
        </div>
      </div>

      <mat-card class="login-card">
        <p class="eyebrow">Sign In</p>
        <h2>Workforce access</h2>

        @if (errorMessage()) {
          <div class="error-banner">
            <mat-icon>error</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <mat-icon matPrefix>mail</mat-icon>
            <input matInput formControlName="email" placeholder="ops.admin@ewms.local">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <mat-icon matPrefix>lock</mat-icon>
            <input matInput type="password" formControlName="password" placeholder="Enter password">
          </mat-form-field>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Signing in...' : 'Enter Console' }}
          </button>
        </form>
        <small>Demo credentials: ops.admin&#64;ewms.local / password</small>
      </mat-card>
    </section>
  `,
  styles: [`
    .login-shell { min-height: 100vh; display: grid; grid-template-columns: 1.2fr 0.85fr; gap: 2rem; padding: 2rem; background: radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 20rem), radial-gradient(circle at bottom right, rgba(249, 115, 22, 0.16), transparent 24rem), linear-gradient(180deg, #eff6ff 0%, #fff7ed 100%); }
    .intro { padding: 2rem; align-self: center; }
    .eyebrow { margin: 0 0 0.8rem; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--app-primary-600); }
    h1 { margin: 0; font-size: clamp(2.4rem, 4vw, 4.3rem); line-height: 0.95; max-width: 14ch; }
    p { color: var(--app-text-secondary); max-width: 50rem; }
    .hero-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 2rem; }
    .hero-grid article { padding: 1rem; border-radius: 1.2rem; background: rgba(255, 255, 255, 0.74); border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: 0 24px 54px rgba(15, 23, 42, 0.07); }
    .hero-grid span { display: inline-block; margin-bottom: 0.5rem; color: var(--app-primary-700); font-size: 0.76rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
    .login-card { align-self: center; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 28px 70px rgba(15, 23, 42, 0.14); }
    .login-card form { display: grid; gap: 1rem; margin-top: 1rem; }
    .login-card button { min-height: 3.15rem; border-radius: 0.75rem; font-weight: 700; }
    .error-banner { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 0.75rem; color: #ef4444; margin-bottom: 1.5rem; }
    .error-banner mat-icon { font-size: 1.25rem; width: 1.25rem; height: 1.25rem; }
    small { display: block; margin-top: 1.5rem; color: var(--app-text-muted); text-align: center; }
    @media (max-width: 1100px) { .login-shell { grid-template-columns: 1fr; } .hero-grid { grid-template-columns: 1fr; } }
  `]
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.group({
    email: ['ops.admin@ewms.local', [Validators.required, Validators.email]],
    password: ['password', [Validators.required, Validators.minLength(4)]]
  });

  protected submit(): void {
    if (this.form.invalid) {
      console.log('[LoginPage] Form is invalid');
      return;
    }

    const { email, password } = this.form.getRawValue();
    console.log(`[LoginPage] Submitting login for ${email}`);
    
    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.login(email ?? '', password ?? '').subscribe({
      next: (response) => {
        console.log('[LoginPage] Login successful, redirecting...');
        this.loading.set(false);
        void this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        console.error('[LoginPage] Login failed observable block', err);
        this.loading.set(false);
        this.errorMessage.set('Invalid email or password. Please try again.');
        this.snack.open('Authentication failed: Incorrect credentials', 'Dismiss', { 
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }
}
