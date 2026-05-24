import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AnalyticsService } from '../../core/services/analytics.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { TrendChartComponent } from '../../shared/components/trend-chart.component';

@Component({
  selector: 'app-performance-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, TrendChartComponent],
  template: `
    <div class="module-page active-page fade-up" id="page-performance">
      
      <div class="filter-action-row">
        <div>
           <h2 style="margin:0; font-size:1.5rem; font-weight:800; letter-spacing:-0.02em;">Analytical Yield Matrix</h2>
           <p style="margin:0.25rem 0 0; font-size:0.85rem; color:var(--txt-muted);">Quantitative operational telemetry and workforce efficiency mapping.</p>
        </div>
        <button class="ui-btn ui-btn-primary" (click)="export()">
          <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">file_download</mat-icon>
          Export Packet
        </button>
      </div>

      <div class="dashboard-kpi-row mt-6">
        <div class="ui-card kpi-card">
           <div class="kpi-meta-row">
              <span class="kpi-metric-title">Avg Efficiency</span>
              <span class="ui-badge ui-badge-success">+2.1%</span>
           </div>
           <div class="kpi-metric-value">92.4%</div>
        </div>
        <div class="ui-card kpi-card">
           <div class="kpi-meta-row">
              <span class="kpi-metric-title">Cost/Hour Ratio</span>
              <span class="ui-badge ui-badge-warning">Nominal</span>
           </div>
           <div class="kpi-metric-value">$42.50</div>
        </div>
        <div class="ui-card kpi-card">
           <div class="kpi-meta-row">
              <span class="kpi-metric-title">System Yield</span>
              <span class="ui-badge ui-badge-success">Optimal</span>
           </div>
           <div class="kpi-metric-value" style="color:var(--success)">NOMINAL</div>
        </div>
      </div>

      <div class="ui-card mt-6" style="padding:0; overflow:hidden;">
        <div class="ui-card-header" style="padding:1.5rem 1.5rem 0;">
           <h3>Sector Performance Vectors</h3>
           <span class="ui-badge ui-badge-success">Live_Updated</span>
        </div>
        
        <div class="chart-viewport" style="padding: 2.5rem; display: flex; flex-direction: column; gap: 2rem;">
           <div class="chart-row" style="display:flex; align-items:center; gap:2rem;">
              <div style="width: 180px; font-size: 0.85rem; font-weight: 800; color: var(--txt-secondary);">CORE_ENGINEERING</div>
              <div style="flex: 1; height: 12px; background: var(--surface-3); border-radius: 6px; overflow: hidden;">
                 <div style="height: 100%; background: var(--primary); border-radius: 6px; width: 98%;"></div>
              </div>
              <div style="width: 60px; font-family: 'JetBrains Mono', monospace; font-weight: 900; font-size: 0.9rem; text-align: right;">98.2%</div>
           </div>

           <div class="chart-row" style="display:flex; align-items:center; gap:2rem;">
              <div style="width: 180px; font-size: 0.85rem; font-weight: 800; color: var(--txt-secondary);">LOGISTICS_COMMAND</div>
              <div style="flex: 1; height: 12px; background: var(--surface-3); border-radius: 6px; overflow: hidden;">
                 <div style="height: 100%; background: var(--warning); border-radius: 6px; width: 82%;"></div>
              </div>
              <div style="width: 60px; font-family: 'JetBrains Mono', monospace; font-weight: 900; font-size: 0.9rem; text-align: right;">82.5%</div>
           </div>

           <div class="chart-row" style="display:flex; align-items:center; gap:2rem;">
              <div style="width: 180px; font-size: 0.85rem; font-weight: 800; color: var(--txt-secondary);">FISCAL_OPERATIONS</div>
              <div style="flex: 1; height: 12px; background: var(--surface-3); border-radius: 6px; overflow: hidden;">
                 <div style="height: 100%; background: var(--success); border-radius: 6px; width: 100%;"></div>
              </div>
              <div style="width: 60px; font-family: 'JetBrains Mono', monospace; font-weight: 900; font-size: 0.9rem; text-align: right;">100%</div>
           </div>
        </div>

        <div style="height: 200px; padding: 0 1.5rem 1.5rem;">
           <app-trend-chart [data]="[50, 60, 45, 70, 65, 80, 75, 90, 85, 95]" color="var(--primary)" />
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .mt-6 { margin-top: 1.5rem; }
  `]
})
export class PerformancePageComponent {
  export() {
    alert('Generating Forensic Matrix PDF...');
  }
}
