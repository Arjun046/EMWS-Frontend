import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Task {
  id: number;
  shiftId?: number | null;
  title: string;
  description: string;
  assigneeId: number;
  // UI-only: BE Task has no due date; kept for display, never sent as contract.
  dueDate?: string;
  status: string; // PENDING, IN_PROGRESS, COMPLETED
  priority: string; // LOW, MEDIUM, HIGH, URGENT
  sourceMessageId?: number | null;
}

/**
 * Matches TaskController (/api/tasks). Note the assignee feed lives under
 * /internal/assignee/{id} — the old /assignee/{id} path 404'd.
 */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  getTasks(): Observable<Task[]> {
    return this.api.get<Task[]>('/api/tasks', [], this.baseUrl);
  }

  getTask(id: number): Observable<Task> {
    return this.api.get<Task>(`/api/tasks/${id}`, undefined, this.baseUrl);
  }

  getTasksByAssignee(assigneeId: number): Observable<Task[]> {
    return this.api.get<Task[]>(`/api/tasks/internal/assignee/${assigneeId}`, [], this.baseUrl);
  }

  getTasksByShift(shiftId: number): Observable<Task[]> {
    return this.api.get<Task[]>(`/api/tasks/shift/${shiftId}`, [], this.baseUrl);
  }

  createTask(task: Partial<Task>): Observable<Task> {
    const { dueDate, ...body } = task;
    void dueDate;
    return this.api.post<Task>('/api/tasks', body, undefined, this.baseUrl);
  }

  updateTask(id: number, task: Partial<Task>): Observable<Task> {
    const { dueDate, ...body } = task;
    void dueDate;
    return this.api.put<Task>(`/api/tasks/${id}`, body, undefined, this.baseUrl);
  }

  updateTaskStatus(id: number, status: string): Observable<Task> {
    return this.api.patch<Task>(
      `/api/tasks/${id}/status?status=${encodeURIComponent(status)}`,
      {},
      undefined,
      this.baseUrl
    );
  }

  deleteTask(id: number): Observable<void> {
    return this.api.delete<void>(`/api/tasks/${id}`, undefined, this.baseUrl);
  }
}
