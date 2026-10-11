import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Mirrors BE GoalResponse. Status: ACTIVE | IN_PROGRESS | COMPLETED | CANCELLED. */
export interface Goal {
  id: number;
  employeeId: number;
  companyId?: number;
  description: string;
  status: string;
  targetDate?: string;
}

export interface GoalInput {
  employeeId?: number | null;
  description: string;
  status?: string;
  targetDate?: string | null;
}

/** Mirrors BE PerformanceReviewResponse. Score: 1–100. */
export interface PerformanceReview {
  id: number;
  employeeId: number;
  companyId?: number;
  reviewerId: number;
  reviewDate?: string;
  score: number;
  comments?: string;
}

export interface ReviewInput {
  employeeId?: number | null;
  reviewerId?: number | null;
  reviewDate?: string | null;
  score: number;
  comments?: string;
}

/**
 * Matches GoalController (/api/goals) and PerformanceReviewController
 * (/api/performance-reviews): list via ?employeeId=, /me, /company.
 */
@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  getGoals(employeeId?: number | null): Observable<Goal[]> {
    const q = employeeId ? `?employeeId=${employeeId}` : '';
    return this.api.get<Goal[]>(`/api/goals${q}`, [], this.baseUrl);
  }

  getGoal(id: number): Observable<Goal> {
    return this.api.get<Goal>(`/api/goals/${id}`, undefined, this.baseUrl);
  }

  createGoal(goal: GoalInput): Observable<Goal> {
    return this.api.post<Goal>('/api/goals', goal, undefined, this.baseUrl);
  }

  updateGoal(id: number, goal: GoalInput): Observable<Goal> {
    return this.api.put<Goal>(`/api/goals/${id}`, goal, undefined, this.baseUrl);
  }

  deleteGoal(id: number): Observable<void> {
    return this.api.delete<void>(`/api/goals/${id}`, undefined, this.baseUrl);
  }

  getMyReviews(): Observable<PerformanceReview[]> {
    return this.api.get<PerformanceReview[]>('/api/performance-reviews/me', [], this.baseUrl);
  }

  getCompanyReviews(): Observable<PerformanceReview[]> {
    return this.api.get<PerformanceReview[]>('/api/performance-reviews/company', [], this.baseUrl);
  }

  getReview(id: number): Observable<PerformanceReview> {
    return this.api.get<PerformanceReview>(`/api/performance-reviews/${id}`, undefined, this.baseUrl);
  }

  createReview(review: ReviewInput): Observable<PerformanceReview> {
    return this.api.post<PerformanceReview>('/api/performance-reviews', review, undefined, this.baseUrl);
  }

  updateReview(id: number, review: ReviewInput): Observable<PerformanceReview> {
    return this.api.put<PerformanceReview>(`/api/performance-reviews/${id}`, review, undefined, this.baseUrl);
  }

  deleteReview(id: number): Observable<void> {
    return this.api.delete<void>(`/api/performance-reviews/${id}`, undefined, this.baseUrl);
  }
}
