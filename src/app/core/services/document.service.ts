import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface DocumentMetadata {
  id: number;
  title: string;
  description: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadDate: string;
  status: string; // ACTIVE, ARCHIVED
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly baseUrl = 'http://localhost:8080';
  constructor(private readonly api: ApiService) {}

  getDocuments(): Observable<DocumentMetadata[]> {
    return this.api.get<DocumentMetadata[]>('/api/documents/metadata', [], this.baseUrl);
  }

  getEmployeeDocuments(employeeId: number): Observable<DocumentMetadata[]> {
    return this.api.get<DocumentMetadata[]>(`/api/documents/metadata/employee/${employeeId}`, [], this.baseUrl);
  }

  uploadDocument(doc: Partial<DocumentMetadata>): Observable<DocumentMetadata> {
    return this.api.post<DocumentMetadata>('/api/documents/metadata', doc, undefined, this.baseUrl);
  }

  deleteDocument(id: number): Observable<void> {
    return this.api.delete<void>(`/api/documents/metadata/${id}`, undefined, this.baseUrl);
  }
}
