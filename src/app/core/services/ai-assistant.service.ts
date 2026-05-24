import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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

  constructor(private ngZone: NgZone) {}

  /**
   * Streams the AI response using Server-Sent Events (SSE).
   * This provides the "typing" effect where text appears incrementally.
   */
  streamReply(request: AiChatRequest): Observable<string> {
    return new Observable(observer => {
      const eventSource = new EventSource(`${this.baseUrl}/stream?message=${encodeURIComponent(request.message)}`);

      eventSource.onmessage = (event) => {
        this.ngZone.run(() => {
          try {
            const data: AiChatResponse = JSON.parse(event.data);
            if (data.message) {
              observer.next(data.message);
            }
          } catch (e) {
            console.error('Error parsing AI stream data', e);
          }
        });
      };

      eventSource.onerror = (error) => {
        this.ngZone.run(() => {
          observer.error(error);
          eventSource.close();
        });
      };

      return () => eventSource.close();
    });
  }
}
