import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { OrganizationService, Department } from '../../core/services/organization.service';
import { EmployeeDataService } from '../../core/services/employee-data.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-organization-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="module-page active-page fade-up" id="page-organization">
      
      <div class="filter-action-row">
        <div>
           <h2 style="margin:0; font-size:1.5rem; font-weight:800; letter-spacing:-0.02em;">Structural Sector Topology</h2>
           <p style="margin:0.25rem 0 0; font-size:0.85rem; color:var(--txt-muted);">Hierarchical mapping of operational sectors and command nodes.</p>
        </div>
        <button class="ui-btn ui-btn-primary" (click)="provisionSector()">
          <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">add_circle</mat-icon>
          Provision Node
        </button>
      </div>

      <div class="dept-grid mt-6">
        @for (dept of departments(); track dept.id) {
          <div class="ui-card dept-card">
             <div class="dept-h">
                <div class="dept-icon"><mat-icon>{{ getDeptIcon(dept.name) }}</mat-icon></div>
                <span class="ui-badge ui-badge-success">Sync_ACTIVE</span>
             </div>
             <div class="dept-main">
                <div class="dept-title">{{ dept.name }}</div>
                <p class="dept-desc">Synchronized infrastructure node managing professional identity mappings for sector NY-01.</p>
             </div>
             <div class="dept-footer">
                <div class="meta-item">
                   <span class="meta-lab">Identity Nodes</span>
                   <span class="meta-val">{{ getEmployeeCount(dept.name) }} Active</span>
                </div>
                <div class="meta-item" style="text-align:right">
                   <span class="meta-lab">Reliability</span>
                   <span class="meta-val" style="color:var(--success)">NOMINAL</span>
                </div>
             </div>
          </div>
        }
        @if (departments().length === 0) {
           <div class="ui-card" style="grid-column: 1 / -1; padding: 4rem; text-align:center;">
              <mat-icon style="font-size:3rem; width:3rem; height:3rem; color:var(--border-2); margin-bottom:1rem;">hub</mat-icon>
              <p style="color:var(--txt-muted); font-weight:600;">Establishing link to topology registry...</p>
           </div>
        }
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .mt-6 { margin-top: 1.5rem; }
    .dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
    .dept-card { padding: 2rem; display: flex; flex-direction: column; gap: 1.25rem; transition: 0.2s var(--ease); cursor: pointer; border: 1px solid var(--border); }
    .dept-card:hover { transform: translateY(-3px); border-color: var(--primary); box-shadow: var(--shadow-md); }
    .dept-h { display: flex; justify-content: space-between; align-items: flex-start; }
    .dept-icon { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: var(--surface-2); color: var(--primary); }
    .dept-title { font-size: 1.15rem; font-weight: 800; letter-spacing: -0.01em; }
    .dept-desc { font-size: 0.8rem; color: var(--txt-muted); line-height: 1.5; margin-top: 0.35rem; }
    .dept-footer { display: flex; justify-content: space-between; border-top: 1px solid var(--border); padding-top: 1.25rem; margin-top: auto; }
    .meta-item { display: flex; flex-direction: column; gap: 0.15rem; }
    .meta-lab { font-size: 0.6rem; font-weight: 800; color: var(--txt-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .meta-val { font-size: 0.85rem; font-weight: 700; }
  `]
})
export class OrganizationPageComponent implements OnInit {
  private readonly orgApi = inject(OrganizationService);
  private readonly empApi = inject(EmployeeDataService);

  protected readonly departments = signal<Department[]>([]);
  protected readonly employees = toSignal(this.empApi.getEmployees(), { initialValue: [] });

  ngOnInit() {
    this.orgApi.getMyDepartments().subscribe((data: Department[]) => this.departments.set(data));
  }

  protected getEmployeeCount(deptName: string): number {
    return this.employees().filter(e => e.department === deptName).length;
  }

  protected getDeptIcon(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('engineer')) return 'terminal';
    if (n.includes('logistics') || n.includes('ops')) return 'settings_input_component';
    if (n.includes('fiscal') || n.includes('finance')) return 'account_balance_wallet';
    return 'token';
  }

  provisionSector() {
    alert('Sector Node Provision initialized. Trace: EPOCH_TX_94A1.');
  }
}
