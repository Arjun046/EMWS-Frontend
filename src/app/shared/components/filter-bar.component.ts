import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatChipListboxChange, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FilterOption } from '../models/ui.models';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [FormsModule, MatChipsModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <section class="filter-bar">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Search workspace</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [(ngModel)]="query" (ngModelChange)="searchChanged.emit($event)" placeholder="Filter people, teams, or status">
      </mat-form-field>
      <mat-chip-listbox (change)="onChange($event)">
        @for (filter of filters(); track filter.value) {
          <mat-chip-option [value]="filter.value">{{ filter.label }}</mat-chip-option>
        }
      </mat-chip-listbox>
    </section>
  `,
  styles: [`
    .filter-bar { display: grid; grid-template-columns: minmax(16rem, 24rem) 1fr; gap: 1rem; align-items: center; margin-bottom: 1.2rem; }
    mat-form-field { width: 100%; }
    mat-chip-listbox { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    @media (max-width: 900px) { .filter-bar { grid-template-columns: 1fr; } }
  `]
})
export class FilterBarComponent {
  readonly filters = input.required<FilterOption[]>();
  readonly filterChanged = output<string>();
  readonly searchChanged = output<string>();
  protected query = '';

  protected onChange(event: MatChipListboxChange): void {
    this.filterChanged.emit((event.value as string) ?? 'all');
  }
}
