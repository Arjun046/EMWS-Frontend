import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

/**
 * Permission-denied state shown when an authenticated user attempts an action
 * or route outside their granted scopes. Never reveals whether a resource
 * exists; simply states the current session is not authorized.
 */
@Component({
  selector: 'app-forbidden-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatCardModule],
  template: `
    <section class="forbidden-view">
      <mat-card class="forbidden-card">
        <mat-card-header>
          <div class="forbidden-icon-wrap">
            <mat-icon class="forbidden-icon">error_outline</mat-icon>
          </div>
          <mat-card-title>Access denied</mat-card-title>
          <mat-card-subtitle>Your current session is not authorized for this area.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>You are signed in, but your role does not include the permission required for this page or action.</p>
          <p class="hint">If you believe you should have access, contact your organization administrator or request access through your manager.</p>
        </mat-card-content>
        <mat-card-actions class="forbidden-actions">
          <button mat-button [routerLink]="'/dashboard'" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
            <span>Return to dashboard</span>
          </button>
          <button mat-stroked-button color="warn" (click)="auth.logout()" class="signout-btn">
            <mat-icon>logout</mat-icon>
            <span>Sign out</span>
          </button>
        </mat-card-actions>
      </mat-card>
    </section>
  `,
  styles: [`
    :host { display: block; height: 100vh; width: 100vw; background: var(--bg); display: grid; place-items: center; overflow: hidden; }
    .forbidden-view { width: 100%; max-width: 560px; padding: 1.5rem; display: flex; flex-direction: column; align-items: center; }
    .forbidden-card { width: 100%; }
    .forbidden-icon-wrap { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; background: var(--danger-soft); margin: 0 auto -0.75rem; }
    .forbidden-icon { font-size: 28px; height: 28px; width: 28px; color: var(--danger); }
    .hint { font-size: 0.85rem; color: var(--txt-muted); margin-top: 0.5rem; line-height: 1.5; }
    .forbidden-actions { display: flex; gap: 0.75rem; justify-content: flex-end; padding-top: 1rem; }
    .back-btn { color: var(--txt-secondary); }
    .back-btn mat-icon { font-size: 20px; height: 20px; width: 20px; }
  `]
})
export class ForbiddenPageComponent {
  protected readonly auth = inject(AuthService);
}
