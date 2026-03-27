import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-manager-onboarding',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressBarModule, MatCheckboxModule, FormsModule],
  template: `
    <mat-card class="onboarding-card overflow-hidden">
      <div class="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <h3 class="font-bold m-0 flex items-center gap-2">
          <mat-icon>school</mat-icon> Manager Onboarding
        </h3>
        <p class="text-[10px] text-blue-100 mt-1 uppercase font-bold tracking-wider">Complete these to unlock full features</p>
      </div>
      
      <div class="p-4">
        <div class="mb-4">
          <div class="flex justify-between text-xs font-bold mb-1">
            <span>{{ progress() }}% Complete</span>
            <span>{{ completedCount() }}/{{ tasks().length }}</span>
          </div>
          <mat-progress-bar mode="determinate" [value]="progress()" class="h-1.5 rounded-full"></mat-progress-bar>
        </div>

        <div class="task-list flex flex-col gap-3">
          @for (task of tasks(); track task.id) {
            <div class="task-item flex items-start gap-2" [class.done]="task.done">
              <mat-checkbox [(ngModel)]="task.done" (change)="updateProgress()" color="primary" class="mt-0.5"></mat-checkbox>
              <div class="flex flex-col">
                <span class="text-sm font-bold">{{ task.label }}</span>
                <p class="text-[10px] text-slate-500 m-0" *ngIf="!task.done">{{ task.desc }}</p>
              </div>
            </div>
          }
        </div>
      </div>
      
      @if (progress() === 100) {
        <div class="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold text-center border-t border-emerald-100">
          <mat-icon class="text-sm w-auto h-auto align-middle mr-1">emoji_events</mat-icon>
          Onboarding Complete!
        </div>
      }
    </mat-card>
  `,
  styles: [`
    .onboarding-card { border-radius: 1rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .bg-gradient-to-r { background: linear-gradient(to right, #2563eb, #4338ca); }
    .task-item.done span { text-decoration: line-through; color: #94a3b8; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .gap-2 { gap: 0.5rem; }
    .gap-3 { gap: 0.75rem; }
    .items-start { align-items: flex-start; }
    .justify-between { justify-content: space-between; }
    .mt-0\\.5 { margin-top: 0.125rem; }
  `]
})
export class ManagerOnboardingComponent {
  protected readonly tasks = signal([
    { id: 1, label: 'Review Team Roster', desc: 'Confirm your current direct reports', done: true },
    { id: 2, label: 'Configure Approval Flow', desc: 'Set your leave approval preferences', done: false },
    { id: 3, label: 'Schedule 1:1 Meetings', desc: 'Use the communication module', done: false },
    { id: 4, label: 'Verify Compliance Rules', desc: 'Audit team certifications', done: false }
  ]);

  protected readonly completedCount = computed(() => this.tasks().filter(t => t.done).length);
  protected readonly progress = computed(() => Math.round((this.completedCount() / this.tasks().length) * 100));

  updateProgress() {
    // Computed signals handle this automatically
  }
}
