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
      title="Intelligence & Document Vault" 
      subtitle="Secure gateway for corporate knowledge, personnel digital twins, and operational certifications." 
      [actionLabel]="canWriteDocs() ? 'Upload Asset' : undefined"
      icon="cloud_upload"
      (action)="onUpload()"
    />

    <section class="documents-shell">
      <mat-tab-group class="enterprise-tabs">
        <!-- 1. PERSONAL VAULT -->
        <mat-tab>
          <ng-template mat-tab-label>
             <mat-icon class="mr-2">fingerprint</mat-icon> My Digital Vault
          </ng-template>
          
          <div class="tab-content mt-6">
            <div class="directory-actions mb-6">
              <mat-form-field appearance="outline" class="search-field no-subscript">
                <mat-icon matPrefix>search</mat-icon>
                <input matInput [formControl]="searchControl" placeholder="Filter my assets...">
              </mat-form-field>
              <div class="spacer"></div>
              <button mat-stroked-button (click)="refresh()"><mat-icon>refresh</mat-icon> Sync Vault</button>
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
                      <strong class="doc-title">{{ doc.title }}</strong>
                      <p class="doc-summary text-truncate">{{ doc.description }}</p>
                      <div class="doc-meta">
                        <span class="file-size">{{ doc.fileSize / 1024 / 1024 | number:'1.1-1' }} MB</span>
                        <span class="dot">•</span>
                        <span class="file-type">{{ doc.fileType }}</span>
                      </div>
                    </div>
                    <mat-divider></mat-divider>
                    <div class="doc-footer">
                       <span class="date">{{ doc.uploadDate | date:'mediumDate' }}</span>
                       <div class="actions">
                          <button mat-icon-button color="primary" (click)="download(doc)" matTooltip="Secure Download"><mat-icon>download</mat-icon></button>
                          <button mat-icon-button color="warn" *ngIf="canDeleteDoc(doc)" (click)="deleteDoc(doc)" matTooltip="Archive Asset"><mat-icon>delete_outline</mat-icon></button>
                       </div>
                    </div>
                  </mat-card>
                }
              }
            </div>
          </div>
        </mat-tab>

        <!-- 2. CORPORATE KNOWLEDGE -->
        <mat-tab *appHasScope="['DOCS_TEAM_READ', 'DOCS_WRITE']">
          <ng-template mat-tab-label>
             <mat-icon class="mr-2">auto_stories</mat-icon> Knowledge Base
          </ng-template>
          <div class="tab-content mt-6">
             <div class="empty-state">
                <mat-icon>lock</mat-icon>
                <p>Company-wide knowledge management implementation in progress.</p>
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
  private readonly searchQuery = toSignal(this.searchControl.valueChanges.pipe(startWith('')), { initialValue: '' });

  protected readonly filteredDocuments = computed(() => {
    const query = this.searchQuery()?.toLowerCase() || '';
    const all = this.documents();
    if (!query) return all;
    return all.filter(d => d.title.toLowerCase().includes(query) || d.description?.toLowerCase().includes(query));
  });

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.isLoading.set(true);
    this.docApi.getMyDocuments()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(data => this.documents.set(data));
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
    this.snack.open('Upload functionality available in the employee portal.', 'OK', { duration: 3000 });
  }

  protected download(doc: DocumentMetadata) {
    this.docApi.downloadDocument(doc.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.title || 'document';
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
    if (confirm(`Archive document "${doc.title}"?`)) {
      this.docApi.deleteDocument(doc.id).subscribe(() => this.refresh());
    }
  }
}
