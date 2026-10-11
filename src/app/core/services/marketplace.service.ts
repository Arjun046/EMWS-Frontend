import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

export interface ShiftBid {
  id: number;
  companyId: number;
  shiftId: number;
  employeeId: number;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  createdAt: string;
}

/**
 * Shift marketplace (BE: MarketplaceController /api/scheduling/marketplace).
 * Managers publish open shifts; employees bid; acceptance reassigns through
 * the full conflict engine, so a rule-breaking award fails with 409.
 */
@Injectable({ providedIn: 'root' })
export class MarketplaceService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly root = '/api/scheduling/marketplace';
  constructor(private readonly api: ApiService) {}

  openShifts(): Observable<any[]> {
    return this.api.get<any[]>(`${this.root}/open`, [], this.baseUrl);
  }

  publishShift(shiftId: number): Observable<any> {
    return this.api.post<any>(`${this.root}/publish/${shiftId}`, {}, undefined, this.baseUrl);
  }

  placeBid(shiftId: number, message = ''): Observable<ShiftBid> {
    return this.api.post<ShiftBid>(
      `${this.root}/${shiftId}/bid`,
      { message },
      undefined,
      this.baseUrl
    );
  }

  bidsForShift(shiftId: number): Observable<ShiftBid[]> {
    return this.api.get<ShiftBid[]>(`${this.root}/${shiftId}/bids`, [], this.baseUrl);
  }

  myBids(): Observable<ShiftBid[]> {
    return this.api.get<ShiftBid[]>(`${this.root}/my-bids`, [], this.baseUrl);
  }

  acceptBid(bidId: number): Observable<any> {
    return this.api.post<any>(`${this.root}/bids/${bidId}/accept`, {}, undefined, this.baseUrl);
  }

  withdrawBid(bidId: number): Observable<ShiftBid> {
    return this.api.post<ShiftBid>(`${this.root}/bids/${bidId}/withdraw`, {}, undefined, this.baseUrl);
  }
}
