import { toSignal } from '@angular/core/rxjs-interop';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { WorkspaceDataService } from '../../core/services/workspace-data.service';
import { DataTableComponent } from '../../shared/components/data-table.component';
import { FilterBarComponent } from '../../shared/components/filter-bar.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { WorkspaceConfig } from '../../shared/models/ui.models';
import { WORKSPACE_CONFIGS, WorkspaceKey } from '../../shared/utils/workspace-config';

@Component({
  selector: 'app-workspace-page',
  standalone: true,
  imports: [MatCardModule, DataTableComponent, FilterBarComponent, PageHeaderComponent, StatCardComponent],
  template: `
    <app-page-header [title]="config().title" [subtitle]="config().subtitle" actionLabel="Create Record" />
    <section class="stats-grid">
      @for (card of config().stats; track card.label) {
        <app-stat-card [card]="card" />
      }
    </section>
    <section class="workspace-grid">
      <mat-card class="workspace-main">
        <div class="accent-strip" [style.background]="config().accent"></div>
        <app-filter-bar [filters]="config().filters" (filterChanged)="selectedFilter.set($event)" (searchChanged)="search.set($event)" />
        <app-data-table [columns]="config().columns" [rows]="filteredRows()" />
      </mat-card>

      <div class="workspace-side">
        <mat-card>
          <h3>Spotlight</h3>
          <div class="stack">
            @for (card of config().spotlight; track card.title) {
              <article class="spotlight"><span>{{ card.tag }}</span><strong>{{ card.title }}</strong><p>{{ card.body }}</p></article>
            }
          </div>
        </mat-card>

        <mat-card>
          <h3>Timeline</h3>
          <div class="stack">
            @for (item of config().timeline; track item.time + item.title) {
              <article class="timeline"><span>{{ item.time }}</span><strong>{{ item.title }}</strong><p>{{ item.detail }}</p></article>
            }
          </div>
        </mat-card>
      </div>
    </section>
  `,
  styles: [`
    .stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .workspace-grid { display: grid; grid-template-columns: 1.45fr 0.8fr; gap: 1rem; }
    .workspace-main, .workspace-side mat-card { border-radius: 1.4rem; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: 0 22px 55px rgba(15, 23, 42, 0.07); }
    .workspace-main { position: relative; overflow: hidden; padding-top: 1rem; }
    .accent-strip { position: absolute; inset: 0 0 auto 0; height: 0.45rem; }
    .workspace-side { display: grid; gap: 1rem; }
    .stack { display: grid; gap: 0.85rem; margin-top: 1rem; }
    .spotlight, .timeline { padding: 0.95rem; border-radius: 1rem; background: rgba(248, 250, 252, 0.88); border: 1px solid rgba(148, 163, 184, 0.16); }
    .spotlight span, .timeline span { display: inline-block; margin-bottom: 0.4rem; color: var(--app-primary-700); font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; }
    h3, strong, p { margin: 0; }
    .spotlight p, .timeline p { margin-top: 0.35rem; color: var(--app-text-secondary); }
    @media (max-width: 1100px) { .workspace-grid, .stats-grid { grid-template-columns: 1fr; } }
  `]
})
export class WorkspacePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly workspaceData = inject(WorkspaceDataService);
  protected readonly selectedFilter = signal('all');
  protected readonly search = signal('');
  protected readonly key = toSignal(
    this.route.data.pipe(map((data) => data['workspaceKey'] as WorkspaceKey)),
    { initialValue: this.route.snapshot.data['workspaceKey'] as WorkspaceKey }
  );
  protected readonly config = toSignal(
    this.route.data.pipe(
      map((data) => data['workspaceKey'] as WorkspaceKey),
      switchMap((workspaceKey) => this.workspaceData.loadWorkspace(workspaceKey))
    ),
    { initialValue: WORKSPACE_CONFIGS[this.route.snapshot.data['workspaceKey'] as WorkspaceKey] as WorkspaceConfig }
  );

  protected readonly filteredRows = computed(() => {
    const rows = this.config().rows;
    const query = this.search().trim().toLowerCase();
    const filter = this.selectedFilter().toLowerCase();

    return rows.filter((row) => {
      const matchesQuery = !query || Object.values(row).some((value) => String(value).toLowerCase().includes(query));
      const matchesFilter = filter === 'all' || Object.values(row).some((value) => String(value).toLowerCase().includes(filter));
      return matchesQuery && matchesFilter;
    });
  });
}
