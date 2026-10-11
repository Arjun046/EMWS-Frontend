import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DocumentService, DocumentMetadata } from '../../core/services/document.service';
import { AuthService } from '../../core/services/auth.service';
import { HasScopeDirective } from '../../core/directives/has-scope.directive';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith, finalize } from 'rxjs';

@Component({
  selector: 'app-documents-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatTooltipModule,
    ReactiveFormsModule,
    HasScopeDirective,
    PageHeaderComponent,
    DatePipe,
    DecimalPipe
  ],
  template: `
    <app-page-header
      title="Documents"
      subtitle="Company files, personal documents, and acknowledgment requests."
      [actionLabel]="canWriteDocs() ? 'Upload' : undefined"
      icon="cloud_upload"
      (action)="onUpload()"
    />

    <section class="documents-shell">
      @if (pendingAcks().length) {
        <div class="ui-card" style="border-left:4px solid var(--warning); margin-bottom:1rem;">
          <div class="ui-card-header"><h3>Awaiting my acknowledgment ({{ pendingAcks().length }})</h3></div>
          @for (r of pendingAcks(); track r.id) {
            <div style="display:flex;gap:0.75rem;align-items:center;padding:0.5rem 0;font-size:0.85rem;">
              <span style="flex:1;">Document #{{ r.documentMetadataId }} — requested {{ r.createdAt | date:'short' }}</span>
              <button mat-stroked-button color="primary" (click)="ack(r.id)">Acknowledge</button>
            </div>
          }
        </div>
      }
      <mat-tab-group class="enterprise-tabs">
        <!-- 1. PERSONAL VAULT -->
        <mat-tab>
          <ng-template mat-tab-label>
             <mat-icon class="mr-2">fingerprint</mat-icon> My Documents
          </ng-template>

          <div class="tab-content mt-6">
            <div class="directory-actions mb-6">
              <mat-form-field appearance="outline" class="search-field no-subscript">
                <mat-icon matPrefix>search</mat-icon>
                <input matInput [formControl]="searchControl" placeholder="Search documents…">
              </mat-form-field>
              <div class="spacer"></div>
              <button mat-stroked-button (click)="refresh()"><mat-icon>refresh</mat-icon> Refresh</button>
            </div>

            <div class="documents-grid">
              @if (isLoading()) {
                @for (i of [1,2,3,4]; track i) {
                  <div class="doc-card skeleton-pulse">
                    <div class="s-hero"></div>
                    <div class="s-body">
                      <div class="s-line-short"></div>
                      <div class="s-line-long"></div>
                    </div>
                  </div>
                }
              } @else {
                @for (doc of filteredDocuments(); track doc.id) {
                  <mat-card class="doc-card shadow-sm border-hover">
                    <div class="doc-type-hero" [class]="doc.fileType.toLowerCase()">
                      <mat-icon>{{ getIconForType(doc.fileType) }}</mat-icon>
                    </div>
                    <div class="doc-body">
                      <strong class="doc-title">{{ doc.fileName }}</strong>
                      <p class="doc-summary text-truncate">{{ doc.category }}</p>
                      <div class="doc-meta">
                        <span class="file-size">{{ doc.size / 1024 / 1024 | number:'1.1-1' }} MB</span>
                        <span class="dot">•</span>
                        <span class="file-type">{{ doc.fileType }}</span>
                      </div>
                    </div>
                    <mat-divider></mat-divider>
                    <div class="doc-footer">
                       <span class="date">{{ doc.uploadDate | date:'mediumDate' }}</span>
                       <div class="actions">
                          <button mat-icon-button color="primary" (click)="download(doc)" matTooltip="Download" aria-label="Download"><mat-icon>download</mat-icon></button>
                          <button mat-icon-button (click)="toggleVersions(doc.id)" matTooltip="Version history" aria-label="Version history"><mat-icon>history</mat-icon></button>
                          <button mat-icon-button color="warn" *ngIf="canDeleteDoc(doc)" (click)="deleteDoc(doc)" matTooltip="Delete" aria-label="Delete"><mat-icon>delete_outline</mat-icon></button>
                       </div>
                    </div>
                    @if (expandedDoc() === doc.id) {
                      <div style="padding:0.75rem 1.25rem;font-size:0.8rem;background:#f8fafc;">
                        @for (v of versions(); track v.id) {
                          <div>v{{ v.versionNumber }} · {{ v.createdAt | date:'short' }}</div>
                        }
                        @if (!versions().length) { <span style="color:#94a3b8;">No versions found.</span> }
                        <p style="color:#94a3b8;font-size:0.72rem;margin:0.5rem 0 0;">Re-upload the same filename to bump the version.</p>
                        @if (canWriteDocs()) {
                          <div style="display:flex;gap:0.5rem;margin-top:0.5rem;align-items:center;">
                            <input #ackEmp class="f-input" type="number" placeholder="Employee ID" style="width:130px;height:34px;">
                            <button mat-stroked-button (click)="requestAck(doc.id, +ackEmp.value)">Request ack</button>
                          </div>
                          @for (r of ackList(); track r.id) {
                            <div>{{ r.requestedForEmployeeId }} · {{ r.status }}{{ r.ackedAt ? ' · ' + (r.ackedAt | date:'short') : '' }}</div>
                          }
                        }
                      </div>
                    }
                  </mat-card>
                }
              }
            </div>
          </div>
        </mat-tab>

        <!-- 2. COMPANY VAULT (BE /company, TEAM/ORG_READ) -->
        <mat-tab *appHasScope="['DOCS_TEAM_READ', 'DOCS_ORG_READ', 'DOCS_WRITE']">
          <ng-template mat-tab-label>
             <mat-icon class="mr-2">auto_stories</mat-icon> Company Vault
          </ng-template>
          <div class="tab-content mt-6">
            @if (!companyDocs().length) {
              <div class="empty-state"><mat-icon>folder_open</mat-icon><p>No company documents yet.</p></div>
            }
            <div class="documents-grid">
              @for (doc of companyDocs(); track doc.id) {
                <mat-card class="doc-card shadow-sm border-hover">
                  <div class="doc-type-hero" [class]="doc.fileType.toLowerCase()">
                    <mat-icon>{{ getIconForType(doc.fileType) }}</mat-icon>
                  </div>
                  <div class="doc-body">
                    <strong class="doc-title">{{ doc.fileName }}</strong>
                    <p class="doc-summary text-truncate">{{ doc.category }}</p>
                  </div>
                  <mat-divider></mat-divider>
                  <div class="doc-footer">
                    <span class="date">{{ doc.uploadDate | date:'mediumDate' }}</span>
                    <div class="actions">
                      <button mat-icon-button color="primary" (click)="download(doc)" matTooltip="Download" aria-label="Download"><mat-icon>download</mat-icon></button>
                      <button mat-icon-button (click)="toggleVersions(doc.id)" matTooltip="Version history" aria-label="Version history"><mat-icon>history</mat-icon></button>
                    </div>
                  </div>
                  @if (expandedDoc() === doc.id) {
                    <div style="padding:0.75rem 1.25rem;font-size:0.8rem;">
                      @for (v of versions(); track v.id) {
                        <div>v{{ v.versionNumber }} · {{ v.createdAt | date:'short' }}</div>
                      }
                      @if (!versions().length) { <span style="color:#94a3b8;">No versions found.</span> }
                    </div>
                  }
                </mat-card>
              }
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </section>
  `,
  styles: [`
    .documents-shell { margin-top: 1.5rem; }
    .directory-actions { display: flex; align-items: center; gap: 1rem; }
    .search-field { width: 320px; }
    .no-subscript { margin-bottom: -1.25rem; }
    .spacer { flex: 1; }

    .documents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
    
    .doc-card { border-radius: 1.25rem; border: 1px solid #e2e8f0; overflow: hidden; padding: 0; background: #fff; display: flex; flex-direction: column; transition: all 0.2s; }
    .doc-card:hover { transform: translateY(-4px); border-color: #3b82f6; }
    
    .doc-type-hero { height: 100px; display: grid; place-items: center; background: #f8fafc; }
    .doc-type-hero mat-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; color: #94a3b8; }
    .doc-type-hero.pdf { background: #fef2f2; } .doc-type-hero.pdf mat-icon { color: #ef4444; }
    .doc-type-hero.docx { background: #eff6ff; } .doc-type-hero.docx mat-icon { color: #3b82f6; }
    
    .doc-body { padding: 1.25rem; flex: 1; }
    .doc-title { font-size: 0.95rem; font-weight: 700; color: #0f172a; display: block; margin-bottom: 0.4rem; }
    .doc-summary { font-size: 0.8rem; color: #64748b; line-height: 1.4; margin-bottom: 1rem; }
    .text-truncate { overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    
    .doc-meta { display: flex; align-items: center; gap: 0.5rem; font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
    .doc-footer { padding: 0.75rem 1.25rem; background: #f8fafc; display: flex; justify-content: space-between; align-items: center; }
    .doc-footer .date { font-size: 0.75rem; color: #64748b; font-weight: 600; }
    .doc-footer .actions { display: flex; gap: 0.25rem; }

    /* SKELETONS */
    .skeleton-pulse { opacity: 0.6; }
    .s-hero { height: 100px; background: #e2e8f0; }
    .s-body { padding: 1rem; }
    .s-line-short { height: 10px; width: 40%; background: #e2e8f0; border-radius: 4px; margin-bottom: 0.5rem; }
    .s-line-long { height: 8px; width: 80%; background: #f1f5f9; border-radius: 4px; }

    .mt-6 { margin-top: 1.5rem; } .mb-6 { margin-bottom: 1.5rem; } .mr-2 { margin-right: 0.5rem; }
    .empty-state { padding: 4rem; text-align: center; color: #94a3b8; }
    .empty-state mat-icon { font-size: 3rem; width: 3rem; height: 3rem; margin-bottom: 1rem; }
  `]
})
export class DocumentsPageComponent implements OnInit {
  private readonly docApi = inject(DocumentService);
  protected readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  protected readonly searchControl = new FormControl('');
  protected readonly isLoading = signal(true);
  protected readonly documents = signal<DocumentMetadata[]>([]);
  protected readonly companyDocs = signal<DocumentMetadata[]>([]);
  protected readonly expandedDoc = signal<number | null>(null);
  protected readonly versions = signal<{ id: number; versionNumber: number; createdAt: string }[]>([]);
  protected readonly pendingAcks = signal<import('../../core/services/document.service').AckRequest[]>([]);
  protected readonly ackList = signal<import('../../core/services/document.service').AckRequest[]>([]);
  private readonly searchQuery = toSignal(this.searchControl.valueChanges.pipe(startWith('')), { initialValue: '' });

  protected readonly filteredDocuments = computed(() => {
    const query = this.searchQuery()?.toLowerCase() || '';
    const all = this.documents();
    if (!query) return all;
    return all.filter(d => d.fileName.toLowerCase().includes(query) || d.category?.toLowerCase().includes(query));
  });

  ngOnInit() {
    this.refresh();
    this.docApi.getMyAckRequests().subscribe({
      next: (r) => this.pendingAcks.set((r ?? []).filter((x) => x.status === 'PENDING')),
      error: () => this.pendingAcks.set([])
    });
  }

  ack(requestId: number): void {
    this.docApi.acknowledge(requestId).subscribe({
      next: () => {
        this.snack.open('Acknowledged.', 'OK', { duration: 3000 });
        this.pendingAcks.set(this.pendingAcks().filter((r) => r.id !== requestId));
      },
      error: () => this.snack.open('Acknowledge failed.', 'Dismiss', { duration: 4000 })
    });
  }

  requestAck(docId: number, employeeId: number): void {
    if (!employeeId) return;
    this.docApi.requestAck(docId, employeeId).subscribe({
      next: () => {
        this.snack.open(`Ack requested from #${employeeId}.`, 'OK', { duration: 3000 });
        this.toggleVersions(docId, true);
      },
      error: () => this.snack.open('Request failed.', 'Dismiss', { duration: 4000 })
    });
  }

  refresh() {
    this.isLoading.set(true);
    this.docApi.getMyDocuments()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.documents.set(data ?? []),
        error: () => {
          this.documents.set([]);
          this.snack.open('Could not load documents. Please try again.', 'Dismiss', { duration: 5000 });
        }
      });
    if (this.auth.hasAnyScope(['DOCS_TEAM_READ', 'DOCS_ORG_READ'])) {
      this.docApi.getCompanyDocuments().subscribe({
        next: (d) => this.companyDocs.set(d ?? []),
        error: () => this.companyDocs.set([])
      });
    }
  }

  toggleVersions(id: number, forceOpen = false): void {
    if (this.expandedDoc() === id && !forceOpen) {
      this.expandedDoc.set(null);
      return;
    }
    this.expandedDoc.set(id);
    this.versions.set([]);
    this.ackList.set([]);
    this.docApi.getVersions(id).subscribe({
      next: (v) => this.versions.set(v ?? []),
      error: () => this.versions.set([])
    });
    this.docApi.getDocAckRequests(id).subscribe({
      next: (r) => this.ackList.set(r ?? []),
      error: () => this.ackList.set([])
    });
  }

  protected getIconForType(type: string): string {
    const t = type.toLowerCase();
    if (t.includes('pdf')) return 'picture_as_pdf';
    if (t.includes('doc')) return 'description';
    if (t.includes('xls')) return 'table_view';
    if (t.includes('png') || t.includes('jpg')) return 'image';
    return 'insert_drive_file';
  }

  protected canWriteDocs(): boolean {
    return this.auth.hasScope('DOCS_WRITE');
  }

  protected canDeleteDoc(doc: DocumentMetadata): boolean {
     // Can delete if admin OR if it's their own document and they have self-read/write
     return this.canWriteDocs() || doc.employeeId === this.auth.user()?.id;
  }

  protected onUpload(): void {
    if (!this.canWriteDocs()) {
      this.snack.open('You do not have permission to upload documents.', 'OK', { duration: 3000 });
      return;
    }
    // Real upload (BE POST /upload multipart; same filename bumps version).
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      this.docApi.uploadDocument(file, 'GENERAL').subscribe({
        next: () => {
          this.snack.open(`Uploaded ${file.name} (new version if it existed).`, 'OK', { duration: 4000 });
          this.refresh();
        },
        error: () => this.snack.open('Upload failed.', 'Dismiss', { duration: 4000 })
      });
    };
    input.click();
  }

  protected download(doc: DocumentMetadata) {
    this.docApi.downloadDocument(doc.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.fileName || 'document';
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.snack.open('Download restricted.', 'OK', { duration: 3000 })
    });
  }

  protected deleteDoc(doc: DocumentMetadata): void {
    if (!this.canDeleteDoc(doc)) {
      this.snack.open('You do not have permission to delete this document.', 'OK', { duration: 3000 });
      return;
    }
    if (confirm(`Delete document "${doc.fileName}"? This cannot be undone.`)) {
      this.docApi.deleteDocument(doc.id).subscribe({
        next: () => this.refresh(),
        error: () => this.snack.open('Could not delete document. Please try again.', 'Dismiss', { duration: 5000 })
      });
    }
  }
}
