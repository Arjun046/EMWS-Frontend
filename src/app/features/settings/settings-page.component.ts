import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatDividerModule, MatSnackBarModule],
  template: `
    <div class="settings-viewport fade-up">
      <div class="settings-grid">
        
        <!-- SIDE NAV -->
        <div class="settings-nav-panel">
          <div class="settings-nav-item" [class.active]="activePanel() === 'nodes'" (click)="activePanel.set('nodes')">
            <mat-icon>hub</mat-icon> Node Configuration
          </div>
          <div class="settings-nav-item" [class.active]="activePanel() === 'interface'" (click)="activePanel.set('interface')">
            <mat-icon>palette</mat-icon> Interface Style
          </div>
          <div class="settings-nav-item" [class.active]="activePanel() === 'security'" (click)="activePanel.set('security')">
            <mat-icon>security</mat-icon> Data Security
          </div>
        </div>

        <!-- CONTENT AREA -->
        <div class="settings-content-area">
          
          <!-- NODE CONFIGURATION -->
          @if (activePanel() === 'nodes') {
            <div class="ui-card active-panel">
              <div class="profile-section-title">Telemetry & Node Preferences</div>
              
              <div class="settings-row">
                <div class="settings-row-label">
                  <strong>Automatic Station Sync</strong>
                  <span>Allow system to automatically synchronize clock-in telemetry on boot.</span>
                </div>
                <div class="toggle-wrap" (click)="toggle('sync')">
                   <div class="toggle-pill" [class.on]="settings().sync"></div>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-row-label">
                  <strong>Notification Dispatch</strong>
                  <span>Receive high-fidelity alerts for leave approvals and roster changes.</span>
                </div>
                <div class="toggle-wrap" (click)="toggle('notifs')">
                   <div class="toggle-pill" [class.on]="settings().notifs"></div>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-row-label">
                   <strong>Timezone Epoch</strong>
                   <span>Used for all operational logs and timestamp packets.</span>
                </div>
                <select class="f-input" style="width:auto; height:38px;">
                   <option>UTC+05:30 (Mumbai/Kolkata)</option>
                   <option>UTC-05:00 (New York/HQ)</option>
                </select>
              </div>

              <div style="margin-top:2rem;">
                 <button class="ui-btn ui-btn-primary" (click)="save()">Commit Configuration</button>
              </div>
            </div>
          }

          <!-- INTERFACE -->
          @if (activePanel() === 'interface') {
            <div class="ui-card active-panel">
              <div class="profile-section-title">Interface Visual Stack</div>
              
              <div class="settings-row">
                <div class="settings-row-label">
                  <strong>Dark Operations Mode</strong>
                  <span>High-contrast operational theme for low-light environments.</span>
                </div>
                <div class="toggle-wrap" (click)="toggleTheme()">
                   <div class="toggle-pill" [class.on]="isDark()"></div>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-row-label">
                  <strong>Compact Data Grid</strong>
                  <span>Increase data density in tables by reducing padding nodes.</span>
                </div>
                <div class="toggle-wrap" (click)="toggle('compact')">
                   <div class="toggle-pill" [class.on]="settings().compact"></div>
                </div>
              </div>
            </div>
          }

          <!-- SECURITY -->
          @if (activePanel() === 'security') {
            <div class="ui-card active-panel">
              <div class="profile-section-title">Forensic & Data Security</div>
              
              <div class="settings-row">
                <div class="settings-row-label">
                  <strong>Session Activity Logging</strong>
                  <span>Immutable recording of all UI interactions in the compliance ledger.</span>
                </div>
                <div class="toggle-wrap" (click)="toggle('audit')">
                   <div class="toggle-pill" [class.on]="settings().audit"></div>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-row-label">
                  <strong>Geofence Verification</strong>
                  <span>Require GPS coordinate validation for all biometric operations.</span>
                </div>
                <div class="toggle-wrap" (click)="toggle('geofence')">
                   <div class="toggle-pill" [class.on]="settings().geofence"></div>
                </div>
              </div>

              <div style="margin-top:2rem; padding-top:1.5rem; border-top:1px solid var(--border);">
                 <button class="ui-btn ui-btn-secondary" style="color:var(--danger); border-color:var(--danger-soft);">
                    <mat-icon>download</mat-icon> Export Identity Data
                 </button>
              </div>
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
export class SettingsPageComponent {
  private readonly snack = inject(MatSnackBar);
  protected readonly activePanel = signal('nodes');
  
  protected settings = signal({
    sync: true,
    notifs: true,
    compact: false,
    audit: true,
    geofence: false
  });

  protected isDark = signal(document.body.classList.contains('global-dark-mode'));

  protected toggle(key: keyof ReturnType<typeof this.settings>) {
    this.settings.update(s => ({ ...s, [key]: !s[key] }));
  }

  protected toggleTheme() {
    document.body.classList.toggle('global-dark-mode');
    this.isDark.set(document.body.classList.contains('global-dark-mode'));
  }

  protected save() {
    this.snack.open('Operational configuration committed to core node.', 'OK', { duration: 3000 });
  }
}
