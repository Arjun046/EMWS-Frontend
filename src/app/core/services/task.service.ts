import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface Task {
  id: number;
  title: string;
  description: string;
  assigneeId: number;
  dueDate: string;
  status: string; // PENDING, IN_PROGRESS, COMPLETED
  priority: string; // LOW, MEDIUM, HIGH
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly baseUrl = 'http://localhost:8080';
  constructor(private readonly api: ApiService) {}

  getTasks(): Observable<Task[]> {
    return this.api.get<Task[]>('/api/tasks', [], this.baseUrl);
  }

  getTasksByAssignee(assigneeId: number): Observable<Task[]> {
    return this.api.get<Task[]>(`/api/tasks/assignee/${assigneeId}`, [], this.baseUrl);
  }

  createTask(task: Partial<Task>): Observable<Task> {
    return this.api.post<Task>('/api/tasks', task, undefined, this.baseUrl);
  }

  updateTaskStatus(id: number, status: string): Observable<Task> {
    return this.api.patch<Task>(`/api/tasks/${id}/status?status=${status}`, {}, undefined, this.baseUrl);
  }
}
