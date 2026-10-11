import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PerformanceService, Goal, PerformanceReview } from '../../core/services/performance.service';
import { EmployeeDataService } from '../../core/services/employee-data.service';
import { AuthService } from '../../core/services/auth.service';
import { backendErrorMessage } from '../../shared/utils/password-policy';

const GOAL_STATUSES = ['ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

@Component({
  selector: 'app-performance-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSnackBarModule, MatProgressSpinnerModule],
  template: `
    <div class="module-page active-page fade-up">
      <div class="filter-action-row">
        <div>
          <h2 style="margin:0;">Performance</h2>
          <p style="margin:0;color:var(--txt-muted);font-size:0.8rem;">Goals and performance reviews.</p>
        </div>
        <button class="ui-btn ui-btn-primary" (click)="reload()" [disabled]="loading()">
          <mat-icon style="font-size:1.1rem;width:1.1rem;height:1.1rem;">refresh</mat-icon> Refresh
        </button>
      </div>

      @if (loading() && !goals().length && !reviews().length) {
        <div style="padding:4rem;text-align:center;"><mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner></div>
      } @else {
        <div class="perf-grid">
          <div class="ui-card">
            <div class="ui-card-header"><h3>Goals ({{ goals().length }})</h3></div>
            @if (!goals().length) {
              <p style="color:var(--txt-muted);font-size:0.85rem;">No goals yet — create the first one below.</p>
            }
            @for (g of goals(); track g.id) {
              <div class="perf-row">
                <div style="flex:1;">
                  <strong>{{ g.description }}</strong><br>
                  <small>{{ employeeName(g.employeeId) }} · {{ g.status }} · due {{ g.targetDate || '—' }}</small>
                </div>
                <select [(ngModel)]="goalStatus[g.id]" class="f-input" style="max-width:150px;">
                  @for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }
                </select>
                <button class="ui-btn" (click)="saveGoalStatus(g)">Set</button>
                <button class="ui-btn" style="color:var(--danger);" (click)="removeGoal(g.id)">Delete</button>
              </div>
            }
            <div class="form-section">New goal</div>
            <div class="f-group"><label>Description</label><input class="f-input" [(ngModel)]="newGoalDesc" placeholder="e.g. Close 5 enterprise deals"></div>
            <div class="f-grid">
              <div class="f-group"><label>Employee</label>
                <select class="f-input" [(ngModel)]="newGoalEmp">
                  <option [ngValue]="null">Myself</option>
                  @for (e of employees(); track e.id) { <option [ngValue]="e.id">{{ e.firstName }} {{ e.lastName }}</option> }
                </select>
              </div>
              <div class="f-group"><label>Target date</label><input class="f-input" type="date" [(ngModel)]="newGoalDate"></div>
            </div>
            <button class="ui-btn ui-btn-primary" (click)="addGoal()" [disabled]="!newGoalDesc.trim()">Create goal</button>
          </div>

          <div class="ui-card">
            <div class="ui-card-header"><h3>Reviews ({{ reviews().length }})</h3></div>
            @for (r of reviews(); track r.id) {
              <div class="perf-row">
                <div style="flex:1;">
                  <strong>{{ r.score }}/100</strong> · {{ employeeName(r.employeeId) }}<br>
                  <small>{{ r.comments || 'No comments' }} · {{ r.reviewDate || '' }}</small>
                </div>
                <input class="f-input" type="number" min="1" max="100" [(ngModel)]="revScore[r.id]" style="max-width:90px;" [attr.aria-label]="'Score for review ' + r.id">
                <button class="ui-btn" (click)="saveReview(r)">Save</button>
                <button class="ui-btn" style="color:var(--danger);" (click)="removeReview(r.id)">Delete</button>
              </div>
            }
            <div class="form-section">New review</div>
            <div class="f-grid">
              <div class="f-group"><label>Employee</label>
                <select class="f-input" [(ngModel)]="newRevEmp">
                  @for (e of employees(); track e.id) { <option [ngValue]="e.id">{{ e.firstName }} {{ e.lastName }}</option> }
                </select>
              </div>
              <div class="f-group"><label>Score (1–100)</label><input class="f-input" type="number" min="1" max="100" [(ngModel)]="newRevScore"></div>
            </div>
            <div class="f-group"><label>Comments</label><textarea class="f-input" [(ngModel)]="newRevComments" style="height:70px;"></textarea></div>
            <button class="ui-btn ui-btn-primary" (click)="addReview()">Submit review</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .perf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem; }
    @media (max-width: 900px) { .perf-grid { grid-template-columns: 1fr; } }
    .perf-row { display: flex; gap: 0.5rem; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
    .form-section { font-size: 0.7rem; font-weight: 800; color: var(--primary); text-transform: uppercase; margin: 1.25rem 0 0.75rem; }
    .f-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  `]
})
export class PerformancePageComponent implements OnInit {
  private readonly perf = inject(PerformanceService);
  private readonly empApi = inject(EmployeeDataService);
  protected readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  protected readonly goals = signal<Goal[]>([]);
  protected readonly reviews = signal<PerformanceReview[]>([]);
  protected readonly employees = signal<any[]>([]);
  protected readonly loading = signal(false);
  protected readonly statuses = GOAL_STATUSES;
  protected goalStatus: Record<number, string> = {};
  protected revScore: Record<number, number> = {};

  protected newGoalDesc = '';
  protected newGoalEmp: number | null = null;
  protected newGoalDate = '';
  protected newRevEmp: number | null = null;
  protected newRevScore = 75;
  protected newRevComments = '';

  ngOnInit(): void {
    this.empApi.getEmployees().subscribe({
      next: (res: any) => this.employees.set(Array.isArray(res) ? res : (res?.content ?? [])),
      error: () => this.employees.set([])
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    const mine = this.auth.user()?.id ?? null;
    const canSeeAll = this.auth.hasAnyScope(['USER_ORG_READ', 'USER_TEAM_READ']);
    this.perf.getGoals(canSeeAll ? null : mine).subscribe({
      next: (goals) => {
        this.goals.set(goals);
        goals.forEach((g) => (this.goalStatus[g.id] = g.status));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.snack.open(backendErrorMessage(err, 'Goals unavailable.'), 'Dismiss', { duration: 5000 });
      }
    });
    (canSeeAll ? this.perf.getCompanyReviews() : this.perf.getMyReviews()).subscribe({
      next: (reviews) => {
        this.reviews.set(reviews ?? []);
        (reviews ?? []).forEach((r) => (this.revScore[r.id] = r.score));
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Reviews unavailable.'), 'Dismiss', { duration: 5000 })
    });
  }

  employeeName(id: number): string {
    const e = this.employees().find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : `#${id}`;
  }

  addGoal(): void {
    this.perf.createGoal({
      employeeId: this.newGoalEmp,
      description: this.newGoalDesc.trim(),
      status: 'ACTIVE',
      targetDate: this.newGoalDate || null
    }).subscribe({
      next: () => {
        this.snack.open('Goal created.', 'OK', { duration: 3000 });
        this.newGoalDesc = '';
        this.reload();
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Create failed.'), 'Dismiss', { duration: 6000 })
    });
  }

  saveGoalStatus(g: Goal): void {
    const status = this.goalStatus[g.id] || g.status;
    this.perf.updateGoal(g.id, { description: g.description, status }).subscribe({
      next: () => {
        this.snack.open(`Goal → ${status}.`, 'OK', { duration: 3000 });
        this.reload();
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Update failed.'), 'Dismiss', { duration: 6000 })
    });
  }

  removeGoal(id: number): void {
    if (!confirm('Delete this goal?')) return;
    this.perf.deleteGoal(id).subscribe({
      next: () => this.reload(),
      error: (err) => this.snack.open(backendErrorMessage(err, 'Delete failed.'), 'Dismiss', { duration: 5000 })
    });
  }

  addReview(): void {
    if (!this.newRevEmp || this.newRevScore < 1 || this.newRevScore > 100) {
      this.snack.open('Pick an employee and a score between 1 and 100.', 'Dismiss', { duration: 4000 });
      return;
    }
    this.perf.createReview({
      employeeId: this.newRevEmp,
      reviewDate: new Date().toISOString().split('T')[0],
      score: Number(this.newRevScore),
      comments: this.newRevComments
    }).subscribe({
      next: () => {
        this.snack.open('Review submitted.', 'OK', { duration: 3000 });
        this.newRevComments = '';
        this.reload();
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Submit failed.'), 'Dismiss', { duration: 6000 })
    });
  }

  saveReview(r: PerformanceReview): void {
    const score = Number(this.revScore[r.id] ?? r.score);
    if (!Number.isFinite(score) || score < 1 || score > 100) {
      this.snack.open('Score must be between 1 and 100.', 'Dismiss', { duration: 4000 });
      return;
    }
    this.perf.updateReview(r.id, { score, comments: r.comments }).subscribe({
      next: () => {
        this.snack.open('Review updated.', 'OK', { duration: 3000 });
        this.reload();
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Update failed.'), 'Dismiss', { duration: 6000 })
    });
  }

  removeReview(id: number): void {
    if (!confirm('Delete this review?')) return;
    this.perf.deleteReview(id).subscribe({
      next: () => this.reload(),
      error: (err) => this.snack.open(backendErrorMessage(err, 'Delete failed.'), 'Dismiss', { duration: 5000 })
    });
  }
}
