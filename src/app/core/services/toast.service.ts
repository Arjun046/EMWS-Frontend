import { Injectable, signal } from '@angular/core';

export type ToastSeverity = 'success' | 'info' | 'warning' | 'danger';

export interface Toast {
  id: number;
  message: string;
  severity: ToastSeverity;
  icon: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private nextId = 0;
  toasts = signal<Toast[]>([]);

  show(message: string, severity: ToastSeverity = 'info') {
    const icon = this.getIcon(severity);
    const id = this.nextId++;
    const toast = { id, message, severity, icon };
    
    this.toasts.update(t => [...t, toast]);

    setTimeout(() => {
      this.remove(id);
    }, 3000);
  }

  private remove(id: number) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }

  private getIcon(severity: ToastSeverity): string {
    switch (severity) {
      case 'success': return 'check_circle';
      case 'warning': return 'warning';
      case 'danger': return 'error';
      default: return 'info';
    }
  }
}
