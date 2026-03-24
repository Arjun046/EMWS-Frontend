import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { OrganizationService, Company, Location, Department } from '../../core/services/organization.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-organization-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatDialogModule,
    MatSnackBarModule,
    PageHeaderComponent
  ],
  template: `
    <app-page-header 
      title="Enterprise Structure" 
      subtitle="Manage your corporate hierarchy, multi-location assets, and departmental units." 
      actionLabel="Add Unit"
      (action)="onAddUnit()"
    />

    <mat-tab-group class="mt-4" (selectedTabChange)="onTabChange($event.index)">
      <mat-tab label="Companies">
        <div class="tab-content mt-4">
          <mat-card class="data-card">
            <table mat-table [dataSource]="companies()" class="w-full">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Company Name</th>
                <td mat-cell *matCellDef="let row"><strong>{{row.name}}</strong></td>
              </ng-container>
              <ng-container matColumnDef="industry">
                <th mat-header-cell *matHeaderCellDef>Industry</th>
                <td mat-cell *matCellDef="let row">{{row.industry}}</td>
              </ng-container>
              <ng-container matColumnDef="timezone">
                <th mat-header-cell *matHeaderCellDef>Timezone</th>
                <td mat-cell *matCellDef="let row">{{row.timezone}}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let row" class="text-right">
                  <button mat-icon-button (click)="openCompanyDialog(row)"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button color="warn" (click)="deleteCompany(row)"><mat-icon>delete</mat-icon></button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['name', 'industry', 'timezone', 'actions']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['name', 'industry', 'timezone', 'actions'];"></tr>
            </table>
          </mat-card>
        </div>
      </mat-tab>

      <mat-tab label="Locations">
        <div class="tab-content mt-4">
          <mat-card class="data-card">
            <table mat-table [dataSource]="locations()" class="w-full">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Site Name</th>
                <td mat-cell *matCellDef="let row"><strong>{{row.name}}</strong></td>
              </ng-container>
              <ng-container matColumnDef="address">
                <th mat-header-cell *matHeaderCellDef>Physical Address</th>
                <td mat-cell *matCellDef="let row">{{row.address}}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let row" class="text-right">
                  <button mat-icon-button (click)="openLocationDialog(row)"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button color="warn" (click)="deleteLocation(row)"><mat-icon>delete</mat-icon></button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['name', 'address', 'actions']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['name', 'address', 'actions'];"></tr>
            </table>
          </mat-card>
        </div>
      </mat-tab>

      <mat-tab label="Departments">
        <div class="tab-content mt-4">
          <mat-card class="data-card">
            <table mat-table [dataSource]="departments()" class="w-full">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Department Name</th>
                <td mat-cell *matCellDef="let row"><strong>{{row.name}}</strong></td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let row" class="text-right">
                  <button mat-icon-button (click)="openDepartmentDialog(row)"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button color="warn" (click)="deleteDepartment(row)"><mat-icon>delete</mat-icon></button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['name', 'actions']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['name', 'actions'];"></tr>
            </table>
          </mat-card>
        </div>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: [`
    .mt-4 { margin-top: 1rem; }
    .w-full { width: 100%; }
    .text-right { text-align: right; }
    .data-card { border-radius: 1.2rem; border: 1px solid #e2e8f0; overflow-x: auto; padding: 0; }
    .w-full { width: 100%; min-width: 600px; }
    th { background: #f8fafc; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; font-weight: 700; color: #64748b; }
    td { border-bottom: 1px solid #f1f5f9; padding: 1rem !important; }
  `]
})
export class OrganizationPageComponent {
  private readonly orgApi = inject(OrganizationService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly companies = toSignal(this.orgApi.getCompanies(), { initialValue: [] });
  protected readonly locations = toSignal(this.orgApi.getLocations(), { initialValue: [] });
  protected readonly departments = toSignal(this.orgApi.getDepartments(), { initialValue: [] });

  private currentTabIndex = 0;

  protected onTabChange(index: number): void {
    this.currentTabIndex = index;
  }

  protected onAddUnit(): void {
    if (this.currentTabIndex === 0) this.openCompanyDialog();
    else if (this.currentTabIndex === 1) this.openLocationDialog();
    else if (this.currentTabIndex === 2) this.openDepartmentDialog();
  }

  protected openCompanyDialog(company?: Company): void {
    const dialogRef = this.dialog.open(CompanyEditDialog, { width: '450px', data: { company } });
    dialogRef.afterClosed().subscribe(res => res && window.location.reload());
  }

  protected openLocationDialog(location?: Location): void {
    const dialogRef = this.dialog.open(LocationEditDialog, { 
      width: '450px', 
      data: { location, companies: this.companies() } 
    });
    dialogRef.afterClosed().subscribe(res => res && window.location.reload());
  }

  protected openDepartmentDialog(dept?: Department): void {
    const dialogRef = this.dialog.open(DepartmentEditDialog, { 
      width: '450px', 
      data: { dept, companies: this.companies(), locations: this.locations() } 
    });
    dialogRef.afterClosed().subscribe(res => res && window.location.reload());
  }

  protected deleteCompany(c: Company): void {
    if (confirm(`Delete company ${c.name}?`)) {
      this.orgApi.deleteCompany(c.id).subscribe(() => window.location.reload());
    }
  }

  protected deleteLocation(l: Location): void {
    if (confirm(`Delete location ${l.name}?`)) {
      this.orgApi.deleteLocation(l.id).subscribe(() => window.location.reload());
    }
  }

  protected deleteDepartment(d: Department): void {
    if (confirm(`Delete department ${d.name}?`)) {
      this.orgApi.deleteDepartment(d.id).subscribe(() => window.location.reload());
    }
  }
}

// Dialogs
@Component({
  selector: 'app-company-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{data.company ? 'Edit Company' : 'New Company'}}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-4 mt-2">
        <mat-form-field appearance="outline">
          <mat-label>Company Name</mat-label>
          <input matInput formControlName="name">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Industry</mat-label>
          <input matInput formControlName="industry">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Timezone</mat-label>
          <input matInput formControlName="timezone">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`.flex { display: flex; } .flex-col { flex-direction: column; } .gap-4 { gap: 1rem; }`]
})
export class CompanyEditDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly dialogRef = inject(MatDialogRef<CompanyEditDialog>);
  private readonly orgApi = inject(OrganizationService);
  protected readonly data = inject<{ company?: Company }>(MAT_DIALOG_DATA);

  protected readonly form = this.fb.group({
    name: [this.data.company?.name || '', Validators.required],
    industry: [this.data.company?.industry || ''],
    timezone: [this.data.company?.timezone || 'UTC']
  });

  save() {
    const raw = this.form.getRawValue();
    const obs = this.data.company ? this.orgApi.updateCompany(this.data.company.id, raw as any) : this.orgApi.createCompany(raw as any);
    obs.subscribe(() => this.dialogRef.close(true));
  }
}

@Component({
  selector: 'app-location-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{data.location ? 'Edit Location' : 'New Location'}}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-4 mt-2">
        <mat-form-field appearance="outline">
          <mat-label>Location Name</mat-label>
          <input matInput formControlName="name">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Address</mat-label>
          <input matInput formControlName="address">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Company</mat-label>
          <mat-select formControlName="companyId">
            @for (c of data.companies; track c.id) {
              <mat-option [value]="c.id">{{c.name}}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`.flex { display: flex; } .flex-col { flex-direction: column; } .gap-4 { gap: 1rem; }`]
})
export class LocationEditDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly dialogRef = inject(MatDialogRef<LocationEditDialog>);
  private readonly orgApi = inject(OrganizationService);
  protected readonly data = inject<{ location?: Location, companies: Company[] }>(MAT_DIALOG_DATA);

  protected readonly form = this.fb.group({
    name: [this.data.location?.name || '', Validators.required],
    address: [this.data.location?.address || ''],
    companyId: [this.data.location?.companyId || null, Validators.required]
  });

  save() {
    const raw = this.form.getRawValue();
    const obs = this.data.location ? this.orgApi.updateLocation(this.data.location.id, raw as any) : this.orgApi.createLocation(raw as any);
    obs.subscribe(() => this.dialogRef.close(true));
  }
}

@Component({
  selector: 'app-department-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{data.dept ? 'Edit Department' : 'New Department'}}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-4 mt-2">
        <mat-form-field appearance="outline">
          <mat-label>Department Name</mat-label>
          <input matInput formControlName="name">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Company</mat-label>
          <mat-select formControlName="companyId">
            @for (c of data.companies; track c.id) {
              <mat-option [value]="c.id">{{c.name}}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Location</mat-label>
          <mat-select formControlName="locationId">
            @for (l of data.locations; track l.id) {
              <mat-option [value]="l.id">{{l.name}}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`.flex { display: flex; } .flex-col { flex-direction: column; } .gap-4 { gap: 1rem; }`]
})
export class DepartmentEditDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly dialogRef = inject(MatDialogRef<DepartmentEditDialog>);
  private readonly orgApi = inject(OrganizationService);
  protected readonly data = inject<{ dept?: Department, companies: Company[], locations: Location[] }>(MAT_DIALOG_DATA);

  protected readonly form = this.fb.group({
    name: [this.data.dept?.name || '', Validators.required],
    companyId: [this.data.dept?.companyId || null, Validators.required],
    locationId: [this.data.dept?.locationId || null, Validators.required]
  });

  save() {
    const raw = this.form.getRawValue();
    const obs = this.data.dept ? this.orgApi.updateDepartment(this.data.dept.id, raw as any) : this.orgApi.createDepartment(raw as any);
    obs.subscribe(() => this.dialogRef.close(true));
  }
}
