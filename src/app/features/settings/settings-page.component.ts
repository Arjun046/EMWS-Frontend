import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatSlideToggleModule, MatSelectModule, MatFormFieldModule, MatInputModule,
    MatDividerModule, MatSnackBarModule, FormsModule, PageHeaderComponent
  ],
  template: `
    <app-page-header
      title="Settings & Preferences"
      subtitle="Customize your experience, manage notification preferences, and configure system options."
    />

    <section class="settings-shell">
      <!-- Appearance -->
      <mat-card class="settings-section">
        <div class="section-header">
          <mat-icon>palette</mat-icon>
          <div>
            <h3>Appearance</h3>
            <p>Customize how the EWMS console looks and feels.</p>
          </div>
        </div>
        <mat-divider></mat-divider>
        <div class="settings-body">
          <div class="setting-row">
            <div class="setting-info">
              <strong>Dark Mode</strong>
              <span>Switch between light and dark interface themes.</span>
            </div>
            <mat-slide-toggle [(ngModel)]="darkMode" (change)="onDarkModeToggle()"></mat-slide-toggle>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Compact Layout</strong>
              <span>Reduce spacing for more data density on screen.</span>
            </div>
            <mat-slide-toggle [(ngModel)]="compactMode" (change)="savePref('compact', compactMode)"></mat-slide-toggle>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Language</strong>
              <span>Display language for the interface.</span>
            </div>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="setting-select">
              <mat-select [(ngModel)]="language" (selectionChange)="savePref('language', language)">
                <mat-option value="en">English</mat-option>
                <mat-option value="es">Español</mat-option>
                <mat-option value="fr">Français</mat-option>
                <mat-option value="ar">العربية</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      </mat-card>

      <!-- Notifications -->
      <mat-card class="settings-section">
        <div class="section-header">
          <mat-icon>notifications</mat-icon>
          <div>
            <h3>Notification Preferences</h3>
            <p>Control which updates you receive and how.</p>
          </div>
        </div>
        <mat-divider></mat-divider>
        <div class="settings-body">
          <div class="setting-row">
            <div class="setting-info">
              <strong>Email Notifications</strong>
              <span>Receive important alerts via your registered email.</span>
            </div>
            <mat-slide-toggle [(ngModel)]="emailNotifs" (change)="savePref('emailNotifs', emailNotifs)"></mat-slide-toggle>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Push Notifications</strong>
              <span>Get real-time browser notifications for urgent updates.</span>
            </div>
            <mat-slide-toggle [(ngModel)]="pushNotifs" (change)="savePref('pushNotifs', pushNotifs)"></mat-slide-toggle>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Leave Approval Alerts</strong>
              <span>Notify me when a leave request needs my attention.</span>
            </div>
            <mat-slide-toggle [(ngModel)]="leaveAlerts" (change)="savePref('leaveAlerts', leaveAlerts)"></mat-slide-toggle>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Shift Change Alerts</strong>
              <span>Alert me when my schedule changes.</span>
            </div>
            <mat-slide-toggle [(ngModel)]="shiftAlerts" (change)="savePref('shiftAlerts', shiftAlerts)"></mat-slide-toggle>
          </div>
        </div>
      </mat-card>

      <!-- Regional -->
      <mat-card class="settings-section">
        <div class="section-header">
          <mat-icon>language</mat-icon>
          <div>
            <h3>Regional Settings</h3>
            <p>Locale, time zone, and date format preferences.</p>
          </div>
        </div>
        <mat-divider></mat-divider>
        <div class="settings-body">
          <div class="setting-row">
            <div class="setting-info">
              <strong>Time Zone</strong>
              <span>All times in the system will use this zone.</span>
            </div>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="setting-select">
              <mat-select [(ngModel)]="timezone" (selectionChange)="savePref('timezone', timezone)">
                <mat-option value="UTC">UTC</mat-option>
                <mat-option value="America/New_York">Eastern Time (US)</mat-option>
                <mat-option value="America/Chicago">Central Time (US)</mat-option>
                <mat-option value="America/Los_Angeles">Pacific Time (US)</mat-option>
                <mat-option value="Europe/London">London (GMT)</mat-option>
                <mat-option value="Asia/Kolkata">India (IST)</mat-option>
                <mat-option value="Asia/Dubai">Dubai (GST)</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Date Format</strong>
              <span>How dates appear across the system.</span>
            </div>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="setting-select">
              <mat-select [(ngModel)]="dateFormat" (selectionChange)="savePref('dateFormat', dateFormat)">
                <mat-option value="MM/DD/YYYY">MM/DD/YYYY</mat-option>
                <mat-option value="DD/MM/YYYY">DD/MM/YYYY</mat-option>
                <mat-option value="YYYY-MM-DD">YYYY-MM-DD</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Work Week Start</strong>
              <span>First day of your work week for scheduling.</span>
            </div>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="setting-select">
              <mat-select [(ngModel)]="weekStart" (selectionChange)="savePref('weekStart', weekStart)">
                <mat-option value="sunday">Sunday</mat-option>
                <mat-option value="monday">Monday</mat-option>
                <mat-option value="saturday">Saturday</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      </mat-card>

      @if (isAdmin()) {
        <!-- Admin-only -->
        <mat-card class="settings-section admin-section">
          <div class="section-header">
            <mat-icon>admin_panel_settings</mat-icon>
            <div>
              <h3>System Administration</h3>
              <p>Global system settings. Changes affect all users.</p>
            </div>
          </div>
          <mat-divider></mat-divider>
          <div class="settings-body">
            <div class="setting-row">
              <div class="setting-info">
                <strong>Payroll Cycle</strong>
                <span>Define the pay period frequency for the organization.</span>
              </div>
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="setting-select">
                <mat-select [(ngModel)]="payrollCycle" (selectionChange)="savePref('payrollCycle', payrollCycle)">
                  <mat-option value="MONTHLY">Monthly</mat-option>
                  <mat-option value="BI_WEEKLY">Bi-Weekly</mat-option>
                  <mat-option value="WEEKLY">Weekly</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <strong>Overtime Threshold</strong>
                <span>Hours per week before overtime kicks in.</span>
              </div>
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="setting-select narrow-field">
                <input matInput type="number" [(ngModel)]="overtimeThreshold" (change)="savePref('overtimeThreshold', overtimeThreshold)">
              </mat-form-field>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <strong>Allow Self-Registration</strong>
                <span>Let employees register without admin invitation.</span>
              </div>
              <mat-slide-toggle [(ngModel)]="selfRegistration" (change)="savePref('selfRegistration', selfRegistration)"></mat-slide-toggle>
            </div>
          </div>
        </mat-card>
      }
    </section>
  `,
  styles: [`
    .settings-shell { margin-top: 1.5rem; display: grid; gap: 1.5rem; max-width: 56rem; }

    .settings-section { border-radius: 1.5rem; border: 1px solid #e2e8f0; box-shadow: none !important; padding: 0; overflow: hidden; }
    .settings-section.admin-section { border-color: #fde68a; }

    .section-header { display: flex; align-items: flex-start; gap: 1rem; padding: 1.5rem 2rem; }
    .section-header mat-icon { font-size: 1.5rem; width: 1.5rem; height: 1.5rem; color: #3b82f6; margin-top: 0.1rem; }
    .section-header h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; }
    .section-header p { margin: 0.25rem 0 0; font-size: 0.85rem; color: #64748b; }

    .settings-body { padding: 0.5rem 2rem 1.5rem; }

    .setting-row { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 0; border-bottom: 1px solid #f1f5f9; }
    .setting-row:last-child { border-bottom: none; }
    .setting-info { display: flex; flex-direction: column; flex: 1; margin-right: 2rem; }
    .setting-info strong { font-size: 0.95rem; color: #1e293b; margin-bottom: 0.2rem; }
    .setting-info span { font-size: 0.82rem; color: #94a3b8; }

    .setting-select { width: 13rem; }
    .narrow-field { width: 6rem; }
    ::ng-deep .setting-select .mat-mdc-text-field-wrapper { height: 2.5rem; border-radius: 0.75rem !important; }

    @media (max-width: 768px) {
      .setting-row { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
      .setting-info { margin-right: 0; }
      .setting-select { width: 100%; }
      .section-header { padding: 1.25rem; }
      .settings-body { padding: 0.5rem 1.25rem 1.25rem; }
    }
  `]
})
export class SettingsPageComponent {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly snack = inject(MatSnackBar);

  // Load from localStorage with defaults
  protected darkMode = localStorage.getItem('ewms.pref.darkMode') === 'true';
  protected compactMode = localStorage.getItem('ewms.pref.compact') === 'true';
  protected language = localStorage.getItem('ewms.pref.language') || 'en';
  protected emailNotifs = localStorage.getItem('ewms.pref.emailNotifs') !== 'false';
  protected pushNotifs = localStorage.getItem('ewms.pref.pushNotifs') !== 'false';
  protected leaveAlerts = localStorage.getItem('ewms.pref.leaveAlerts') !== 'false';
  protected shiftAlerts = localStorage.getItem('ewms.pref.shiftAlerts') !== 'false';
  protected timezone = localStorage.getItem('ewms.pref.timezone') || 'UTC';
  protected dateFormat = localStorage.getItem('ewms.pref.dateFormat') || 'MM/DD/YYYY';
  protected weekStart = localStorage.getItem('ewms.pref.weekStart') || 'monday';
  protected payrollCycle = localStorage.getItem('ewms.pref.payrollCycle') || 'MONTHLY';
  protected overtimeThreshold = parseInt(localStorage.getItem('ewms.pref.overtimeThreshold') || '40', 10);
  protected selfRegistration = localStorage.getItem('ewms.pref.selfRegistration') === 'true';

  protected isAdmin(): boolean {
    return this.auth.user()?.role === 'ADMIN';
  }

  protected onDarkModeToggle(): void {
    this.savePref('darkMode', this.darkMode);
    // The ThemeService can handle this — for now toggle body class
    document.body.classList.toggle('global-dark-mode', this.darkMode);
  }

  protected savePref(key: string, value: any): void {
    localStorage.setItem(`ewms.pref.${key}`, String(value));
    this.snack.open('Preference saved.', 'OK', { duration: 1500 });
  }
}
