import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Mirrors BE OnboardingTask (employee-service). */
export interface OnboardingTask {
  id: number;
  employeeId: number;
  companyId?: number;
  taskName: string;
  description?: string;
  isCompleted?: boolean;
  category?: string; // DOCUMENTATION, TRAINING, EQUIPMENT
}

/**
 * Matches OnboardingTaskController (/api/employees/onboarding):
 *  GET /tasks | GET /tasks/employee/{id} | POST /tasks |
 *  PUT /tasks/{id} | DELETE /tasks/{id} | PATCH /tasks/{id}/complete
 * BE auto-creates default tasks on hire; directory readers see all,
 * others see only their own.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly root = '/api/employees/onboarding/tasks';
  constructor(private readonly api: ApiService) {}

  getTasks(): Observable<OnboardingTask[]> {
    return this.api.get<OnboardingTask[]>(`${this.root}`, [], this.baseUrl);
  }

  getTasksForEmployee(employeeId: number): Observable<OnboardingTask[]> {
    return this.api.get<OnboardingTask[]>(`${this.root}/employee/${employeeId}`, [], this.baseUrl);
  }

  createTask(task: Partial<OnboardingTask>): Observable<OnboardingTask> {
    return this.api.post<OnboardingTask>(`${this.root}`, task, undefined, this.baseUrl);
  }

  completeTask(id: number): Observable<OnboardingTask> {
    return this.api.patch<OnboardingTask>(`${this.root}/${id}/complete`, {}, undefined, this.baseUrl);
  }

  deleteTask(id: number): Observable<void> {
    return this.api.delete<void>(`${this.root}/${id}`, undefined, this.baseUrl);
  }
}
