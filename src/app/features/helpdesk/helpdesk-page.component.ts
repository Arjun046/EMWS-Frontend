import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HelpdeskService, SupportTicket } from '../../core/services/helpdesk.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

@Component({
  selector: 'app-helpdesk-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatDividerModule,
    MatChipsModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    DatePipe
  ],
  template: `
    <app-page-header
      title="Help Desk"
      subtitle="Submit support requests, report issues, and track resolution progress."
      actionLabel="New Ticket"
      icon="add"
      (action)="openNewTicketDialog()"
    />

    <section class="helpdesk-shell">
      <!-- Stats -->
      <div class="stats-row">
        <mat-card class="stat-box" [class.accent]="true">
          <label>Open Tickets</label>
          <div class="value">{{ openCount() }}</div>
          <p class="delta">Awaiting attention</p>
        </mat-card>
        <mat-card class="stat-box warn">
          <label>In Progress</label>
          <div class="value">{{ inProgressCount() }}</div>
          <p class="delta">Being resolved</p>
        </mat-card>
        <mat-card class="stat-box good">
          <label>Resolved This Month</label>
          <div class="value">{{ resolvedCount() }}</div>
          <p class="delta">Successfully closed</p>
        </mat-card>
      </div>

      @if (isLoading()) {
        <mat-card class="skeleton-card mt-6">
          <div class="skeleton-row" *ngFor="let i of [1,2,3,4,5]">
            <div class="skeleton-cell wide"></div>
            <div class="skeleton-cell"></div>
            <div class="skeleton-cell narrow"></div>
          </div>
        </mat-card>
      } @else {
        <mat-tab-group class="mt-6 enterprise-tabs">
          <mat-tab label="All My Tickets">
            <div class="tab-content mt-6">
              <div class="filter-row mb-4">
                <mat-chip-set>
                  <mat-chip (click)="statusFilter.set('ALL')" [highlighted]="statusFilter() === 'ALL'">All</mat-chip>
                  <mat-chip (click)="statusFilter.set('OPEN')" [highlighted]="statusFilter() === 'OPEN'">Open</mat-chip>
                  <mat-chip (click)="statusFilter.set('IN_PROGRESS')" [highlighted]="statusFilter() === 'IN_PROGRESS'">In Progress</mat-chip>
                  <mat-chip (click)="statusFilter.set('RESOLVED')" [highlighted]="statusFilter() === 'RESOLVED'">Resolved</mat-chip>
                </mat-chip-set>
              </div>

              <div class="tickets-list">
                @for (ticket of filteredTickets(); track ticket.id) {
                  <mat-card class="ticket-card" [class.is-urgent]="ticket.priority === 'URGENT'" [class.is-high]="ticket.priority === 'HIGH'">
                    <div class="ticket-top">
                      <div class="ticket-meta">
                        <span class="ticket-id">#{{ ticket.id.toString().padStart(4, '0') }}</span>
                        <span class="priority-tag" [class]="ticket.priority.toLowerCase()">{{ ticket.priority }}</span>
                        <span class="category-tag">{{ formatCategory(ticket.category) }}</span>
                      </div>
                      <app-status-badge [value]="ticket.status" />
                    </div>

                    <h3 class="ticket-subject">{{ ticket.subject }}</h3>
                    <p class="ticket-desc">{{ ticket.description }}</p>

                    <mat-divider></mat-divider>

                    <div class="ticket-bottom">
                      <div class="ticket-info">
                        <span class="ticket-date">
                          <mat-icon>schedule</mat-icon>
                          {{ ticket.createdAt | date:'medium' }}
                        </span>
                        @if (ticket.assignedTo) {
                          <span class="ticket-assigned">
                            <mat-icon>person</mat-icon>
                            {{ ticket.assignedTo }}
                          </span>
                        }
                      </div>
                      <div class="ticket-actions">
                        @if (ticket.status === 'RESOLVED') {
                          <button mat-stroked-button (click)="reopenTicket(ticket)">Reopen</button>
                        }
                        @if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
                          <button mat-stroked-button color="primary">Reply</button>
                        }
                      </div>
                    </div>

                    @if (ticket.resolution) {
                      <div class="resolution-box">
                        <strong>Resolution:</strong>
                        <p>{{ ticket.resolution }}</p>
                      </div>
                    }
                  </mat-card>
                } @empty {
                  <mat-card class="empty-card">
                    <mat-icon>confirmation_number</mat-icon>
                    <h4>No tickets found</h4>
                    <p>{{ statusFilter() === 'ALL' ? 'You have not submitted any support tickets yet. Click "New Ticket" to get started.' : 'No tickets match the selected filter.' }}</p>
                    @if (statusFilter() === 'ALL') {
                      <button mat-flat-button color="primary" (click)="openNewTicketDialog()">
                        <mat-icon>add</mat-icon> Create Your First Ticket
                      </button>
                    }
                  </mat-card>
                }
              </div>
            </div>
          </mat-tab>

          @if (isAdminOrManager()) {
            <mat-tab label="Team Queue">
              <div class="tab-content mt-6">
                <div class="tickets-list">
                  @for (ticket of allTickets(); track ticket.id) {
                    <mat-card class="ticket-card" [class.is-urgent]="ticket.priority === 'URGENT'" [class.is-high]="ticket.priority === 'HIGH'">
                      <div class="ticket-top">
                        <div class="ticket-meta">
                          <span class="ticket-id">#{{ ticket.id.toString().padStart(4, '0') }}</span>
                          <span class="priority-tag" [class]="ticket.priority.toLowerCase()">{{ ticket.priority }}</span>
                          <span class="category-tag">{{ formatCategory(ticket.category) }}</span>
                          <strong class="submitter">{{ ticket.employeeName || 'Staff #' + ticket.employeeId }}</strong>
                        </div>
                        <app-status-badge [value]="ticket.status" />
                      </div>
                      <h3 class="ticket-subject">{{ ticket.subject }}</h3>
                      <p class="ticket-desc">{{ ticket.description }}</p>
                      <mat-divider></mat-divider>
                      <div class="ticket-bottom">
                        <span class="ticket-date">
                          <mat-icon>schedule</mat-icon>
                          {{ ticket.createdAt | date:'medium' }}
                        </span>
                        <div class="ticket-actions">
                          @if (ticket.status === 'OPEN') {
                            <button mat-flat-button color="primary" (click)="startWork(ticket)">Take On</button>
                          }
                          @if (ticket.status === 'IN_PROGRESS') {
                            <button mat-flat-button color="primary" (click)="resolveTicket(ticket)">Resolve</button>
                          }
                        </div>
                      </div>
                    </mat-card>
                  } @empty {
                    <mat-card class="empty-card">
                      <mat-icon>support_agent</mat-icon>
                      <h4>No tickets in the queue</h4>
                      <p>All support requests have been resolved. Great job!</p>
                    </mat-card>
                  }
                </div>
              </div>
            </mat-tab>
          }
        </mat-tab-group>
      }
    </section>
  `,
  styles: [`
    .helpdesk-shell { margin-top: 1.5rem; }

    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; }
    .stat-box { padding: 1.5rem; border-radius: 1.5rem; border: 1px solid #e2e8f0; box-shadow: none !important; }
    .stat-box label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.1em; }
    .stat-box .value { font-size: 2.25rem; font-weight: 900; margin: 0.25rem 0; color: #1e293b; }
    .stat-box .delta { margin: 0; font-size: 0.8rem; font-weight: 600; color: #64748b; }
    .stat-box.accent { border-top: 4px solid #3b82f6; }
    .stat-box.warn { border-top: 4px solid #f59e0b; }
    .stat-box.good { border-top: 4px solid #10b981; }

    .mt-6 { margin-top: 1.5rem; }
    .mb-4 { margin-bottom: 1rem; }

    .filter-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }

    .tickets-list { display: grid; gap: 1rem; }

    .ticket-card { padding: 1.5rem; border-radius: 1.2rem; border: 1px solid #e2e8f0; box-shadow: none !important; transition: all 0.2s; }
    .ticket-card:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.04) !important; }
    .ticket-card.is-urgent { border-left: 4px solid #ef4444; }
    .ticket-card.is-high { border-left: 4px solid #f59e0b; }

    .ticket-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .ticket-meta { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .ticket-id { font-family: 'JetBrains Mono', monospace; font-weight: 800; font-size: 0.85rem; color: #64748b; }
    .priority-tag { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; padding: 0.15rem 0.5rem; border-radius: 4px; }
    .priority-tag.urgent { background: #fef2f2; color: #ef4444; }
    .priority-tag.high { background: #fffbeb; color: #f59e0b; }
    .priority-tag.medium { background: #eff6ff; color: #3b82f6; }
    .priority-tag.low { background: #f0fdf4; color: #10b981; }
    .category-tag { font-size: 0.65rem; font-weight: 700; background: #f8fafc; color: #475569; padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid #e2e8f0; }
    .submitter { font-size: 0.85rem; color: #1e293b; }

    .ticket-subject { margin: 0 0 0.5rem; font-size: 1.1rem; font-weight: 800; color: #0f172a; }
    .ticket-desc { margin: 0 0 1rem; font-size: 0.9rem; color: #64748b; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    .ticket-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; flex-wrap: wrap; gap: 0.5rem; }
    .ticket-info { display: flex; align-items: center; gap: 1.5rem; }
    .ticket-date, .ticket-assigned { display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: #94a3b8; font-weight: 500; }
    .ticket-date mat-icon, .ticket-assigned mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .ticket-actions { display: flex; gap: 0.5rem; }

    .resolution-box { margin-top: 1rem; padding: 1rem; background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 0.75rem; }
    .resolution-box strong { font-size: 0.75rem; text-transform: uppercase; color: #166534; letter-spacing: 0.05em; }
    .resolution-box p { margin: 0.25rem 0 0; font-size: 0.9rem; color: #15803d; }

    .empty-card { padding: 4rem 2rem; text-align: center; color: #94a3b8; border: 1px dashed #e2e8f0 !important; background: transparent !important; box-shadow: none !important; border-radius: 1.2rem; }
    .empty-card mat-icon { font-size: 4rem; width: 4rem; height: 4rem; margin-bottom: 1rem; opacity: 0.5; }
    .empty-card h4 { margin: 0 0 0.5rem; color: #64748b; font-weight: 700; }
    .empty-card p { margin: 0 0 1.5rem; max-width: 24rem; margin-inline: auto; }

    /* Skeleton */
    .skeleton-card { border-radius: 1.5rem; border: 1px solid #e2e8f0; padding: 1.5rem; }
    .skeleton-row { display: flex; gap: 1.5rem; padding: 1rem 0; border-bottom: 1px solid #f1f5f9; }
    .skeleton-cell { height: 1rem; border-radius: 0.5rem; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; flex: 1; }
    .skeleton-cell.wide { flex: 2; }
    .skeleton-cell.narrow { flex: 0.5; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    @media (max-width: 768px) {
      .ticket-top { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
      .ticket-bottom { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class HelpdeskPageComponent implements OnInit {
  private readonly helpdeskApi = inject(HelpdeskService);
  protected readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly isLoading = signal(false);
  protected readonly myTickets = signal<SupportTicket[]>([]);
  protected readonly allTickets = signal<SupportTicket[]>([]);
  protected readonly statusFilter = signal<string>('ALL');

  protected readonly filteredTickets = computed(() => {
    const filter = this.statusFilter();
    const tickets = this.myTickets();
    if (filter === 'ALL') return tickets;
    return tickets.filter(t => t.status === filter);
  });

  protected readonly openCount = computed(() => this.myTickets().filter(t => t.status === 'OPEN').length);
  protected readonly inProgressCount = computed(() => this.myTickets().filter(t => t.status === 'IN_PROGRESS' || t.status === 'WAITING_REPLY').length);
  protected readonly resolvedCount = computed(() => this.myTickets().filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length);

  ngOnInit(): void {
    this.loadData();
  }

  protected isAdminOrManager(): boolean {
    const role = this.auth.user()?.role;
    return role === 'ADMIN' || role === 'MANAGER';
  }

  private loadData(): void {
    this.isLoading.set(true);
    const userId = this.auth.user()?.id || 1;

    this.helpdeskApi.getMyTickets(userId).subscribe({
      next: (tickets) => {
        this.myTickets.set(tickets);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snack.open('Unable to load support tickets.', 'OK', { duration: 3000 });
      }
    });

    if (this.isAdminOrManager()) {
      this.helpdeskApi.getTickets('OPEN').subscribe({
        next: (tickets) => this.allTickets.set(tickets)
      });
    }
  }

  protected formatCategory(cat: string): string {
    return cat.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
  }

  protected openNewTicketDialog(): void {
    const dialogRef = this.dialog.open(NewTicketDialog, { width: '550px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snack.open('Support ticket submitted successfully. We will get back to you soon.', 'OK', { duration: 4000 });
        this.loadData();
      }
    });
  }

  protected startWork(ticket: SupportTicket): void {
    this.helpdeskApi.updateTicketStatus(ticket.id, 'IN_PROGRESS').subscribe({
      next: () => {
        this.snack.open(`Ticket #${ticket.id} assigned to you.`, 'OK', { duration: 3000 });
        this.loadData();
      },
      error: () => this.snack.open('Failed to assign ticket.', 'OK', { duration: 3000 })
    });
  }

  protected resolveTicket(ticket: SupportTicket): void {
    const resolution = prompt('Enter resolution notes:');
    if (resolution !== null) {
      this.helpdeskApi.updateTicketStatus(ticket.id, 'RESOLVED', resolution).subscribe({
        next: () => {
          this.snack.open(`Ticket #${ticket.id} resolved.`, 'OK', { duration: 3000 });
          this.loadData();
        },
        error: () => this.snack.open('Failed to resolve ticket.', 'OK', { duration: 3000 })
      });
    }
  }

  protected reopenTicket(ticket: SupportTicket): void {
    this.helpdeskApi.updateTicketStatus(ticket.id, 'OPEN').subscribe({
      next: () => {
        this.snack.open(`Ticket #${ticket.id} reopened.`, 'OK', { duration: 3000 });
        this.loadData();
      },
      error: () => this.snack.open('Failed to reopen ticket.', 'OK', { duration: 3000 })
    });
  }
}

@Component({
  selector: 'app-new-ticket-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Submit Support Request</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="ticket-form">
        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <mat-select formControlName="category">
            <mat-option value="PAYROLL">Payroll Issue</mat-option>
            <mat-option value="SCHEDULE">Schedule / Shift</mat-option>
            <mat-option value="ACCOUNT">Account Access</mat-option>
            <mat-option value="TECHNICAL">Technical Problem</mat-option>
            <mat-option value="HR_POLICY">HR Policy Question</mat-option>
            <mat-option value="OTHER">Other</mat-option>
          </mat-select>
          <mat-error>Please select a category</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Priority</mat-label>
          <mat-select formControlName="priority">
            <mat-option value="LOW">Low — General question</mat-option>
            <mat-option value="MEDIUM">Medium — Work impacted</mat-option>
            <mat-option value="HIGH">High — Cannot work</mat-option>
            <mat-option value="URGENT">Urgent — Need help now</mat-option>
          </mat-select>
          <mat-error>Please select a priority</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Subject</mat-label>
          <input matInput formControlName="subject" placeholder="Brief summary of your issue">
          <mat-error>Subject is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="4" placeholder="Describe the issue in detail. Include any relevant dates, names, or error messages."></textarea>
          <mat-error>Please describe the issue</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid || isSaving()" (click)="save()">
        <mat-icon *ngIf="isSaving()">hourglass_empty</mat-icon>
        {{ isSaving() ? 'Submitting...' : 'Submit Ticket' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .ticket-form { display: grid; gap: 0.75rem; margin-top: 0.5rem; }
  `]
})
export class NewTicketDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly dialogRef = inject(MatDialogRef<NewTicketDialog>);
  private readonly helpdeskApi = inject(HelpdeskService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group({
    category: ['TECHNICAL', Validators.required],
    priority: ['MEDIUM', Validators.required],
    subject: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(10)]]
  });

  save(): void {
    this.isSaving.set(true);
    const raw = this.form.getRawValue();
    this.helpdeskApi.createTicket({
      ...raw as any,
      employeeId: this.auth.user()?.id || 1,
      employeeName: this.auth.user()?.name || 'Employee'
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.dialogRef.close(true);
      },
      error: () => {
        this.isSaving.set(false);
        this.snack.open('Failed to submit ticket. Please try again.', 'OK', { duration: 3000 });
      }
    });
  }
}
