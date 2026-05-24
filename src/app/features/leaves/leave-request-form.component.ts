import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LeaveRequest, LeaveType } from '../../core/services/leave.service';

@Component({
  selector: 'app-leave-request-form',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatFormFieldModule, 
    MatInputModule, MatSelectModule, MatDividerModule, MatIconModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="m-shell">
      <header class="m-header">
        <div class="m-title-stack">
          <h3>Apply for Absence Packet</h3>
          <p>Register standard availability changes with the system gateway.</p>
        </div>
        <mat-icon style="cursor:pointer; color:var(--txt-muted)" (click)="onCancel()">close</mat-icon>
      </header>

      <mat-dialog-content class="m-body custom-scrollbar">
        <form [formGroup]="form">
          <div class="f-group">
            <label class="f-lab">Absence Protocol Category</label>
            <select class="f-input" formControlName="leaveType">
              <option value="VACATION">VACATION_PTO</option>
              <option value="SICK">MEDICAL_SICK_LEAVE</option>
              <option value="PERSONAL">PERSONAL_LEAVE</option>
              <option value="BEREAVEMENT">BEREAVEMENT_LEAVE</option>
              <option value="MATERNITY">MATERNITY_PARENTAL</option>
            </select>
          </div>

          <div class="f-grid">
            <div class="f-group">
              <label class="f-lab">Start Epoch</label>
              <input class="f-input" type="date" formControlName="startDate">
            </div>
            <div class="f-group">
              <label class="f-lab">Completion Epoch</label>
              <input class="f-input" type="date" formControlName="endDate">
            </div>
          </div>

          <div class="f-group full">
            <label class="f-lab">Detailed Explanation (Notes)</label>
            <textarea class="f-input" formControlName="reason" placeholder="Explain the rationale for this availability change..."></textarea>
          </div>
        </form>
      </mat-dialog-content>

      <footer class="m-footer">
        <button class="btn btn-s" (click)="onCancel()">Abort Sync</button>
        <button class="btn btn-p" [disabled]="form.invalid" (click)="onSave()">
          Submit Request Packet
        </button>
      </footer>
    </div>
  `,
  styles: [`
    .m-shell { display: flex; flex-direction: column; background: #fff; }
    .m-header { padding: 1.5rem 2rem; background: var(--surface-2); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .m-title-stack h3 { font-size: 1.1rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.15rem; }
    .m-title-stack p { font-size: 0.75rem; color: var(--txt-muted); font-weight: 600; margin: 0; }
    .m-body { padding: 2.5rem; max-height: 75vh; }
    .m-footer { padding: 1.25rem 2rem; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 1rem; background: var(--surface-2); }
  `]
})
export class LeaveRequestFormComponent implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<LeaveRequestFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LeaveRequest | null
  ) {}

  ngOnInit(): void {
    const today = new Date().toISOString().split('T')[0];
    this.form = this.fb.group({
      leaveType: [this.data?.leaveType || 'VACATION', Validators.required],
      startDate: [this.data?.startDate || today, Validators.required],
      endDate: [this.data?.endDate || today, Validators.required],
      reason: [this.data?.reason || '', [Validators.required, Validators.minLength(5)]]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
