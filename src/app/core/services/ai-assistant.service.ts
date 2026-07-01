import { Injectable, NgZone, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';

export interface AiChatRequest {
  message: string;
  conversationId?: string;
  context?: any;
}

export interface AiChatResponse {
  message: string;
  isError: boolean;
}

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/ai`;
  private readonly api = inject(ApiService);

  constructor(private ngZone: NgZone) {}

  /**
   * Streams the AI response using Server-Sent Events (SSE).
   * This provides the "typing" effect where text appears incrementally.
   */
  streamReply(request: AiChatRequest): Observable<string> {
    return new Observable(observer => {
      const url = `${this.baseUrl}/stream?message=${encodeURIComponent(request.message)}`;
      const token = localStorage.getItem('ewms.auth.token');
      
      const controller = new AbortController();
      
      fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'text/event-stream'
        },
        signal: controller.signal
      }).then(async response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        
        if (!reader) throw new Error("No reader");
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          console.debug('[AiAssistant] Received stream chunk:', chunk);
          
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data:')) {
              const dataStr = trimmedLine.replace('data:', '').trim();
              if (dataStr) {
                this.ngZone.run(() => {
                  try {
                    const data: any = JSON.parse(dataStr);
                    // ServerSentEvent mapping often nests the payload
                    const aiContent = data.content || data.message || (data.data ? data.data.message : null);
                    if (aiContent) {
                        observer.next(aiContent);
                    }
                  } catch (e) {
                    console.error('[AiAssistant] Error parsing stream JSON', e, 'Data:', dataStr);
                  }
                });
              }
            }
          }
        }
        observer.complete();
      }).catch(error => {
        this.ngZone.run(() => observer.error(error));
      });

      return () => controller.abort();
    });
  }

  extractTask(text: string): Observable<any> {
    return this.api.post<any>(`${this.baseUrl}/extract-task`, { text });
  }

  generateHandover(messages: string[], tasks: string[]): Observable<any> {
    return this.api.post<any>(`${this.baseUrl}/shift-handover`, { messages, tasks });
  }

  checkCompliance(text: string): Observable<any> {
    return this.api.post<any>(`${this.baseUrl}/compliance-check`, { text });
  }

  analyzeIntelligence(text: string): Observable<any> {
    return this.api.post<any>(`${this.baseUrl}/analyze-intelligence`, { text });
  }
}
