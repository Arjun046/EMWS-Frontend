import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DocumentService, DocumentMetadata } from '../../core/services/document.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';

@Component({
  selector: 'app-documents-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    DatePipe,
    DecimalPipe
  ],
  template: `
    <app-page-header 
      title="Knowledge & Document Center" 
      subtitle="Access corporate policies, training materials, and employee-specific digital assets." 
      actionLabel="Upload Asset"
      (action)="onUpload()"
    />

    <section class="documents-shell">
      <div class="directory-actions">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search enterprise assets...</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [formControl]="searchControl" placeholder="Search by title, category or format">
        </mat-form-field>
      </div>

      <div class="documents-grid mt-4">
        @for (doc of filteredDocuments(); track doc.id) {
          <mat-card class="document-card">
            <div class="doc-icon-box" [class]="doc.fileType.toLowerCase()">
              <mat-icon>{{ getIconForType(doc.fileType) }}</mat-icon>
            </div>
            <div class="doc-content">
              <strong>{{ doc.title }}</strong>
              <p class="doc-desc">{{ doc.description }}</p>
              <div class="doc-meta">
                <span>{{ doc.fileType }}</span>
                <span class="dot">•</span>
                <span>{{ doc.fileSize / 1024 / 1024 | number:'1.1-1' }} MB</span>
              </div>
            </div>
            <mat-divider></mat-divider>
            <div class="doc-footer">
              <span class="upload-date">Added {{ doc.uploadDate | date:'mediumDate' }}</span>
              <div class="footer-actions">
                <button mat-icon-button color="primary" title="Download"><mat-icon>download</mat-icon></button>
                <button mat-icon-button color="warn" title="Delete" (click)="deleteDoc(doc)"><mat-icon>delete_outline</mat-icon></button>
              </div>
            </div>
          </mat-card>
        }
        @if (filteredDocuments().length === 0) {
          <div class="empty-state">
            <mat-icon>folder_open</mat-icon>
            <p>No documents match your search criteria.</p>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .documents-shell { margin-top: 1.5rem; }
    .directory-actions { display: flex; align-items: center; margin-bottom: 1.5rem; }
    .search-field { flex: 1; max-width: 500px; }
    ::ng-deep .search-field .mat-mdc-form-field-subscript-wrapper { display: none; }

    .documents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
    
    .document-card { border-radius: 1.2rem; border: 1px solid #e2e8f0; padding: 0; overflow: hidden; display: flex; flex-direction: column; }
    
    .doc-icon-box { height: 120px; background: #f8fafc; display: grid; place-items: center; }
    .doc-icon-box mat-icon { font-size: 3rem; width: 3rem; height: 3rem; color: #94a3b8; }
    .doc-icon-box.pdf { background: #fef2f2; }
    .doc-icon-box.pdf mat-icon { color: #ef4444; }
    .doc-icon-box.docx { background: #eff6ff; }
    .doc-icon-box.docx mat-icon { color: #3b82f6; }
    
    .doc-content { padding: 1.25rem; flex: 1; }
    .doc-content strong { display: block; font-size: 1rem; color: #0f172a; margin-bottom: 0.5rem; }
    .doc-desc { font-size: 0.85rem; color: #64748b; line-height: 1.5; margin: 0 0 1rem; height: 2.5rem; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    
    .doc-meta { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
    .doc-meta .dot { font-size: 1.2rem; line-height: 1; }

    .doc-footer { padding: 0.75rem 1.25rem; background: #f8fafc; display: flex; justify-content: space-between; align-items: center; }
    .upload-date { font-size: 0.75rem; color: #64748b; font-weight: 500; }
    .footer-actions { display: flex; gap: 0.25rem; }

    .empty-state { grid-column: 1 / -1; padding: 5rem; text-align: center; color: #94a3b8; }
    .empty-state mat-icon { font-size: 4rem; width: 4rem; height: 4rem; margin-bottom: 1rem; opacity: 0.5; }

    @media (max-width: 640px) {
      .documents-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class DocumentsPageComponent {
  private readonly docApi = inject(DocumentService);
  private readonly snack = inject(MatSnackBar);

  protected readonly searchControl = new FormControl('');
  protected readonly documents = toSignal(this.docApi.getDocuments(), { initialValue: [] });
  private readonly searchQuery = toSignal(this.searchControl.valueChanges.pipe(startWith('')), { initialValue: '' });

  protected readonly filteredDocuments = computed(() => {
    const query = this.searchQuery()?.toLowerCase() || '';
    const all = this.documents();
    if (!query) return all;
    return all.filter(d => d.title.toLowerCase().includes(query) || d.description?.toLowerCase().includes(query));
  });

  protected getIconForType(type: string): string {
    const t = type.toLowerCase();
    if (t.includes('pdf')) return 'picture_as_pdf';
    if (t.includes('doc')) return 'description';
    if (t.includes('xls')) return 'table_view';
    if (t.includes('png') || t.includes('jpg')) return 'image';
    return 'insert_drive_file';
  }

  protected onUpload(): void {
    this.snack.open('Upload functionality is coming in the next sprint.', 'OK', { duration: 3000 });
  }

  protected deleteDoc(doc: DocumentMetadata): void {
    if (confirm(`Archive document "${doc.title}"?`)) {
      this.docApi.deleteDocument(doc.id).subscribe(() => window.location.reload());
    }
  }
}
