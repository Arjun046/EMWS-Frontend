import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

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
  private readonly api = inject(ApiService);

  getTickets(status?: string): Observable<SupportTicket[]> {
    let url = `/api/helpdesk/tickets`;
    if (status) {
      url += `?status=${status}`;
    }
    return this.api.get<SupportTicket[]>(url, []);
  }

  getMyTickets(employeeId: number): Observable<SupportTicket[]> {
    return this.api.get<SupportTicket[]>(`/api/helpdesk/tickets/employee/${employeeId}`, []);
  }

  createTicket(ticket: Partial<SupportTicket>): Observable<SupportTicket> {
    return this.api.post<SupportTicket>(`/api/helpdesk/tickets`, ticket);
  }

  updateTicketStatus(ticketId: number, status: string, resolution?: string): Observable<SupportTicket> {
    return this.api.patch<SupportTicket>(
      `/api/helpdesk/tickets/${ticketId}`,
      { status, resolution }
    );
  }

  getReplies(ticketId: number): Observable<TicketReply[]> {
    return this.api.get<TicketReply[]>(`/api/helpdesk/tickets/${ticketId}/replies`, []);
  }

  addReply(ticketId: number, content: string): Observable<TicketReply> {
    return this.api.post<TicketReply>(
      `/api/helpdesk/tickets/${ticketId}/replies`,
      { content }
    );
  }
}
