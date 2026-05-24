import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-side-sheet-drawer',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="drawer-scrim" [class.active-scrim]="isOpen" (click)="close.emit()"></div>
    <div class="side-sheet-drawer" [class.active-drawer]="isOpen">
      <div class="drawer-header">
        <div class="header-text-stack">
          <h2>{{ title }}</h2>
          <p *ngIf="subtitle">{{ subtitle }}</p>
        </div>
        <button mat-icon-button (click)="close.emit()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      
      <div class="drawer-body custom-scrollbar">
        <ng-content></ng-content>
      </div>

      <div class="drawer-footer" *ngIf="showFooter">
        <button class="ui-btn ui-btn-secondary" (click)="close.emit()">{{ cancelText }}</button>
        <button class="ui-btn ui-btn-primary" [disabled]="saveDisabled" (click)="save.emit()">{{ saveText }}</button>
      </div>
    </div>
  `,
  styles: [`
    .drawer-scrim {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(4px);
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .drawer-scrim.active-scrim {
      opacity: 1;
      pointer-events: auto;
    }
    .side-sheet-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 520px;
      max-width: 90vw;
      background: var(--surface);
      border-left: 1px solid var(--border);
      z-index: 1001;
      transform: translateX(100%);
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      box-shadow: -20px 0 25px -5px rgba(15, 23, 42, 0.1);
    }
    .side-sheet-drawer.active-drawer {
      transform: translateX(0);
    }
    .drawer-header {
      padding: 1.5rem 2rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--surface-2);
    }
    .header-text-stack h2 {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0;
    }
    .header-text-stack p {
      font-size: 0.75rem;
      color: var(--txt-muted);
      font-weight: 600;
      margin: 0.25rem 0 0;
    }
    .drawer-body {
      flex: 1;
      padding: 2.5rem 2rem;
      overflow-y: auto;
    }
    .drawer-footer {
      padding: 1.25rem 2rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      background: var(--surface-2);
    }
    .ui-btn {
      padding: 0.6rem 1.2rem;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-family: inherit;
      transition: all 0.2s;
    }
    .ui-btn-primary { background: var(--primary); color: #fff; }
    .ui-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .ui-btn-secondary { background: var(--surface); border: 1.5px solid var(--border-2); color: var(--txt-secondary); }
  `]
})
export class SideSheetDrawerComponent {
  @Input() isOpen = false;
  @Input() title = 'Form';
  @Input() subtitle = '';
  @Input() showFooter = true;
  @Input() saveText = 'Save Changes';
  @Input() cancelText = 'Cancel';
  @Input() saveDisabled = false;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
}
