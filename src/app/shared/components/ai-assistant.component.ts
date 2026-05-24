import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { AuthService } from '../../core/services/auth.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatCardModule, MatFormFieldModule, MatInputModule, MatTooltipModule, MatDividerModule],
  template: `
    @if (canQueryAi()) {
      <div class="intel-orb-float-box" [class.is-panel-open]="isOpen()">

        <!-- NEURAL INTERACTIVE ORB -->
        <button class="neural-interactive-orb" (click)="toggleChat()" [class.active-orb]="isOpen()">  
          <mat-icon id="orbCenterIcon">{{ isOpen() ? 'close' : 'psychology' }}</mat-icon>
          <div class="orb-pulse-scanner-ring"></div>
        </button>

        <!-- AI ASSISTANT SIDE PANEL -->
        @if (isOpen()) {
          <div class="ai-assistant-side-panel active-panel">
            <header class="ai-panel-header">
              <div class="ai-brand-titles-wrap">
                <div class="ai-brand-orb"><mat-icon style="font-size: 18px; width:18px; height:18px;">auto_awesome</mat-icon></div>
                <div class="ai-brand-meta">
                  <strong class="text-mono">EWMS_INTEL_CORE_v4</strong>
                  <span class="text-mono">NEURAL_LINK_ACTIVE</span>
                </div>
              </div>
              <button mat-icon-button (click)="clearChat()" style="color: var(--txt-muted);" matTooltip="Purge Context">
                <mat-icon>delete_sweep</mat-icon>
              </button>
            </header>

            <div class="ai-messages-logs-area custom-scrollbar" #scrollContainer>
              @for (msg of messages(); track msg) {
                <div class="ai-bubble-row" [class]="msg.role === 'user' ? 'user' : 'system'">
                  <div class="ai-bubble-card">
                    @if (msg.role === 'assistant') {
                      <span class="ai-bubble-sys-header">SYSTEM_CORE</span>
                    }
                    {{ msg.content }}
                  </div>
                </div>
              }
              @if (isTyping()) {
                <div class="ai-bubble-row system">
                  <div class="ai-bubble-card">
                    <span class="ai-bubble-sys-header">PROCESSING_QUERY</span>
                    <div class="typing-dots"><span></span><span></span><span></span></div>
                  </div>
                </div>
              }
            </div>

            <footer class="ai-panel-footer">
              <div class="ai-input-wrapper">
                 <input
                   [(ngModel)]="userInput"
                   (keyup.enter)="sendMessage()"
                   placeholder="Query the workforce intelligence core..."
                   [disabled]="isTyping()"
                 >
                 <button mat-icon-button class="btn-query" [disabled]="!userInput.trim() || isTyping()" (click)="sendMessage()">
                   <mat-icon style="color: var(--primary);">bolt</mat-icon>
                 </button>
              </div>
              <p class="ai-disclaimer text-mono">INPUT_SENSITIVE_DATA_RESTRICTED</p>
            </footer>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .intel-orb-float-box { position: fixed; bottom: 2.25rem; right: 2.25rem; z-index: 9999; }

    .neural-interactive-orb {
      width: 56px; height: 56px; border-radius: 50%; background: #0f172a; color: #ffffff;
      border: none; cursor: pointer; display: grid; place-items: center; box-shadow: var(--shadow-lg);
      transition: all 0.3s var(--ease); position: relative;
    }
    body.global-dark-mode .neural-interactive-orb { background: var(--primary); }
    .neural-interactive-orb:hover { transform: scale(1.05); box-shadow: 0 0 20px rgba(47, 111, 235, 0.4); }
    .neural-interactive-orb.active-orb { background: var(--danger); transform: rotate(90deg); }

    .orb-pulse-scanner-ring {
      position: absolute; inset: -4px; border: 2px solid var(--primary); border-radius: 50%; opacity: 0.2;
      animation: rotateRing 6s linear infinite;
    }
    @keyframes rotateRing { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .ai-assistant-side-panel {
      position: absolute; bottom: 4.75rem; right: 0; width: 360px; height: 520px;
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg); display: flex; flex-direction: column; overflow: hidden; z-index: 9999;
      animation: sideReveal 0.3s var(--ease) both;
    }
    @keyframes sideReveal { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    .ai-panel-header { padding: 1rem 1.25rem; background: var(--surface-2); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .ai-brand-titles-wrap { display: flex; align-items: center; gap: 0.6rem; }
    .ai-brand-orb { width: 28px; height: 28px; background: #0f172a; color: var(--primary); border-radius: 6px; display: grid; place-items: center; }
    .ai-brand-meta strong { display: block; font-size: 0.72rem; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em; }
    .ai-brand-meta span { font-size: 0.58rem; font-weight: 800; color: var(--success); font-family: 'JetBrains Mono', monospace; }

    .ai-messages-logs-area { flex: 1; padding: 1.25rem; overflow-y: auto; background: var(--bg); display: flex; flex-direction: column; gap: 1rem; }
    .ai-bubble-row { display: flex; width: 100%; }
    .ai-bubble-row.user { justify-content: flex-end; }
    .ai-bubble-row.system { justify-content: flex-start; }

    .ai-bubble-card {
      max-width: 85%; padding: 0.8rem 1rem; border-radius: var(--radius-sm); font-size: 0.82rem;
      line-height: 1.45; border: 1px solid var(--border); background: var(--surface); color: var(--txt-main);
    }
    .ai-bubble-row.user .ai-bubble-card { background: #0f172a; color: #ffffff; border: none; border-bottom-right-radius: 2px; }
    body.global-dark-mode .ai-bubble-row.user .ai-bubble-card { background: var(--primary); }
    .ai-bubble-row.system .ai-bubble-card { background: var(--surface-2); border-bottom-left-radius: 2px; }

    .ai-bubble-sys-header { font-family: 'JetBrains Mono', monospace; font-size: 0.55rem; font-weight: 800; color: var(--primary); margin-bottom: 0.35rem; letter-spacing: 0.08em; display: block; }

    .ai-panel-footer { padding: 1.15rem; background: var(--surface); border-top: 1px solid var(--border); }
    .ai-input-wrapper { display: flex; align-items: center; gap: 0.5rem; background: var(--bg); padding: 0.35rem 0.5rem 0.35rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border); }
    .ai-input-wrapper input { border: none; outline: none; background: transparent; flex: 1; font-size: 0.8rem; font-family: inherit; color: var(--txt-main); }
    
    .ai-disclaimer { font-size: 0.55rem; color: var(--txt-muted); text-align: center; margin-top: 0.75rem; letter-spacing: 0.05em; }

    .typing-dots { display: flex; gap: 4px; padding: 4px 0; }
    .typing-dots span { width: 4px; height: 4px; background: var(--primary); border-radius: 50%; animation: intel-bounce 1.4s infinite; }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes intel-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.3; } 40% { transform: translateY(-4px); opacity: 1; } }
  `]
})
export class AiAssistantComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  private readonly aiApi = inject(AiAssistantService);
  protected readonly auth = inject(AuthService);

  protected readonly isOpen = signal(false);
  protected readonly isTyping = signal(false);
  protected readonly messages = signal<ChatMessage[]>([
    { role: 'assistant', content: 'INTEL_CORE_ONLINE. Ready for operational inquiry.' }
  ]);

  protected userInput = '';

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen.update(v => !v);
  }

  clearChat() {
    this.messages.set([{ role: 'assistant', content: 'CONTEXT_PURGED. Core re-initialized.' }]);
  }

  protected canQueryAi(): boolean {
    return this.auth.hasAnyScope(['AI_QUERY_SELF', 'AI_QUERY_ORG']);
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isTyping()) return;

    const userText = this.userInput;
    this.userInput = '';

    this.messages.update(prev => [...prev, { role: 'user', content: userText }]);
    this.messages.update(prev => [...prev, { role: 'assistant', content: '' }]);
    const assistantMsgIndex = this.messages().length - 1;

    this.isTyping.set(true);

    let fullResponse = '';

    this.aiApi.streamReply({ message: userText }).subscribe({
      next: (chunk) => {
        this.isTyping.set(false);
        fullResponse += chunk;
        this.messages.update(prev => {
          const updated = [...prev];
          updated[assistantMsgIndex] = { role: 'assistant', content: fullResponse };
          return updated;
        });
      },
      error: () => {
        this.isTyping.set(false);
        this.messages.update(prev => {
          const updated = [...prev];
          updated[assistantMsgIndex] = { role: 'assistant', content: 'NEURAL_LINK_INTERRUPTED. Re-establish sync.' };
          return updated;
        });
      }
    });
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    }
  }
}
