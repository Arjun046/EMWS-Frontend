import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="chart-svg">
      <defs>
        <linearGradient [id]="gradientId" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" [attr.stop-color]="color" stop-opacity="0.3" />
          <stop offset="100%" [attr.stop-color]="color" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path [attr.d]="areaPath()" [attr.fill]="'url(#' + gradientId + ')'" />
      <path [attr.d]="linePath()" fill="none" [attr.stroke]="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="line-anim" />
    </svg>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .chart-svg { width: 100%; height: 100%; overflow: visible; }
    .line-anim { stroke-dasharray: 200; stroke-dashoffset: 200; animation: dash 2s ease-out forwards; }
    @keyframes dash { to { stroke-dashoffset: 0; } }
  `]
})
export class TrendChartComponent {
  @Input() data: number[] = [10, 25, 15, 30, 20, 35, 25];
  @Input() color: string = '#2f6feb';
  
  gradientId = 'grad-' + Math.random().toString(36).substring(2, 11);

  linePath = computed(() => {
    if (!this.data.length) return '';
    const max = Math.max(...this.data, 1);
    const points = this.data.map((val, i) => {
      const x = (i / (this.data.length - 1)) * 100;
      const y = 35 - (val / max) * 30; // Leave some margin
      return `${x},${y}`;
    });
    return 'M ' + points.join(' L ');
  });

  areaPath = computed(() => {
    const line = this.linePath();
    if (!line) return '';
    return `${line} L 100,40 L 0,40 Z`;
  });
}
