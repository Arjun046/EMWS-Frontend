import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Employee } from '../../core/services/employee-data.service';
import { RoleService, Role } from '../../core/services/role.service';
import { OrganizationService, Department } from '../../core/services/organization.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatButtonModule,
    MatDividerModule, MatIconModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="m-shell">
      <header class="m-header">
        <div class="m-title-stack">
          <h3>{{ data ? 'Modify Professional Identity' : 'Provision Identity Node' }}</h3>
          <p>Ensuring absolute field integrity across administrative nodes.</p>
        </div>
        <mat-icon style="cursor:pointer; color:var(--txt-muted); font-size:20px;" (click)="onCancel()">close</mat-icon>
      </header>

      <mat-dialog-content class="m-body custom-scrollbar">
        <form [formGroup]="form">
          
          <div class="f-section-title">Primary Identity Metadata</div>
          <div class="f-grid">
            <div class="f-group">
               <label class="f-lab">FIRST NAME</label>
               <input class="f-input" formControlName="firstName" placeholder="e.g. John">
            </div>
            <div class="f-group">
               <label class="f-lab">LAST NAME</label>
               <input class="f-input" formControlName="lastName" placeholder="e.g. Doe">
            </div>
          </div>
          
          <div class="f-grid">
            <div class="f-group">
               <label class="f-lab">CORPORATE IDENTITY EMAIL</label>
               <input class="f-input" formControlName="email" type="email" placeholder="email@company.com">
            </div>
            <div class="f-group">
               <label class="f-lab">IDENTITY ID (EMPLOYEE NUMBER)</label>
               <input class="f-input text-mono" formControlName="employeeNumber" placeholder="EMP-000">
            </div>
          </div>

          <div class="f-section-title">Operational Scope Mapping</div>
          <div class="f-grid">
            <div class="f-group">
               <label class="f-lab">JOB DESIGNATION (TITLE)</label>
               <input class="f-input" formControlName="jobTitle" placeholder="e.g. Architect">
            </div>
            <div class="f-group">
               <label class="f-lab">DEPARTMENT CORE NODE</label>
               <select class="f-input" formControlName="department" (change)="onDeptChange($event)">
                 @for (dept of departments(); track dept.id) {
                    <option [value]="dept.name">{{ dept.name }}</option>
                 }
               </select>
            </div>
          </div>

          <div class="f-grid">
            <div class="f-group">
               <label class="f-lab">SECURITY ROLE MAPPING</label>
               <select class="f-input" formControlName="role">
                 @for (r of roles(); track r.id) {
                    <option [value]="r.name">{{ r.name }}</option>
                 }
               </select>
            </div>
            <div class="f-group">
               <label class="f-lab">HIRE DATE EPOCH</label>
               <input class="f-input" type="date" formControlName="hireDate">
            </div>
          </div>

          <div class="f-grid">
            <div class="f-group">
               <label class="f-lab">FISCAL BASE (MONTHLY)</label>
               <input class="f-input text-mono" type="number" formControlName="salary" placeholder="0.00">
            </div>
            <div class="f-group">
               <label class="f-lab">REPORTING MANAGER ID</label>
               <input class="f-input" type="number" formControlName="managerId" placeholder="ID">
            </div>
          </div>

          <div class="f-section-title">Lifecycle Architecture</div>
          <div class="f-grid">
            <div class="f-group">
               <label class="f-lab">OPERATIONAL STATUS</label>
               <select class="f-input" formControlName="status">
                 <option value="ACTIVE">LIVE_ACTIVE</option>
                 <option value="ONBOARDING">PROVISIONING</option>
                 <option value="INACTIVE">DORMANT</option>
                 <option value="TERMINATED">TERMINATED</option>
               </select>
            </div>
            <div class="f-group">
               <label class="f-lab">EMPLOYMENT TYPE</label>
               <select class="f-input" formControlName="employmentType">
                 <option value="FULL_TIME">FULL_TIME_CORE</option>
                 <option value="PART_TIME">PART_TIME</option>
                 <option value="CONTRACTOR">CONTRACT_EXTERNAL</option>
                 <option value="INTERN">APPRENTICESHIP</option>
               </select>
            </div>
          </div>

          <div class="f-section-title">Physical Node & Logistics</div>
          <div class="f-group full">
             <label class="f-lab">RESIDENTIAL PHYSICAL ADDRESS</label>
             <input class="f-input" formControlName="addressLine1" placeholder="Search address node...">
          </div>
          <div class="f-grid">
             <div class="f-group"><label class="f-lab">CITY NODE</label><input class="f-input" formControlName="city"></div>
             <div class="f-group"><label class="f-lab">POSTAL INDEX (ZIP)</label><input class="f-input" formControlName="zipCode"></div>
          </div>

          <div class="f-section-title">Communication Channels</div>
          <div class="f-grid">
            <div class="f-group"><label class="f-lab">PERSONAL CONTACT EMAIL</label><input class="f-input" formControlName="personalEmail" type="email"></div>
            <div class="f-group"><label class="f-lab">PRIMARY PHONE NODE</label><input class="f-input" formControlName="phoneNumber"></div>
          </div>

        </form>
      </mat-dialog-content>

      <footer class="m-footer">
        <button class="ui-btn ui-btn-secondary" style="background:#fff; color:#000; border:none;" (click)="onCancel()">Abort Sync</button>
        <button class="ui-btn ui-btn-primary" [style.background]="form.valid ? 'var(--primary)' : '#4a5568'" [disabled]="form.invalid" (click)="onSave()">
          {{ data ? 'Commit Identity Packet' : 'Initialize Identity' }}
        </button>
      </footer>
    </div>
  `,
  styles: [`
    .m-shell { display: flex; flex-direction: column; background: #0f172a; border-radius: 0; width: 800px; max-width: 100%; border: 1px solid #1e293b; color: #fff; }
    .m-header { padding: 2rem 2.5rem; background: #1e293b; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: flex-start; }
    .m-title-stack h3 { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.25rem; color: #fff; }
    .m-title-stack p { font-size: 0.8rem; color: #94a3b8; font-weight: 600; margin: 0; }
    
    .m-body { padding: 2.5rem; max-height: 70vh; background: #0f172a; }
    .m-footer { padding: 1.25rem 2.5rem; border-top: 1px solid #1e293b; display: flex; justify-content: flex-end; gap: 1rem; background: #1e293b; }

    .f-section-title { font-size: 0.85rem; font-weight: 900; color: #94a3b8; text-transform: none; letter-spacing: 0.05em; margin: 2rem 0 1.25rem; }
    .f-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .f-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
    .f-lab { font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; }
    .f-input { height: 48px; border-radius: 10px; border: none; padding: 0 1.25rem; font-family: inherit; font-size: 0.95rem; background: #05070a; color: #fff; width: 100%; outline: none; transition: all 0.2s; }
    .f-input:focus { background: #0a0e14; box-shadow: 0 0 0 2px var(--primary); }
    .f-input:disabled { opacity: 0.6; cursor: not-allowed; }

    .text-mono { font-family: 'JetBrains Mono', monospace; }
    .ui-btn { padding: 0.75rem 1.5rem; border-radius: 8px; font-size: 0.85rem; font-weight: 800; cursor: pointer; border: none; transition: 0.2s; }
    .ui-btn-primary { color: #fff; box-shadow: 0 4px 12px rgba(47, 111, 235, 0.2); }
    .ui-btn-secondary { background: var(--surface-2); color: var(--txt-secondary); }
  `]
})
export class EmployeeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly roleService = inject(RoleService);
  private readonly orgService = inject(OrganizationService);
  
  form!: FormGroup;
  roles = toSignal(this.roleService.getRoles(), { initialValue: [] });
  departments = toSignal(this.orgService.getMyDepartments(), { initialValue: [] });

  constructor(
    public dialogRef: MatDialogRef<EmployeeFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Employee | null
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      firstName: [this.data?.firstName || '', Validators.required],
      lastName: [this.data?.lastName || '', Validators.required],
      email: [this.data?.email || '', [Validators.required, Validators.email]],
      personalEmail: [this.data?.personalEmail || '', Validators.email],
      phoneNumber: [this.data?.phoneNumber || ''],
      jobTitle: [this.data?.jobTitle || '', Validators.required],
      department: [this.data?.department || 'Operations', Validators.required],
      role: [this.data?.role || 'ROLE_EMPLOYEE', Validators.required],
      departmentId: [this.data?.departmentId || null],
      locationId: [this.data?.locationId || 1],
      managerId: [this.data?.managerId || null],
      companyId: [this.data?.companyId || 1],
      status: [this.data?.status || 'ACTIVE', Validators.required],
      employmentType: [this.data?.employmentType || 'FULL_TIME', Validators.required],
      workLocationType: [this.data?.workLocationType || 'ONSITE', Validators.required],
      hireDate: [this.data?.hireDate ? this.formatDateForInput(this.data.hireDate) : this.formatDateForInput(new Date()), Validators.required],
      employeeNumber: [this.data?.employeeNumber || ''],
      addressLine1: [this.data?.addressLine1 || ''],
      city: [this.data?.city || ''],
      state: [this.data?.state || ''],
      zipCode: [this.data?.zipCode || ''],
      salary: [this.data?.salary || 0, [Validators.required, Validators.min(0)]]
    });

    if (this.data) {
        this.form.get('email')?.disable();
    }
  }

  onDeptChange(event: any) {
    const name = event.target.value;
    const dept = this.departments().find(d => d.name === name);
    if (dept) this.form.patchValue({ departmentId: dept.id });
  }

  private formatDateForInput(date: string | Date): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.getRawValue());
    }
  }
}
