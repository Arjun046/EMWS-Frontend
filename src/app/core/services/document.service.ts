import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DocumentMetadata {
  id: number;
  title: string;
  description: string;
  employeeId: number;
  companyId: number;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadDate: string;
  status: string; // ACTIVE, ARCHIVED
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  getMyDocuments(): Observable<DocumentMetadata[]> {
    return this.api.get<DocumentMetadata[]>('/api/documents/me', [], this.baseUrl);
  }

  getCompanyDocuments(): Observable<DocumentMetadata[]> {
    return this.api.get<DocumentMetadata[]>('/api/documents/company', [], this.baseUrl);
  }

  uploadDocument(file: File, category: string): Observable<DocumentMetadata> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    return this.api.post<DocumentMetadata>('/api/documents/upload', formData, undefined, this.baseUrl);
  }

  downloadDocument(id: number): Observable<Blob> {
    return this.api.getBlob(`/api/documents/${id}/download`, this.baseUrl);
  }

  deleteDocument(id: number): Observable<void> {
    return this.api.delete<void>(`/api/documents/${id}`, undefined, this.baseUrl);
  }
}
