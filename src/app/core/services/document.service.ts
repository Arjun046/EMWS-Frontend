import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Mirrors BE DocumentMetadata (fileName/size/category — no title/description). */
export interface DocumentMetadata {
  id: number;
  fileName: string;
  fileType: string;
  size: number;
  uploadedBy: string;
  uploadDate: string;
  employeeId: number;
  companyId: number;
  expiryDate?: string;
  category: string;
  filePath?: string;
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

  /** BE: GET /{id}/versions — re-uploading the same filename bumps the version (see uploadDocument). */
  getVersions(id: number): Observable<{ id: number; versionNumber: number; createdAt: string }[]> {
    return this.api.get<{ id: number; versionNumber: number; createdAt: string }[]>(
      `/api/documents/${id}/versions`, [], this.baseUrl
    );
  }

  /** Ack workflow: writer requests, employee acknowledges. */
  requestAck(docId: number, employeeId: number): Observable<AckRequest> {
    return this.api.post<AckRequest>(`/api/documents/${docId}/ack-request`, { employeeId }, undefined, this.baseUrl);
  }

  getDocAckRequests(docId: number): Observable<AckRequest[]> {
    return this.api.get<AckRequest[]>(`/api/documents/${docId}/ack-requests`, [], this.baseUrl);
  }

  getMyAckRequests(): Observable<AckRequest[]> {
    return this.api.get<AckRequest[]>('/api/documents/ack-requests/me', [], this.baseUrl);
  }

  acknowledge(requestId: number): Observable<AckRequest> {
    return this.api.post<AckRequest>(`/api/documents/ack-requests/${requestId}/ack`, {}, undefined, this.baseUrl);
  }

  deleteDocument(id: number): Observable<void> {
    return this.api.delete<void>(`/api/documents/${id}`, undefined, this.baseUrl);
  }
}

export interface AckRequest {
  id: number;
  documentMetadataId: number;
  requestedForEmployeeId: number;
  requestedByUserId?: number;
  status: string;
  createdAt?: string;
  ackedAt?: string;
}
