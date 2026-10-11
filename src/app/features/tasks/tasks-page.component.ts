import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { TaskService, Task } from '../../core/services/task.service';
import { EmployeeDataService } from '../../core/services/employee-data.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { backendErrorMessage } from '../../shared/utils/password-policy';

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
    MatProgressSpinnerModule,
    MatTooltipModule,
    FormsModule,
    PageHeaderComponent
  ],
  template: `
    <app-page-header
      title="Tasks"
      subtitle="Assignments across your team."
      actionLabel="Create Task"
      (action)="showCreate.set(!showCreate())"
    />

    <section class="tasks-shell">
      @if (showCreate()) {
        <mat-card class="create-card">
          <h3>New task</h3>
          <div class="f-group"><label>Title</label><input class="f-input" [(ngModel)]="newTitle" placeholder="What needs doing?"></div>
          <div class="f-group"><label>Description</label><textarea class="f-input" [(ngModel)]="newDesc" style="height:70px;" placeholder="Details (optional)"></textarea></div>
          <div class="f-grid">
            <div class="f-group"><label>Assignee</label>
              <select class="f-input" [(ngModel)]="newAssignee">
                <option [ngValue]="null">Unassigned</option>
                @for (e of employees(); track e.id) { <option [ngValue]="e.id">{{ e.firstName }} {{ e.lastName }}</option> }
              </select>
            </div>
            <div class="f-group"><label>Priority</label>
              <select class="f-input" [(ngModel)]="newPriority">
                <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option><option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button mat-raised-button color="primary" (click)="createTask()" [disabled]="!newTitle.trim() || creating()">Create</button>
            <button mat-button (click)="showCreate.set(false)">Cancel</button>
          </div>
        </mat-card>
      }

      @if (loading() && !allTasks().length) {
        <div style="padding:4rem;text-align:center;"><mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner></div>
      } @else {
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
                  <button mat-icon-button (click)="markComplete(task)" matTooltip="Mark complete" aria-label="Mark complete"><mat-icon>check_circle_outline</mat-icon></button>
                </div>
                <strong>{{ task.title }}</strong>
                <p>{{ task.description }}</p>
                <div class="task-footer">
                  <mat-icon>person</mat-icon>
                  <span>{{ assigneeName(task.assigneeId) }}</span>
                </div>
              </mat-card>
            } @empty {
              <p class="empty-col">No pending tasks.</p>
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
                  <button mat-icon-button (click)="markComplete(task)" matTooltip="Mark complete" aria-label="Mark complete"><mat-icon>check_circle_outline</mat-icon></button>
                </div>
                <strong>{{ task.title }}</strong>
                <p>{{ task.description }}</p>
                <div class="task-footer">
                  <mat-icon>person</mat-icon>
                  <span>{{ assigneeName(task.assigneeId) }}</span>
                </div>
              </mat-card>
            } @empty {
              <p class="empty-col">Nothing in progress.</p>
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
                  <span>{{ assigneeName(task.assigneeId) }}</span>
                </div>
              </mat-card>
            } @empty {
              <p class="empty-col">No completed tasks yet.</p>
            }
          </div>
        </div>
      </div>
      }
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

    .create-card { padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 1rem; }
    .create-card h3 { margin: 0 0 1rem; }
    .f-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
    .f-group label { font-size: 0.72rem; font-weight: 700; color: var(--txt-secondary); text-transform: uppercase; }
    .f-input { min-height: 42px; border-radius: 8px; border: 1.5px solid var(--border); padding: 0.5rem 0.85rem; font-family: inherit; font-size: 0.85rem; background: var(--surface); color: var(--txt-main); width: 100%; }
    .f-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .empty-col { color: var(--txt-muted); font-size: 0.85rem; padding: 1rem 0.5rem; }

    @media (max-width: 1024px) {
      .tasks-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class TasksPageComponent implements OnInit {
  private readonly taskApi = inject(TaskService);
  private readonly empApi = inject(EmployeeDataService);
  protected readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  protected readonly allTasks = signal<Task[]>([]);
  protected readonly employees = signal<{ id: number; firstName: string; lastName: string }[]>([]);
  protected readonly loading = signal(false);
  protected readonly showCreate = signal(false);
  protected readonly creating = signal(false);

  protected newTitle = '';
  protected newDesc = '';
  protected newAssignee: number | null = null;
  protected newPriority = 'MEDIUM';

  protected readonly pendingTasks = computed(() => this.allTasks().filter(t => t.status === 'PENDING'));
  protected readonly inProgressTasks = computed(() => this.allTasks().filter(t => t.status === 'IN_PROGRESS'));
  protected readonly completedTasks = computed(() => this.allTasks().filter(t => t.status === 'COMPLETED'));

  ngOnInit(): void {
    this.reload();
    this.empApi.getEmployees().subscribe({
      next: (res: any) => this.employees.set(Array.isArray(res) ? res : (res?.content ?? [])),
      error: () => this.employees.set([])
    });
  }

  protected reload(): void {
    this.loading.set(true);
    this.taskApi.getTasks().subscribe({
      next: (tasks) => {
        this.allTasks.set(tasks ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.snack.open(backendErrorMessage(err, 'Could not load tasks.'), 'Dismiss', { duration: 5000 });
      }
    });
  }

  protected assigneeName(id: number): string {
    const e = this.employees().find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : 'Unassigned';
  }

  protected createTask(): void {
    if (!this.newTitle.trim() || this.creating()) return;
    this.creating.set(true);
    this.taskApi.createTask({
      title: this.newTitle.trim(),
      description: this.newDesc.trim(),
      assigneeId: this.newAssignee ?? this.auth.user()?.id,
      status: 'PENDING',
      priority: this.newPriority
    }).subscribe({
      next: () => {
        this.snack.open('Task created.', 'OK', { duration: 3000 });
        this.newTitle = ''; this.newDesc = ''; this.newAssignee = null;
        this.showCreate.set(false);
        this.creating.set(false);
        this.reload();
      },
      error: (err) => {
        this.creating.set(false);
        this.snack.open(backendErrorMessage(err, 'Could not create task.'), 'Dismiss', { duration: 5000 });
      }
    });
  }

  protected markComplete(task: Task): void {
    this.taskApi.updateTaskStatus(task.id, 'COMPLETED').subscribe({
      next: () => {
        this.snack.open('Task completed.', 'OK', { duration: 2000 });
        this.reload();
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Could not update task.'), 'Dismiss', { duration: 5000 })
    });
  }
}
