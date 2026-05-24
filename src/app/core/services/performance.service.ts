import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Goal {
  id: number;
  employeeId: number;
  title: string;
  description: string;
  targetDate: string;
  progress: number;
  status: string; // IN_PROGRESS, COMPLETED, ARCHIVED
}

export interface PerformanceReview {
  id: number;
  employeeId: number;
  reviewerId: number;
  reviewDate: string;
  rating: number;
  comments: string;
  status: string; // DRAFT, FINALIZED
}

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  getGoals(employeeId: number): Observable<Goal[]> {
    return this.api.get<Goal[]>(`/api/goals/employee/${employeeId}`, [], this.baseUrl);
  }

  createGoal(goal: Partial<Goal>): Observable<Goal> {
    return this.api.post<Goal>('/api/goals', goal, undefined, this.baseUrl);
  }

  getReviews(employeeId: number): Observable<PerformanceReview[]> {
    return this.api.get<PerformanceReview[]>(`/api/performance-reviews/employee/${employeeId}`, [], this.baseUrl);
  }

  createReview(review: Partial<PerformanceReview>): Observable<PerformanceReview> {
    return this.api.post<PerformanceReview>('/api/performance-reviews', review, undefined, this.baseUrl);
  }
}
