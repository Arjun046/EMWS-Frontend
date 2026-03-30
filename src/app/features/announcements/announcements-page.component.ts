import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AnnouncementService, Announcement } from '../../core/services/announcement.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

@Component({
  selector: 'app-announcements-page',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatDividerModule, MatChipsModule, MatDialogModule,
    PageHeaderComponent, DatePipe
  ],
  template: `
    <app-page-header
      title="Company Announcements"
      subtitle="Organization-wide bulletins, policy updates, and milestone celebrations."
      [actionLabel]="isAdminOrManager() ? 'Post Announcement' : ''"
      icon="campaign"
      (action)="openCreateDialog()"
    />

    <section class="announcements-shell">
      <div class="filter-row mb-4">
        <mat-chip-set>
          <mat-chip (click)="catFilter.set('ALL')" [highlighted]="catFilter() === 'ALL'">All</mat-chip>
          <mat-chip (click)="catFilter.set('URGENT')" [highlighted]="catFilter() === 'URGENT'">🔴 Urgent</mat-chip>
          <mat-chip (click)="catFilter.set('POLICY')" [highlighted]="catFilter() === 'POLICY'">📋 Policy</mat-chip>
          <mat-chip (click)="catFilter.set('EVENT')" [highlighted]="catFilter() === 'EVENT'">🎉 Events</mat-chip>
          <mat-chip (click)="catFilter.set('MILESTONE')" [highlighted]="catFilter() === 'MILESTONE'">🏆 Milestones</mat-chip>
        </mat-chip-set>
      </div>

      @if (isLoading()) {
        <div class="skeleton-feed">
          <mat-card class="skeleton-announcement" *ngFor="let i of [1,2,3]">
            <div class="skeleton-cell wide"></div>
            <div class="skeleton-cell" style="height:3rem;margin-top:0.75rem"></div>
            <div class="skeleton-cell narrow" style="margin-top:0.5rem"></div>
          </mat-card>
        </div>
      } @else {
        <!-- Pinned -->
        @if (pinnedAnnouncements().length > 0) {
          <div class="pinned-section">
            <h3 class="section-label"><mat-icon>push_pin</mat-icon> Pinned</h3>
            <div class="announcements-feed">
              @for (item of pinnedAnnouncements(); track item.id) {
                <mat-card class="announcement-card pinned">
                  <div class="card-top">
                    <div class="ann-meta">
                      <span class="category-chip" [class]="item.category.toLowerCase()">{{ getCategoryLabel(item.category) }}</span>
                      <span class="pin-badge"><mat-icon>push_pin</mat-icon> Pinned</span>
                    </div>
                    @if (isAdminOrManager()) {
                      <button mat-icon-button (click)="unpin(item)"><mat-icon>close</mat-icon></button>
                    }
                  </div>
                  <h2 class="ann-title">{{ item.title }}</h2>
                  <p class="ann-content">{{ item.content }}</p>
                  <mat-divider></mat-divider>
                  <div class="ann-footer">
                    <span class="ann-author"><mat-icon>person</mat-icon> {{ item.authorName }}</span>
                    <span class="ann-date">{{ item.publishedAt | date:'medium' }}</span>
                  </div>
                </mat-card>
              }
            </div>
          </div>
        }

        <!-- Feed -->
        <div class="announcements-feed mt-4">
          @for (item of filteredAnnouncements(); track item.id) {
            <mat-card class="announcement-card" [class.is-urgent]="item.category === 'URGENT'">
              <div class="card-top">
                <div class="ann-meta">
                  <span class="category-chip" [class]="item.category.toLowerCase()">{{ getCategoryLabel(item.category) }}</span>
                </div>
                @if (isAdminOrManager()) {
                  <div class="admin-actions">
                    <button mat-icon-button title="Pin" (click)="pin(item)"><mat-icon>push_pin</mat-icon></button>
                    <button mat-icon-button title="Delete" color="warn" (click)="deleteAnn(item)"><mat-icon>delete_outline</mat-icon></button>
                  </div>
                }
              </div>
              <h2 class="ann-title">{{ item.title }}</h2>
              <p class="ann-content">{{ item.content }}</p>
              <mat-divider></mat-divider>
              <div class="ann-footer">
                <span class="ann-author"><mat-icon>person</mat-icon> {{ item.authorName }}</span>
                <span class="ann-date">{{ item.publishedAt | date:'medium' }}</span>
              </div>
            </mat-card>
          } @empty {
            <mat-card class="empty-card">
              <mat-icon>campaign</mat-icon>
              <h4>No announcements</h4>
              <p>{{ catFilter() === 'ALL' ? 'There are no company announcements at the moment.' : 'No announcements match the selected filter.' }}</p>
            </mat-card>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .announcements-shell { margin-top: 1.5rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mt-4 { margin-top: 1rem; }

    .section-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem; }
    .section-label mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }

    .announcements-feed { display: grid; gap: 1.25rem; }

    .announcement-card { padding: 2rem; border-radius: 1.5rem; border: 1px solid #e2e8f0; box-shadow: none !important; transition: all 0.2s; }
    .announcement-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.04) !important; }
    .announcement-card.pinned { background: #fffbeb; border-color: #fde68a; }
    .announcement-card.is-urgent { border-left: 5px solid #ef4444; background: #fef2f2; }

    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .ann-meta { display: flex; align-items: center; gap: 0.75rem; }
    .category-chip { font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 6px; text-transform: uppercase; }
    .category-chip.general { background: #f1f5f9; color: #475569; }
    .category-chip.policy { background: #eff6ff; color: #1d4ed8; }
    .category-chip.event { background: #f0fdf4; color: #166534; }
    .category-chip.urgent { background: #fef2f2; color: #dc2626; }
    .category-chip.milestone { background: #faf5ff; color: #7c3aed; }
    .pin-badge { display: flex; align-items: center; gap: 0.25rem; font-size: 0.65rem; font-weight: 800; color: #d97706; text-transform: uppercase; }
    .pin-badge mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }

    .admin-actions { display: flex; gap: 0.25rem; }

    .ann-title { margin: 0 0 0.75rem; font-size: 1.3rem; font-weight: 800; color: #0f172a; }
    .ann-content { margin: 0 0 1.5rem; font-size: 1rem; color: #475569; line-height: 1.7; white-space: pre-line; }

    .ann-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; }
    .ann-author { display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; font-weight: 600; color: #64748b; }
    .ann-author mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .ann-date { font-size: 0.8rem; color: #94a3b8; }

    .empty-card { padding: 5rem 2rem; text-align: center; color: #94a3b8; border: 1px dashed #e2e8f0 !important; background: transparent !important; box-shadow: none !important; border-radius: 1.5rem; }
    .empty-card mat-icon { font-size: 4rem; width: 4rem; height: 4rem; margin-bottom: 1rem; opacity: 0.4; }
    .empty-card h4 { margin: 0 0 0.5rem; color: #64748b; font-weight: 700; }
    .empty-card p { margin: 0; max-width: 24rem; margin-inline: auto; }

    /* Skeleton */
    .skeleton-feed { display: grid; gap: 1.25rem; }
    .skeleton-announcement { padding: 2rem; border-radius: 1.5rem; border: 1px solid #e2e8f0; }
    .skeleton-cell { height: 1rem; border-radius: 0.5rem; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    .skeleton-cell.wide { width: 60%; }
    .skeleton-cell.narrow { width: 30%; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    @media (max-width: 768px) {
      .announcement-card { padding: 1.25rem; }
      .ann-title { font-size: 1.1rem; }
    }
  `]
})
export class AnnouncementsPageComponent implements OnInit {
  private readonly announcementApi = inject(AnnouncementService);
  protected readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly isLoading = signal(false);
  protected readonly announcements = signal<Announcement[]>([]);
  protected readonly catFilter = signal<string>('ALL');

  protected readonly pinnedAnnouncements = computed(() =>
    this.announcements().filter(a => a.isPinned)
  );

  protected readonly filteredAnnouncements = computed(() => {
    const filter = this.catFilter();
    const all = this.announcements().filter(a => !a.isPinned);
    if (filter === 'ALL') return all;
    return all.filter(a => a.category === filter);
  });

  ngOnInit(): void {
    this.loadData();
  }

  protected isAdminOrManager(): boolean {
    const role = this.auth.user()?.role;
    return role === 'ADMIN' || role === 'MANAGER';
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.announcementApi.getAnnouncements().subscribe({
      next: (data) => {
        this.announcements.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snack.open('Unable to load announcements.', 'OK', { duration: 3000 });
      }
    });
  }

  protected getCategoryLabel(cat: string): string {
    const map: Record<string, string> = {
      GENERAL: '📢 General', POLICY: '📋 Policy', EVENT: '🎉 Event',
      URGENT: '🔴 Urgent', MILESTONE: '🏆 Milestone'
    };
    return map[cat] || cat;
  }

  protected pin(item: Announcement): void {
    this.announcementApi.pinAnnouncement(item.id, true).subscribe({
      next: () => { this.snack.open('Announcement pinned.', 'OK', { duration: 2000 }); this.loadData(); },
      error: () => this.snack.open('Failed to pin announcement.', 'OK', { duration: 3000 })
    });
  }

  protected unpin(item: Announcement): void {
    this.announcementApi.pinAnnouncement(item.id, false).subscribe({
      next: () => { this.snack.open('Announcement unpinned.', 'OK', { duration: 2000 }); this.loadData(); },
      error: () => this.snack.open('Failed to unpin announcement.', 'OK', { duration: 3000 })
    });
  }

  protected deleteAnn(item: Announcement): void {
    if (confirm(`Remove announcement "${item.title}"?`)) {
      this.announcementApi.deleteAnnouncement(item.id).subscribe({
        next: () => { this.snack.open('Announcement removed.', 'OK', { duration: 2000 }); this.loadData(); },
        error: () => this.snack.open('Failed to delete announcement.', 'OK', { duration: 3000 })
      });
    }
  }

  protected openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateAnnouncementDialog, { width: '600px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snack.open('Announcement published to the entire organization.', 'OK', { duration: 4000 });
        this.loadData();
      }
    });
  }
}

@Component({
  selector: 'app-create-announcement-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Publish Announcement</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="ann-form">
        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <mat-select formControlName="category">
            <mat-option value="GENERAL">General</mat-option>
            <mat-option value="POLICY">Policy Update</mat-option>
            <mat-option value="EVENT">Event</mat-option>
            <mat-option value="URGENT">Urgent</mat-option>
            <mat-option value="MILESTONE">Milestone</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Title</mat-label>
          <input matInput formControlName="title" placeholder="Announcement headline">
          <mat-error>Title is required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Content</mat-label>
          <textarea matInput formControlName="content" rows="6" placeholder="Write your announcement here..."></textarea>
          <mat-error>Content is required</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid || isSaving()" (click)="save()">
        {{ isSaving() ? 'Publishing...' : 'Publish' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.ann-form { display: grid; gap: 0.75rem; margin-top: 0.5rem; }`]
})
export class CreateAnnouncementDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly dialogRef = inject(MatDialogRef<CreateAnnouncementDialog>);
  private readonly announcementApi = inject(AnnouncementService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group({
    category: ['GENERAL', Validators.required],
    title: ['', [Validators.required, Validators.minLength(3)]],
    content: ['', [Validators.required, Validators.minLength(10)]]
  });

  save(): void {
    this.isSaving.set(true);
    const raw = this.form.getRawValue();
    this.announcementApi.createAnnouncement({
      ...raw as any,
      authorId: this.auth.user()?.id || 1,
      authorName: this.auth.user()?.name || 'System'
    }).subscribe({
      next: () => { this.isSaving.set(false); this.dialogRef.close(true); },
      error: () => { this.isSaving.set(false); this.snack.open('Failed to publish.', 'OK', { duration: 3000 }); }
    });
  }
}
