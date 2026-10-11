import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrganizationService, Department, Company, CompanySettings, Location } from '../../core/services/organization.service';
import { EmployeeDataService } from '../../core/services/employee-data.service';
import { HasScopeDirective } from '../../shared/directives/has-scope.directive';
import { toSignal } from '@angular/core/rxjs-interop';
import { backendErrorMessage } from '../../shared/utils/password-policy';

@Component({
  selector: 'app-organization-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSnackBarModule, MatProgressSpinnerModule, HasScopeDirective],
  template: `
    <div class="module-page active-page fade-up" id="page-organization">

      <div class="filter-action-row">
        <div>
           <h2 style="margin:0; font-size:1.5rem; font-weight:800;">Organization</h2>
           <p style="margin:0.25rem 0 0; font-size:0.85rem; color:var(--txt-muted);">
             {{ company()?.name || 'Company' }} · company, locations and departments.
           </p>
        </div>
      </div>

      <div class="org-grid mt-6">
        <div class="ui-card">
          <div class="ui-card-header"><h3>Company</h3></div>
          @if (orgLoading()) {
            <div class="dept-desc">Loading company…</div>
          } @else if (company(); as c) {
            <div class="kv"><label>Name</label><strong>{{ c.name }}</strong></div>
            <div class="kv"><label>Industry</label><span>{{ c.industry || '—' }}</span></div>
            <div class="kv"><label>Timezone</label><span>{{ c.timezone || '—' }}</span></div>
          } @else {
            <div class="dept-desc">Could not load company details.</div>
          }
          @if (settings(); as s) {
            <div class="form-section">Workweek settings</div>
            <div class="f-grid">
              <div class="f-group"><label>Currency</label><input class="f-input" [(ngModel)]="settingsForm.currencyCode"></div>
              <div class="f-group"><label>Week starts</label><input class="f-input" [(ngModel)]="settingsForm.weekStartDay"></div>
            </div>
            <div class="f-grid">
              <div class="f-group"><label>Standard day (hrs)</label><input class="f-input" type="number" [(ngModel)]="settingsForm.standardWorkDayHours"></div>
              <div class="f-group"><label>Weekly OT threshold</label><input class="f-input" type="number" [(ngModel)]="settingsForm.overtimeThresholdWeekly"></div>
            </div>
            <button class="ui-btn ui-btn-primary" (click)="saveSettings()" *appHasScope="'ORG_DEPT_WRITE'">Save settings</button>
          }
        </div>

        <div class="ui-card">
          <div class="ui-card-header"><h3>Locations ({{ locations().length }})</h3></div>
          @for (l of locations(); track l.id) {
            <div class="rowline"><div><strong>{{ l.name }}</strong><br><small>{{ l.address || '' }}</small></div>
              <button class="ui-btn" style="color:var(--danger);" (click)="removeLocation(l.id)" *appHasScope="'ORG_LOCATION_WRITE'">Delete</button>
            </div>
          }
          @if (locations().length === 0 && !orgLoading()) {
            <div class="dept-desc" style="padding: 1rem 0;">No locations yet. Add your first location below.</div>
          }
          <div class="form-section">Add location</div>
          <div class="f-group"><label>Name</label><input class="f-input" [(ngModel)]="newLocName" placeholder="HQ"></div>
          <div class="f-group"><label>Address</label><input class="f-input" [(ngModel)]="newLocAddr" placeholder="Street, City"></div>
          <button class="ui-btn ui-btn-primary" (click)="addLocation()" [disabled]="!newLocName.trim()" *appHasScope="'ORG_LOCATION_WRITE'">Add location</button>
        </div>
      </div>

      <div class="dept-grid mt-6">
        @if (orgLoading()) {
          <div class="ui-card dept-card"><div class="dept-desc">Loading departments…</div></div>
        }
        @for (dept of departments(); track dept.id) {
          <div class="ui-card dept-card">
             <div class="dept-h">
                <div class="dept-icon"><mat-icon>{{ getDeptIcon(dept.name) }}</mat-icon></div>
                <button class="ui-btn" style="color:var(--danger);" (click)="removeDepartment(dept.id)" *appHasScope="'ORG_DEPT_WRITE'">Delete</button>
             </div>
             <div class="dept-main">
                <div class="dept-title">{{ dept.name }}</div>
                <p class="dept-desc">{{ getEmployeeCount(dept) }} members.</p>
             </div>
          </div>
        }
        @if (departments().length === 0 && !orgLoading()) {
          <div class="ui-card dept-card"><div class="dept-desc">No departments yet. Create your first department below.</div></div>
        }
      </div>
      <div class="ui-card mt-6">
        <div class="ui-card-header"><h3>New department</h3></div>
        <div class="f-grid">
          <div class="f-group"><label>Name</label><input class="f-input" [(ngModel)]="newDeptName" placeholder="Engineering"></div>
          <div class="f-group"><label>Location</label>
            <select class="f-input" [(ngModel)]="newDeptLoc">
              <option [ngValue]="null">None</option>
              @for (l of locations(); track l.id) { <option [ngValue]="l.id">{{ l.name }}</option> }
            </select>
          </div>
        </div>
        <button class="ui-btn ui-btn-primary" (click)="addDepartment()" [disabled]="!newDeptName.trim()" *appHasScope="'ORG_DEPT_WRITE'">Create department</button>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .mt-6 { margin-top: 1.5rem; }
    .org-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    @media (max-width: 900px) { .org-grid { grid-template-columns: 1fr; } }
    .kv { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
    .kv label { color: var(--txt-muted); font-weight: 700; text-transform: uppercase; font-size: 0.7rem; }
    .rowline { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
    .form-section { font-size: 0.7rem; font-weight: 800; color: var(--primary); text-transform: uppercase; margin: 1.25rem 0 0.75rem; }
    .f-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .f-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.75rem; }
    .f-group label { font-size: 0.72rem; font-weight: 700; color: var(--txt-secondary); text-transform: uppercase; }
    .dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; }
    .dept-card { padding: 1.5rem; }
    .dept-h { display: flex; justify-content: space-between; align-items: flex-start; }
    .dept-icon { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: var(--surface-2); color: var(--primary); }
    .dept-title { font-size: 1.1rem; font-weight: 800; margin-top: 0.75rem; }
    .dept-desc { font-size: 0.8rem; color: var(--txt-muted); }
  `]
})
export class OrganizationPageComponent implements OnInit {
  private readonly orgApi = inject(OrganizationService);
  private readonly empApi = inject(EmployeeDataService);
  private readonly snack = inject(MatSnackBar);

  protected readonly departments = signal<Department[]>([]);
  protected readonly locations = signal<Location[]>([]);
  protected readonly company = signal<Company | null>(null);
  protected readonly settings = signal<CompanySettings | null>(null);
  protected readonly orgLoading = signal(true);
  protected readonly orgError = signal(false);
  protected readonly employees = toSignal(this.empApi.getEmployees(), { initialValue: [] });

  protected settingsForm: Partial<CompanySettings> = {};
  protected newLocName = '';
  protected newLocAddr = '';
  protected newDeptName = '';
  protected newDeptLoc: number | null = null;

  ngOnInit() {
    let pending = 4;
    const done = () => {
      if (--pending === 0) this.orgLoading.set(false);
    };
    const fail = (what: string) => (err: unknown) => {
      done();
      this.orgError.set(true);
      this.snack.open(backendErrorMessage(err, `Could not load ${what}.`), 'Dismiss', { duration: 5000 });
    };
    this.orgApi.getMyDepartments().subscribe({ next: (d) => { this.departments.set(d); done(); }, error: fail('departments') });
    this.orgApi.getMyLocations().subscribe({ next: (l) => { this.locations.set(l); done(); }, error: fail('locations') });
    this.orgApi.getMyCompany().subscribe({ next: (c) => { this.company.set(c); done(); }, error: fail('company') });
    this.orgApi.getMySettings().subscribe({
      next: (s) => {
        this.settings.set(s);
        this.settingsForm = { ...s };
        done();
      },
      error: fail('settings')
    });
  }

  protected getEmployeeCount(dept: Department): number {
    const list = this.employees();
    const byId = list.filter((e) => e.departmentId != null && e.departmentId === dept.id).length;
    if (byId > 0 || list.some((e) => e.departmentId != null)) return byId;
    return list.filter((e) => e.department === dept.name).length;
  }

  protected getDeptIcon(name: string): string {
    const n = (name || '').toLowerCase();
    if (n.includes('engineer')) return 'terminal';
    if (n.includes('logistics') || n.includes('ops')) return 'settings_input_component';
    if (n.includes('fiscal') || n.includes('finance')) return 'account_balance_wallet';
    return 'token';
  }

  saveSettings(): void {
    this.orgApi.updateMySettings(this.settingsForm).subscribe({
      next: (s) => {
        this.settings.set(s);
        this.snack.open('Settings saved.', 'OK', { duration: 3000 });
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Save failed.'), 'Dismiss', { duration: 6000 })
    });
  }

  addLocation(): void {
    this.orgApi.createLocation({ name: this.newLocName.trim(), address: this.newLocAddr.trim() }).subscribe({
      next: (l) => {
        this.locations.update((list) => [...list, l]);
        this.newLocName = '';
        this.newLocAddr = '';
        this.snack.open('Location added.', 'OK', { duration: 3000 });
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Add failed.'), 'Dismiss', { duration: 6000 })
    });
  }

  removeLocation(id: number): void {
    if (!confirm('Delete this location?')) return;
    this.orgApi.deleteLocation(id).subscribe({
      next: () => this.locations.update((list) => list.filter((l) => l.id !== id)),
      error: (err) => this.snack.open(backendErrorMessage(err, 'Delete failed.'), 'Dismiss', { duration: 6000 })
    });
  }

  addDepartment(): void {
    this.orgApi.createDepartment({ name: this.newDeptName.trim(), locationId: this.newDeptLoc ?? undefined }).subscribe({
      next: (d) => {
        this.departments.update((list) => [...list, d]);
        this.newDeptName = '';
        this.snack.open('Department created.', 'OK', { duration: 3000 });
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Create failed.'), 'Dismiss', { duration: 6000 })
    });
  }

  removeDepartment(id: number): void {
    if (!confirm('Delete this department?')) return;
    this.orgApi.deleteDepartment(id).subscribe({
      next: () => this.departments.update((list) => list.filter((d) => d.id !== id)),
      error: (err) => this.snack.open(backendErrorMessage(err, 'Delete failed.'), 'Dismiss', { duration: 6000 })
    });
  }
}
