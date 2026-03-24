import { Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="badge" [class.warn]="warn()" [class.good]="good()">{{ value() }}</span>`,
  styles: [`
    .badge { display: inline-flex; align-items: center; justify-content: center; min-width: 6rem; padding: 0.35rem 0.7rem; border-radius: 999px; font-size: 0.78rem; font-weight: 700; background: rgba(37, 99, 235, 0.12); color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.04em; }
    .warn { background: rgba(249, 115, 22, 0.12); color: #c2410c; }
    .good { background: rgba(22, 163, 74, 0.12); color: #15803d; }
  `]
})
export class StatusBadgeComponent {
  readonly value = input.required<string>();

  protected warn(): boolean {
    return /late|pending|review|expiring|critical|watch|overdue|open|risk|needs/i.test(this.value());
  }

  protected good(): boolean {
    return /active|approved|ready|published|assigned|up|signed|tracked|on_time|clocked_in|connected|completed|paid/i.test(this.value());
  }
}
