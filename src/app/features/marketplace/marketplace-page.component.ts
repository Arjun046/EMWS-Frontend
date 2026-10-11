import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MarketplaceService, ShiftBid } from '../../core/services/marketplace.service';
import { SchedulingService, ShiftSwapRequest } from '../../core/services/scheduling.service';
import { AuthService } from '../../core/services/auth.service';
import { backendErrorMessage } from '../../shared/utils/password-policy';

@Component({
  selector: 'app-marketplace-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSnackBarModule, MatProgressSpinnerModule],
  template: `
    <div class="module-page active-page fade-up">
      <div class="filter-action-row">
        <div>
          <h2 style="margin:0;">Shift Marketplace</h2>
          <p style="margin:0;color:var(--txt-muted);font-size:0.8rem;">
            Bid on open shifts · awards are compliance-gated (overlap, leave, weekly-hours)
          </p>
        </div>
        <button class="ui-btn ui-btn-primary" (click)="load()" [disabled]="loading()">
          <mat-icon style="font-size:1.1rem;width:1.1rem;height:1.1rem;">refresh</mat-icon>
          {{ loading() ? 'Loading…' : 'Refresh' }}
        </button>
      </div>

      @if (loading() && !openShifts().length) {
        <div style="padding:4rem;text-align:center;"><mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner></div>
      } @else {
        <h3>Open shifts ({{ openShifts().length }})</h3>
        @if (!openShifts().length) {
          <div class="ui-card"><p style="color:var(--txt-muted);">No open shifts. Managers publish shifts from Scheduling.</p></div>
        }
        @for (s of openShifts(); track s.id) {
          <div class="ui-card" style="margin-bottom:1rem;">
            <div class="ui-card-header">
              <h3>{{ s.role || 'Shift' }} · {{ s.area || '' }} #{{ s.id }}</h3>
              <span class="ui-badge ui-badge-success">{{ s.status }}</span>
            </div>
            <p style="font-size:0.85rem;">{{ s.startTime | date:'short' }} → {{ s.endTime | date:'short' }}</p>
            @if (s.notes) { <p style="font-size:0.8rem;color:var(--txt-muted);">{{ s.notes }}</p> }
            <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
              <input class="f-input" [(ngModel)]="bidMsg[s.id]" placeholder="Message (optional)" style="max-width:260px;">
              <button class="ui-btn ui-btn-primary" (click)="bid(s.id)">Place bid</button>
              @if (isManager()) {
                <button class="ui-btn" (click)="toggleBids(s.id)">
                  {{ expandedShift() === s.id ? 'Hide bids' : 'View bids ({{ bidCount(s.id) }})' }}
                </button>
              }
            </div>
            @if (expandedShift() === s.id) {
              <table class="ui-table" style="margin-top:1rem;">
                <tr><th>Bid</th><th>Employee</th><th>Message</th><th>Status</th><th></th></tr>
                @for (b of bidsFor(s.id); track b.id) {
                  <tr>
                    <td>#{{ b.id }}</td><td>{{ b.employeeId }}</td>
                    <td>{{ b.message || '—' }}</td><td>{{ b.status }}</td>
                    <td>
                      @if (b.status === 'PENDING') {
                        <button class="ui-btn ui-btn-primary" (click)="accept(b.id)">Accept</button>
                      }
                    </td>
                  </tr>
                }
              </table>
            }
          </div>
        }

        <h3 style="margin-top:2rem;">My active bids ({{ myBids().length }})</h3>
        @for (b of myBids(); track b.id) {
          <div class="ui-card" style="margin-bottom:0.5rem;display:flex;gap:1rem;align-items:center;">
            <span>Shift #{{ b.shiftId }}</span><span>{{ b.status }}</span>
            <button class="ui-btn" (click)="withdraw(b.id)">Withdraw</button>
          </div>
        }

        <h3 style="margin-top:2rem;">Shift swaps ({{ swaps().length }})</h3>
        <div class="ui-card" style="margin-bottom:1rem;">
          <div class="ui-card-header"><h3>Request swap</h3><span class="ui-badge">peer accept → manager approve</span></div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
            <select class="f-input" [(ngModel)]="swapShiftId" style="max-width:220px;" [attr.aria-label]="'Shift to swap'">
              <option [ngValue]="null">Select my shift…</option>
              @for (s of myShifts(); track s.id) {
                <option [ngValue]="s.id">#{{ s.id }} · {{ s.startTime | date:'short' }}</option>
              }
            </select>
            <input class="f-input" type="number" [(ngModel)]="swapTarget" placeholder="Target employee (optional)" style="max-width:220px;">
            <button class="ui-btn ui-btn-primary" (click)="requestSwap()" [disabled]="!swapShiftId">Request swap</button>
          </div>
        </div>
        @for (sw of swaps(); track sw.id) {
          <div class="ui-card" style="margin-bottom:0.5rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap;">
            <span>Shift #{{ sw.originalShiftId }}</span><span>{{ sw.status }}</span>
            @if (sw.status === 'PENDING') {
              <button class="ui-btn" (click)="acceptSwap(sw.id)">Accept (peer)</button>
            }
            @if (sw.status === 'ACCEPTED' && isManager()) {
              <button class="ui-btn ui-btn-primary" (click)="approveSwap(sw.id)">Approve (manager)</button>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .ui-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .ui-table th, .ui-table td { padding: 0.6rem; border-bottom: 1px solid var(--border); text-align: left; }
  `]
})
export class MarketplacePageComponent implements OnInit {
  private readonly market = inject(MarketplaceService);
  private readonly sched = inject(SchedulingService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  protected readonly openShifts = signal<any[]>([]);
  protected readonly myBids = signal<ShiftBid[]>([]);
  protected readonly allBids = signal<ShiftBid[]>([]);
  protected readonly expandedShift = signal<number | null>(null);
  protected readonly loading = signal(false);
  protected bidMsg: Record<number, string> = {};

  protected readonly swaps = signal<ShiftSwapRequest[]>([]);
  protected readonly myShifts = signal<{ id: number; startTime: string }[]>([]);
  protected swapShiftId: number | null = null;
  protected swapTarget: number | null = null;

  protected readonly isManager = () => this.auth.hasAnyScope(['SCHEDULE_TEAM_WRITE', 'SCHEDULE_ORG_WRITE']);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.market.openShifts().subscribe({
      next: (shifts) => {
        this.openShifts.set(shifts);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.snack.open(backendErrorMessage(err, 'Marketplace unavailable.'), 'Dismiss', { duration: 5000 });
      }
    });
    this.market.myBids().subscribe({ next: (bids) => this.myBids.set(bids), error: () => undefined });
    this.sched.getSwaps().subscribe({ next: (sw) => this.swaps.set(sw), error: () => undefined });
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 14 * 86400000);
    this.sched.getShiftRange(start.toISOString(), end.toISOString()).subscribe({
      next: (shifts) => {
        const mine = this.auth.user()?.id;
        this.myShifts.set(shifts.filter((s) => mine == null || s.employeeId === mine).map((s) => ({ id: s.id, startTime: s.startTime })));
      },
      error: () => undefined
    });
  }

  requestSwap(): void {
    if (!this.swapShiftId) return;
    this.sched.requestSwap(this.swapShiftId, this.swapTarget).subscribe({
      next: () => {
        this.snack.open('Swap requested — peer accept, then manager approve.', 'OK', { duration: 4000 });
        this.swapShiftId = null; this.swapTarget = null;
        this.load();
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Swap request failed.'), 'Dismiss', { duration: 5000 })
    });
  }

  acceptSwap(id: number): void {
    this.sched.acceptSwap(id).subscribe({
      next: () => { this.snack.open('Swap accepted — awaiting manager approval.', 'OK', { duration: 3000 }); this.load(); },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Accept failed.'), 'Dismiss', { duration: 5000 })
    });
  }

  approveSwap(id: number): void {
    this.sched.approveSwap(id).subscribe({
      next: () => { this.snack.open('Swap approved — shifts reassigned.', 'OK', { duration: 3000 }); this.load(); },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Approve failed.'), 'Dismiss', { duration: 5000 })
    });
  }

  bid(shiftId: number): void {
    this.market.placeBid(shiftId, this.bidMsg[shiftId] || '').subscribe({
      next: () => {
        this.snack.open('Bid placed.', 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Bid failed.'), 'Dismiss', { duration: 5000 })
    });
  }

  toggleBids(shiftId: number): void {
    if (this.expandedShift() === shiftId) {
      this.expandedShift.set(null);
      return;
    }
    this.expandedShift.set(shiftId);
    this.market.bidsForShift(shiftId).subscribe({
      next: (bids) => this.allBids.set([...this.allBids().filter((b) => b.shiftId !== shiftId), ...bids]),
      error: (err) => this.snack.open(backendErrorMessage(err, 'Could not load bids.'), 'Dismiss', { duration: 5000 })
    });
  }

  bidsFor(shiftId: number): ShiftBid[] {
    return this.allBids().filter((b) => b.shiftId === shiftId);
  }

  bidCount(shiftId: number): number {
    return this.bidsFor(shiftId).length;
  }

  accept(bidId: number): void {
    this.market.acceptBid(bidId).subscribe({
      next: () => {
        this.snack.open('Bid accepted — shift assigned.', 'OK', { duration: 3000 });
        this.expandedShift.set(null);
        this.load();
      },
      error: (err) => this.snack.open(
        backendErrorMessage(err, 'Award blocked: winner conflicts with another shift, leave, or weekly-hours rule.'),
        'Dismiss',
        { duration: 7000 }
      )
    });
  }

  withdraw(bidId: number): void {
    this.market.withdrawBid(bidId).subscribe({
      next: () => {
        this.snack.open('Bid withdrawn.', 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Withdraw failed.'), 'Dismiss', { duration: 5000 })
    });
  }
}
