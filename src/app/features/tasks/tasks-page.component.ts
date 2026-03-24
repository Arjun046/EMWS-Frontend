import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { TaskService, Task } from '../../core/services/task.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatDividerModule,
    PageHeaderComponent,
    DatePipe
  ],
  template: `
    <app-page-header 
      title="Operational Tasks" 
      subtitle="Manage daily assignments, track project milestones, and ensure operational excellence." 
      actionLabel="Create Task"
      (action)="onAddTask()"
    />

    <section class="tasks-shell">
      <div class="tasks-grid">
        <!-- Task Status Columns -->
        <div class="task-column">
          <div class="column-header">
            <h3>Pending</h3>
            <span class="count-pill">{{ pendingTasks().length }}</span>
          </div>
          <div class="task-stack">
            @for (task of pendingTasks(); track task.id) {
              <mat-card class="task-card">
                <div class="task-header">
                  <span class="priority-tag" [class]="task.priority.toLowerCase()">{{ task.priority }}</span>
                  <button mat-icon-button (click)="markComplete(task)"><mat-icon>check_circle_outline</mat-icon></button>
                </div>
                <strong>{{ task.title }}</strong>
                <p>{{ task.description }}</p>
                <div class="task-footer">
                  <mat-icon>calendar_today</mat-icon>
                  <span>Due {{ task.dueDate | date:'mediumDate' }}</span>
                </div>
              </mat-card>
            }
          </div>
        </div>

        <div class="task-column">
          <div class="column-header">
            <h3>In Progress</h3>
            <span class="count-pill">{{ inProgressTasks().length }}</span>
          </div>
          <div class="task-stack">
            @for (task of inProgressTasks(); track task.id) {
              <mat-card class="task-card active">
                <div class="task-header">
                  <span class="priority-tag" [class]="task.priority.toLowerCase()">{{ task.priority }}</span>
                  <button mat-icon-button (click)="markComplete(task)"><mat-icon>check_circle_outline</mat-icon></button>
                </div>
                <strong>{{ task.title }}</strong>
                <p>{{ task.description }}</p>
                <div class="task-footer">
                  <mat-icon>update</mat-icon>
                  <span>Started Recently</span>
                </div>
              </mat-card>
            }
          </div>
        </div>

        <div class="task-column">
          <div class="column-header">
            <h3>Completed</h3>
            <span class="count-pill">{{ completedTasks().length }}</span>
          </div>
          <div class="task-stack">
            @for (task of completedTasks(); track task.id) {
              <mat-card class="task-card completed">
                <div class="task-header">
                  <mat-icon class="done-icon">check_circle</mat-icon>
                </div>
                <strong>{{ task.title }}</strong>
                <div class="task-footer">
                  <span>Completed on {{ task.dueDate | date:'shortDate' }}</span>
                </div>
              </mat-card>
            }
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .tasks-shell { margin-top: 1.5rem; }
    .tasks-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; align-items: start; }
    
    .column-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; padding: 0 0.5rem; }
    .column-header h3 { margin: 0; font-size: 1rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
    .count-pill { background: #e2e8f0; color: #64748b; font-size: 0.7rem; font-weight: 800; padding: 0.1rem 0.5rem; border-radius: 999px; }

    .task-stack { display: grid; gap: 1rem; }
    .task-card { padding: 1.25rem; border-radius: 1rem; border: 1px solid #e2e8f0; cursor: grab; }
    .task-card:active { cursor: grabbing; }
    .task-card.active { border-left: 4px solid #3b82f6; }
    .task-card.completed { opacity: 0.6; background: #f8fafc; }
    
    .task-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .priority-tag { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; padding: 0.1rem 0.4rem; border-radius: 4px; }
    .priority-tag.high { background: #fef2f2; color: #ef4444; }
    .priority-tag.medium { background: #fffbeb; color: #f59e0b; }
    .priority-tag.low { background: #f0fdf4; color: #10b981; }

    .task-card strong { font-size: 0.95rem; color: #0f172a; display: block; margin-bottom: 0.4rem; }
    .task-card p { font-size: 0.85rem; color: #64748b; line-height: 1.4; margin: 0 0 1rem; }
    
    .task-footer { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: #94a3b8; font-weight: 500; }
    .task-footer mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    
    .done-icon { color: #10b981; }

    @media (max-width: 1024px) {
      .tasks-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class TasksPageComponent {
  private readonly taskApi = inject(TaskService);
  private readonly snack = inject(MatSnackBar);

  protected readonly allTasks = toSignal(this.taskApi.getTasks(), { initialValue: [] });

  protected readonly pendingTasks = computed(() => this.allTasks().filter(t => t.status === 'PENDING'));
  protected readonly inProgressTasks = computed(() => this.allTasks().filter(t => t.status === 'IN_PROGRESS'));
  protected readonly completedTasks = computed(() => this.allTasks().filter(t => t.status === 'COMPLETED'));

  protected onAddTask(): void {
    this.snack.open('Task creation is coming in the next release.', 'OK', { duration: 3000 });
  }

  protected markComplete(task: Task): void {
    this.taskApi.updateTaskStatus(task.id, 'COMPLETED').subscribe(() => {
      this.snack.open('Task marked as completed', 'OK', { duration: 2000 });
      window.location.reload();
    });
  }
}
