import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { PerformanceService, Goal, PerformanceReview } from '../../core/services/performance.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-performance-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatProgressBarModule,
    MatDividerModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    DatePipe
  ],
  template: `
    <app-page-header 
      title="Performance & Talent" 
      subtitle="Track career objectives, review performance milestones, and manage professional growth." 
      actionLabel="Set New Goal"
      (action)="onAddGoal()"
    />

    <section class="performance-shell">
      <div class="perf-grid">
        <!-- Growth Goals -->
        <div class="goals-column">
          <div class="section-header">
            <h3>Active Growth Objectives</h3>
            <button mat-button color="primary">View Archive</button>
          </div>

          <div class="goals-stack">
            @for (goal of goals(); track goal.id) {
              <mat-card class="goal-card">
                <div class="goal-header">
                  <strong>{{ goal.title }}</strong>
                  <app-status-badge [value]="goal.status" />
                </div>
                <p class="goal-desc">{{ goal.description }}</p>
                <div class="goal-progress">
                  <div class="progress-meta">
                    <span>Progress</span>
                    <span>{{ goal.progress }}%</span>
                  </div>
                  <mat-progress-bar mode="determinate" [value]="goal.progress"></mat-progress-bar>
                </div>
                <div class="goal-footer">
                  <mat-icon>calendar_today</mat-icon>
                  <span>Target: {{ goal.targetDate | date:'mediumDate' }}</span>
                </div>
              </mat-card>
            }
            @if (goals().length === 0) {
              <mat-card class="empty-card">
                <p>No active goals found. Start by setting your first objective.</p>
              </mat-card>
            }
          </div>
        </div>

        <!-- Performance Reviews -->
        <div class="reviews-column">
          <div class="section-header">
            <h3>Historical Reviews</h3>
          </div>

          <div class="reviews-stack">
            @for (rev of reviews(); track rev.id) {
              <mat-card class="review-card">
                <div class="review-score">
                  <div class="score-value">{{ rev.rating }}</div>
                  <span class="score-label">Rating</span>
                </div>
                <div class="review-content">
                  <div class="review-meta">
                    <strong>Annual Review</strong>
                    <span>{{ rev.reviewDate | date:'longDate' }}</span>
                  </div>
                  <p class="review-comment">"{{ rev.comments }}"</p>
                  <div class="review-footer">
                    <button mat-stroked-button size="small">
                      <mat-icon>description</mat-icon> View Full Report
                    </button>
                  </div>
                </div>
              </mat-card>
            }
            @if (reviews().length === 0) {
              <mat-card class="empty-card">
                <p>No historical reviews available.</p>
              </mat-card>
            }
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .performance-shell { margin-top: 1.5rem; }
    .perf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
    
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .section-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #1e293b; }
    
    .goals-stack, .reviews-stack { display: grid; gap: 1.25rem; }
    
    .goal-card { padding: 1.5rem; border-radius: 1.2rem; border: 1px solid #e2e8f0; }
    .goal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
    .goal-header strong { font-size: 1rem; color: #0f172a; }
    .goal-desc { margin: 0 0 1.25rem; font-size: 0.9rem; color: #64748b; line-height: 1.5; }
    .goal-progress { margin-bottom: 1rem; }
    .progress-meta { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; }
    .goal-footer { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #94a3b8; }
    .goal-footer mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }

    .review-card { padding: 1.5rem; border-radius: 1.2rem; border: 1px solid #e2e8f0; display: flex; gap: 1.5rem; align-items: flex-start; }
    .review-score { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; text-align: center; min-width: 4.5rem; }
    .score-value { font-size: 1.75rem; font-weight: 800; color: #3b82f6; line-height: 1; }
    .score-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .review-content { flex: 1; }
    .review-meta { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
    .review-meta strong { font-size: 0.95rem; }
    .review-meta span { font-size: 0.8rem; color: #94a3b8; }
    .review-comment { margin: 0 0 1rem; font-size: 0.9rem; color: #475569; font-style: italic; }
    
    .empty-card { padding: 2rem; text-align: center; color: #94a3b8; border: 1px dashed #e2e8f0; background: transparent; box-shadow: none; }

    @media (max-width: 1024px) {
      .perf-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class PerformancePageComponent {
  private readonly perfApi = inject(PerformanceService);
  
  private readonly currentUserId = 1;

  protected readonly goals = toSignal(this.perfApi.getGoals(this.currentUserId), { initialValue: [] });
  protected readonly reviews = toSignal(this.perfApi.getReviews(this.currentUserId), { initialValue: [] });

  protected onAddGoal(): void {
    // Implement add goal dialog
  }
}
