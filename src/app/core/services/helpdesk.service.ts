import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SupportTicket {
  id: number;
  employeeId: number;
  employeeName: string;
  subject: string;
  description: string;
  category: 'PAYROLL' | 'SCHEDULE' | 'ACCOUNT' | 'TECHNICAL' | 'HR_POLICY' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_REPLY' | 'RESOLVED' | 'CLOSED';
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  resolution: string | null;
}

export interface TicketReply {
  id: number;
  ticketId: number;
  authorId: number;
  authorName: string;
  content: string;
  isStaff: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class HelpdeskService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getTickets(status?: string): Observable<SupportTicket[]> {
    let url = `${this.base}/api/helpdesk/tickets`;
    if (status) url += `?status=${status}`;
    return this.http.get<SupportTicket[]>(url).pipe(catchError(() => of([])));
  }

  getMyTickets(employeeId: number): Observable<SupportTicket[]> {
    return this.http.get<SupportTicket[]>(
      `${this.base}/api/helpdesk/tickets/employee/${employeeId}`
    ).pipe(catchError(() => of([])));
  }

  createTicket(ticket: Partial<SupportTicket>): Observable<SupportTicket> {
    return this.http.post<SupportTicket>(`${this.base}/api/helpdesk/tickets`, ticket);
  }

  updateTicketStatus(ticketId: number, status: string, resolution?: string): Observable<SupportTicket> {
    return this.http.patch<SupportTicket>(
      `${this.base}/api/helpdesk/tickets/${ticketId}`,
      { status, resolution }
    );
  }

  getReplies(ticketId: number): Observable<TicketReply[]> {
    return this.http.get<TicketReply[]>(
      `${this.base}/api/helpdesk/tickets/${ticketId}/replies`
    ).pipe(catchError(() => of([])));
  }

  addReply(ticketId: number, content: string): Observable<TicketReply> {
    return this.http.post<TicketReply>(
      `${this.base}/api/helpdesk/tickets/${ticketId}/replies`,
      { content }
    );
  }
}
