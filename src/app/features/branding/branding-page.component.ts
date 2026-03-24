import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ThemeService, CompanyTheme } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

@Component({
  selector: 'app-branding-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatCardModule, 
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, 
    MatSelectModule, MatSnackBarModule, PageHeaderComponent
  ],
  template: `
    <app-page-header title="Company Branding" subtitle="Customize your organization's look and feel. These changes apply to all users." />

    <div class="branding-grid">
      <!-- Settings Form -->
      <mat-card class="settings-card">
        <header>
          <h3>Branding Configuration</h3>
          <button mat-stroked-button color="warn" (click)="reset()">Reset to Default</button>
        </header>

        <form [formGroup]="form" class="branding-form">
          <div class="form-section">
            <h4>Color Palette</h4>
            <div class="color-grid">
              <div class="color-input">
                <label>Primary Color</label>
                <div class="picker-wrapper">
                  <input type="color" formControlName="primaryColor">
                  <code>{{ form.get('primaryColor')?.value }}</code>
                </div>
              </div>
              <div class="color-input">
                <label>Secondary Color</label>
                <div class="picker-wrapper">
                  <input type="color" formControlName="secondaryColor">
                  <code>{{ form.get('secondaryColor')?.value }}</code>
                </div>
              </div>
              <div class="color-input">
                <label>Accent Color</label>
                <div class="picker-wrapper">
                  <input type="color" formControlName="accentColor">
                  <code>{{ form.get('accentColor')?.value }}</code>
                </div>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>Surface & Text</h4>
            <div class="color-grid">
              <div class="color-input">
                <label>Background</label>
                <div class="picker-wrapper">
                  <input type="color" formControlName="backgroundColor">
                  <code>{{ form.get('backgroundColor')?.value }}</code>
                </div>
              </div>
              <div class="color-input">
                <label>Default Text</label>
                <div class="picker-wrapper">
                  <input type="color" formControlName="textColor">
                  <code>{{ form.get('textColor')?.value }}</code>
                </div>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>Display Mode</h4>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Theme Mode</mat-label>
              <mat-select formControlName="themeMode">
                <mat-option value="LIGHT">Light Mode</mat-option>
                <mat-option value="DARK">Dark Mode</mat-option>
                <mat-option value="SYSTEM">System Default</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="form-actions">
            <button mat-flat-button color="primary" [disabled]="form.invalid || !form.dirty" (click)="save()">
              Save Branding Changes
            </button>
          </div>
        </form>
      </mat-card>

      <!-- Live Preview -->
      <div class="preview-column">
        <mat-card class="preview-card">
          <h3>Live Preview</h3>
          <p class="text-sm text-slate-500">How your dashboard looks right now.</p>
          
          <div class="mock-ui">
             <div class="mock-header" [style.background]="form.get('primaryColor')?.value">
                <div class="mock-logo">Logo</div>
                <div class="mock-nav"></div>
             </div>
             <div class="mock-body" [style.background]="form.get('backgroundColor')?.value">
                <div class="mock-sidebar"></div>
                <div class="mock-content">
                   <div class="mock-card" [style.color]="form.get('textColor')?.value">
                      <div class="mock-line w-half" [style.background]="form.get('accentColor')?.value"></div>
                      <div class="mock-line w-full"></div>
                      <div class="mock-line w-three-fourth"></div>
                      <button class="mock-btn" [style.background]="form.get('primaryColor')?.value">Action</button>
                   </div>
                </div>
             </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .branding-grid { display: grid; grid-template-columns: 1fr 22rem; gap: 1.5rem; margin-top: 1.5rem; }
    
    .settings-card { padding: 2rem; border-radius: 1rem; }
    .settings-card header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    .settings-card h3 { margin: 0; font-size: 1.25rem; font-weight: 700; }

    .form-section { margin-bottom: 2.5rem; }
    .form-section h4 { font-size: 0.9rem; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 1.5rem; }

    .color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr)); gap: 1.5rem; }
    .color-input { display: flex; flex-direction: column; gap: 0.5rem; }
    .color-input label { font-size: 0.85rem; font-weight: 600; color: #475569; }
    
    .picker-wrapper { display: flex; align-items: center; gap: 1rem; padding: 0.5rem; background: #f8fafc; border-radius: 0.5rem; border: 1px solid #e2e8f0; }
    input[type="color"] { border: none; width: 2.5rem; height: 2.5rem; padding: 0; background: transparent; cursor: pointer; }
    code { font-size: 0.9rem; font-family: monospace; color: #2563eb; font-weight: 600; }

    .w-full { width: 100%; }
    .form-actions { padding-top: 1rem; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; }

    /* Preview Styles */
    .preview-card { padding: 1.5rem; border-radius: 1rem; position: sticky; top: 1.5rem; }
    .mock-ui { margin-top: 1.5rem; border-radius: 0.5rem; overflow: hidden; border: 1px solid #e2e8f0; height: 20rem; display: flex; flex-direction: column; }
    .mock-header { height: 2.5rem; padding: 0 0.75rem; display: flex; align-items: center; gap: 1rem; }
    .mock-logo { font-size: 0.7rem; color: #fff; font-weight: 800; }
    .mock-nav { flex: 1; height: 0.5rem; background: rgba(255,255,255,0.2); border-radius: 1rem; }
    .mock-body { flex: 1; display: flex; }
    .mock-sidebar { width: 3rem; background: rgba(0,0,0,0.03); border-right: 1px solid rgba(0,0,0,0.05); }
    .mock-content { flex: 1; padding: 1rem; }
    .mock-card { background: #fff; border-radius: 0.4rem; padding: 0.75rem; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .mock-line { height: 0.4rem; background: #e2e8f0; margin-bottom: 0.5rem; border-radius: 1rem; }
    .w-half { width: 50%; }
    .w-full { width: 100%; }
    .w-three-fourth { width: 75%; }
    .mock-btn { margin-top: 0.5rem; border: none; width: 100%; height: 1.5rem; border-radius: 0.3rem; color: #fff; font-size: 0.6rem; font-weight: 700; cursor: default; }

    @media (max-width: 1100px) {
      .branding-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class BrandingPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly themeService = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  protected readonly form = this.fb.group({
    primaryColor: ['#2563eb', [Validators.required]],
    secondaryColor: ['#64748b', [Validators.required]],
    accentColor: ['#14b8a6', [Validators.required]],
    backgroundColor: ['#f8fafc', [Validators.required]],
    textColor: ['#0f172a', [Validators.required]],
    themeMode: ['LIGHT', [Validators.required]],
    logoUrl: ['']
  });

  constructor() {
    // Fill form with current theme
    effect(() => {
      const theme = this.themeService.currentTheme();
      if (theme) {
        this.form.patchValue(theme, { emitEvent: false });
      }
    });
  }

  protected save(): void {
    const companyId = this.auth.user()?.companyId;
    if (!companyId) return;

    this.themeService.updateTheme(companyId, this.form.getRawValue() as CompanyTheme).subscribe({
      next: () => {
        this.snack.open('Company branding updated successfully!', 'OK', { duration: 3000 });
        this.form.markAsPristine();
      },
      error: () => this.snack.open('Failed to update branding.', 'OK', { duration: 3000 })
    });
  }

  protected reset(): void {
    const companyId = this.auth.user()?.companyId;
    if (!companyId) return;

    if (confirm('Are you sure you want to reset to system defaults?')) {
      this.themeService.resetTheme(companyId).subscribe(() => {
        this.snack.open('Theme reset to defaults.', 'OK', { duration: 3000 });
      });
    }
  }
}
