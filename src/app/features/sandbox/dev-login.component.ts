import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dev-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f1f5f9; font-family: 'Segoe UI', sans-serif; padding: 20px;">
      <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); width: 100%; max-width: 400px; border: 1px solid #e2e8f0;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
           <div style="width: 32px; height: 32px; background: #2563eb; border-radius: 8px; color: white; display: grid; place-items: center; font-weight: 800; font-size: 14px;">EW</div>
           <h2 style="margin: 0; font-size: 18px; color: #0f172a;">Enterprise Dev Portal</h2>
        </div>

        <p style="font-size: 14px; color: #64748b; margin-bottom: 32px;">Enter an email address to simulate a workforce login session.</p>

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 8px; text-transform: uppercase;">Login Email</label>
          <input 
            type="email" 
            [(ngModel)]="email" 
            placeholder="e.g. dev@local.ws"
            style="width: 100%; height: 44px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 16px; font-size: 14px; outline: none; transition: border-color 0.2s;"
            (focus)="$any($event.target).style.borderColor = '#2563eb'"
            (blur)="$any($event.target).style.borderColor = '#cbd5e1'"
          >
        </div>

        <button 
          (click)="bypass()" 
          style="width: 100%; height: 44px; background: #0f172a; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: transform 0.1s;"
          onmousedown="this.style.transform='scale(0.98)'"
          onmouseup="this.style.transform='scale(1)'"
        >
          Enter Console
        </button>

        <div style="margin-top: 24px; padding: 12px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; font-size: 11px; color: #92400e; line-height: 1.5;">
          <strong>Sandbox Notice:</strong> This bypass tool sets session tokens locally and skips standard OAuth validation for rapid UI testing.
        </div>
      </div>
    </div>
  `
})
export class DevLoginComponent {
  protected email = 'dev@local.ws';

  bypass() {
    localStorage.setItem('ewms.auth.token', 'dev-bypass-token');
    localStorage.setItem('ewms.auth.user', JSON.stringify({
      id: 999,
      name: this.email.split('@')[0].toUpperCase(),
      email: this.email,
      role: 'ADMIN',
      avatar: this.email.substring(0, 2).toUpperCase()
    }));
    window.location.href = '/dashboard';
  }
}
