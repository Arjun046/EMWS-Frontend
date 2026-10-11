import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { backendErrorMessage } from '../../shared/utils/password-policy';

const PREFS_KEY = 'ewms.ui.prefs';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatDividerModule, MatSnackBarModule],
  template: `
    <div class="settings-viewport fade-up">
      <div class="settings-grid">
        
        <!-- SIDE NAV -->
        <div class="settings-nav-panel">
          <div class="settings-nav-item" [class.active]="activePanel() === 'prefs'" (click)="activePanel.set('prefs')">
            <mat-icon>tune</mat-icon> Preferences
          </div>
          <div class="settings-nav-item" [class.active]="activePanel() === 'interface'" (click)="activePanel.set('interface')">
            <mat-icon>palette</mat-icon> Appearance
          </div>
          <div class="settings-nav-item" [class.active]="activePanel() === 'security'" (click)="activePanel.set('security')">
            <mat-icon>security</mat-icon> Security & Sessions
          </div>
        </div>

        <!-- CONTENT AREA -->
        <div class="settings-content-area">

          <!-- PREFERENCES (stored on this device) -->
          @if (activePanel() === 'prefs') {
            <div class="ui-card active-panel">
              <div class="profile-section-title">Preferences</div>
              <p style="font-size:0.78rem;color:var(--txt-muted);margin:-1rem 0 1rem;">Stored on this device only.</p>

              <div class="settings-row">
                <div class="settings-row-label">
                  <strong>Compact tables</strong>
                  <span>Denser rows in data tables.</span>
                </div>
                <div class="toggle-wrap" (click)="toggle('compact')">
                   <div class="toggle-pill" [class.on]="settings().compact"></div>
                </div>
              </div>

              <div style="margin-top:2rem;">
                 <button class="ui-btn ui-btn-primary" (click)="save()">Save Preferences</button>
              </div>
            </div>
          }

          <!-- APPEARANCE -->
          @if (activePanel() === 'interface') {
            <div class="ui-card active-panel">
              <div class="profile-section-title">Appearance</div>

              <div class="settings-row">
                <div class="settings-row-label">
                  <strong>Dark mode</strong>
                  <span>Easier on the eyes in low light. Applies everywhere, on all your devices.</span>
                </div>
                <div class="toggle-wrap" (click)="theme.toggleTheme()">
                   <div class="toggle-pill" [class.on]="theme.isDarkMode()"></div>
                </div>
              </div>
            </div>
          }

          <!-- SECURITY -->
          @if (activePanel() === 'security') {
            <div class="ui-card active-panel">
              <div class="profile-section-title">Security</div>

              <div class="profile-section-title" style="margin-top:2rem;">Session security center</div>
              <p style="font-size:0.78rem;color:var(--txt-muted);">Active refresh sessions for this identity. Revoking kills the token server-side.</p>
              @for (s of sessions(); track s.id) {
                <div class="settings-row">
                  <div class="settings-row-label">
                    <strong>{{ s.deviceName || 'Session #' + s.id }}</strong>
                    <span>{{ s.ipAddress || 'unknown IP' }} · {{ s.userAgent || 'unknown device' }}</span>
                  </div>
                  <button class="ui-btn ui-btn-secondary" (click)="revokeSession(s.id)">Revoke</button>
                </div>
              }
              @if (!sessions().length) {
                <p style="font-size:0.8rem;color:var(--txt-muted);">No other sessions (or list unavailable).</p>
              }
              <button class="ui-btn ui-btn-secondary" style="margin-top:0.5rem;" (click)="revokeAll()">Revoke all other sessions</button>

              <div class="profile-section-title" style="margin-top:2rem;">Multi-factor authentication</div>
              <div class="settings-row">
                <div class="settings-row-label">
                  <strong>MFA is {{ mfaEnabled() ? 'on' : 'off' }}</strong>
                  <span>Authenticator-app (TOTP) second factor on login.</span>
                </div>
                @if (!mfaEnabled()) {
                  <button class="ui-btn ui-btn-primary" (click)="setupMfa()">Set up MFA</button>
                } @else {
                  <div style="display:flex;gap:0.5rem;align-items:center;">
                    <input class="f-input" [(ngModel)]="mfaCode" placeholder="6-digit code" style="width:140px;">
                    <button class="ui-btn ui-btn-secondary" style="color:var(--danger);" (click)="disableMfa()">Disable</button>
                  </div>
                }
              </div>
              @if (mfaSetup()) {
                <div class="ui-card" style="margin-top:1rem;">
                  <p style="font-size:0.8rem;">Scan with your authenticator app, then confirm:</p>
                  @if (mfaSetup()?.qrCodeUrl) {
                    <img [src]="mfaSetup()?.qrCodeUrl" alt="MFA QR code" style="width:160px;height:160px;">
                  } @else {
                    <p class="text-mono" style="font-size:0.8rem;">Secret: {{ mfaSetup()?.secret }}</p>
                  }
                  <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
                    <input class="f-input" [(ngModel)]="mfaCode" placeholder="6-digit code" style="width:140px;">
                    <button class="ui-btn ui-btn-primary" (click)="confirmMfa()">Confirm & enable</button>
                  </div>
                </div>
              }
            </div>
          }

        </div>

      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .settings-viewport { max-width: 1000px; margin: 0 auto; padding-top: 1rem; }
    .settings-grid { display: grid; grid-template-columns: 280px 1fr; gap: 2rem; }
    
    .settings-nav-panel { display: flex; flex-direction: column; gap: 0.5rem; }
    .settings-nav-item { padding: 1rem 1.25rem; border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 0.75rem; color: var(--txt-secondary); transition: 0.2s; }
    .settings-nav-item:hover { background: var(--surface-2); color: var(--txt-main); }
    .settings-nav-item.active { background: var(--primary-soft); color: var(--primary); }
    
    .profile-section-title { font-size: 0.85rem; font-weight: 900; color: var(--primary); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; }
    
    .settings-row { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 0; border-bottom: 1px dashed var(--border); }
    .settings-row-label strong { display: block; font-size: 0.95rem; margin-bottom: 0.25rem; }
    .settings-row-label span { font-size: 0.78rem; color: var(--txt-muted); line-height: 1.4; }
    
    .toggle-wrap { width: 44px; height: 22px; background: var(--surface-3); border-radius: 99px; padding: 3px; cursor: pointer; transition: 0.3s; position: relative; }
    .toggle-pill { width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: 0.3s; box-shadow: var(--shadow-sm); }
    .toggle-pill.on { transform: translateX(22px); background: var(--primary); }

    .f-input { height: 42px; border-radius: 8px; border: 1.5px solid var(--border); padding: 0 0.85rem; font-family: inherit; font-size: 0.85rem; background: var(--surface); color: var(--txt-main); outline: none; }
    
    .ui-btn { padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 800; font-size: 0.85rem; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 0.5rem; transition: 0.2s; }
    .ui-btn-primary { background: var(--primary); color: #fff; }
    .ui-btn-secondary { background: var(--surface-2); color: var(--txt-secondary); border: 1px solid var(--border); }
  `]
})
export class SettingsPageComponent implements OnInit {
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly activePanel = signal('prefs');

  protected readonly sessions = signal<any[]>([]);
  protected readonly mfaEnabled = signal(false);
  protected readonly mfaSetup = signal<{ secret: string; qrCodeUrl?: string; otpauthUrl?: string } | null>(null);
  protected mfaCode = '';

  ngOnInit(): void {
    this.reloadSecurity();
  }

  reloadSecurity(): void {
    this.auth.listSessions().subscribe({
      next: (s) => this.sessions.set(s ?? []),
      error: () => this.sessions.set([])
    });
    this.auth.mfaStatus().subscribe({
      next: (s) => this.mfaEnabled.set(!!s?.enabled),
      error: () => this.mfaEnabled.set(false)
    });
  }

  revokeSession(id: number): void {
    this.auth.revokeSession(id).subscribe({
      next: () => { this.snack.open('Session revoked.', 'OK', { duration: 3000 }); this.reloadSecurity(); },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Revoke failed.'), 'Dismiss', { duration: 5000 })
    });
  }

  revokeAll(): void {
    this.auth.revokeAllSessions().subscribe({
      next: () => { this.snack.open('All other sessions revoked.', 'OK', { duration: 3000 }); this.reloadSecurity(); },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Revoke-all failed.'), 'Dismiss', { duration: 5000 })
    });
  }

  setupMfa(): void {
    this.auth.mfaSetup().subscribe({
      next: (s) => this.mfaSetup.set(s),
      error: (err) => this.snack.open(backendErrorMessage(err, 'MFA setup failed.'), 'Dismiss', { duration: 5000 })
    });
  }

  confirmMfa(): void {
    if (!this.mfaCode.trim()) return;
    this.auth.mfaConfirm(this.mfaCode.trim()).subscribe({
      next: () => {
        this.snack.open('MFA enabled.', 'OK', { duration: 3000 });
        this.mfaSetup.set(null); this.mfaCode = '';
        this.reloadSecurity();
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Invalid code.'), 'Dismiss', { duration: 5000 })
    });
  }

  disableMfa(): void {
    if (!this.mfaCode.trim()) {
      this.snack.open('Enter your current 6-digit code to disable MFA.', 'Dismiss', { duration: 4000 });
      return;
    }
    this.auth.mfaDisable(this.mfaCode.trim()).subscribe({
      next: () => { this.snack.open('MFA disabled.', 'OK', { duration: 3000 }); this.mfaCode = ''; this.reloadSecurity(); },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Disable failed.'), 'Dismiss', { duration: 5000 })
    });
  }
  
  protected settings = signal(this.loadPrefs());

  private loadPrefs(): { compact: boolean } {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) return { compact: !!(JSON.parse(raw) as { compact?: boolean }).compact };
    } catch { /* corrupted prefs: fall through to defaults */ }
    return { compact: false };
  }

  protected toggle(key: keyof ReturnType<typeof this.loadPrefs>) {
    this.settings.update(s => ({ ...s, [key]: !s[key] }));
  }

  protected save() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(this.settings()));
    this.snack.open('Preferences saved on this device.', 'OK', { duration: 3000 });
  }
}
