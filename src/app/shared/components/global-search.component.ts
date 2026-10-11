import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SearchService } from '../../core/services/search.service';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="search-overlay" [class.open]="search.isOpen()" (click)="search.close()">
      <div class="search-modal" role="dialog" aria-modal="true" aria-label="Global search" (click)="$event.stopPropagation()">
        <div class="search-input-row">
          <mat-icon aria-hidden="true">search</mat-icon>
          <input type="text" placeholder="Search employees, pages, actions..." aria-label="Search employees, pages, actions"
                 role="combobox" aria-expanded="true" aria-controls="global-search-listbox"
                 [attr.aria-activedescendant]="activeDescendantId()"
                 [(ngModel)]="query" (input)="handleSearch()"
                 (keydown.escape)="search.close()" (keydown.enter)="handleEnter()"
                 (keydown.arrowdown)="moveActive(1); $event.preventDefault()"
                 (keydown.arrowup)="moveActive(-1); $event.preventDefault()" autofocus>
          <span class="search-kbd" (click)="search.close()">ESC</span>
        </div>

        <div class="search-results custom-scrollbar" role="listbox" id="global-search-listbox" aria-label="Search results">
           @if (query().length > 0 && results().length === 0) {
              <div style="padding: 3rem; text-align: center; color: var(--txt-muted); font-size: 0.9rem;">No matches found for "{{ query() }}"</div>
           } @else {
              @for (section of sections; track section.label) {
                @if (getFilteredResults(section.label).length > 0) {
                  <div class="search-section-label" role="presentation">{{ section.label }}</div>
                  @for (item of getFilteredResults(section.label); track item.route) {
                    <div class="search-result-item" role="option"
                         [id]="'gs-option-' + section.label + '-' + $index"
                         [attr.aria-selected]="isActive(section.label, $index)"
                         [class.active-option]="isActive(section.label, $index)"
                         (click)="navigate(item.route)"
                         (keydown.enter)="navigate(item.route)" tabindex="0">
                       <mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>
                       <span class="search-result-label">{{ item.name }}</span>
                       <span class="search-result-sub">{{ item.sub }}</span>
                    </div>
                  }
                }
              }
           }
        </div>

        <div class="search-footer">
          <span class="search-hint"><span class="search-kbd">↑↓</span> Navigate</span>
          <span class="search-hint"><span class="search-kbd">↵</span> Select</span>
          <span class="search-hint"><span class="search-kbd">ESC</span> Close</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .search-result-item.active-option { background: var(--primary-soft); outline: 2px solid var(--primary); outline-offset: -2px; }
  `]
})
export class GlobalSearchComponent {
  protected readonly search = inject(SearchService);
  private readonly router = inject(Router);
  
  query = signal('');
  results = signal<any[]>([]);
  /** Flat keyboard cursor over the rendered options (section order, then row order). */
  private readonly activeIndex = signal(0);

  sections = [
    { label: 'Navigation' },
    { label: 'Employees' }
  ];

  private readonly allItems = [
    { name: 'Dashboard', route: '/dashboard', icon: 'dashboard', section: 'Navigation', sub: 'Page' },
    { name: 'Employees', route: '/employees', icon: 'people', section: 'Navigation', sub: 'Page' },
    { name: 'Scheduling', route: '/scheduling', icon: 'calendar_today', section: 'Navigation', sub: 'Page' },
    { name: 'Attendance', route: '/attendance', icon: 'timer', section: 'Navigation', sub: 'Page' },
    { name: 'Leaves', route: '/leaves', icon: 'event_busy', section: 'Navigation', sub: 'Page' },
    { name: 'Payroll Hub', route: '/payroll', icon: 'payments', section: 'Navigation', sub: 'Page' },
    { name: 'Compliance Ledger', route: '/compliance', icon: 'gavel', section: 'Navigation', sub: 'Page' },
    { name: 'My Profile', route: '/profile', icon: 'account_circle', section: 'Navigation', sub: 'Page' },
    { name: 'Settings', route: '/settings', icon: 'settings', section: 'Navigation', sub: 'Page' },
    { name: 'Alice Vance', route: '/employees', icon: 'person', section: 'Employees', sub: 'EMP-014 · Engineering' },
    { name: 'Bob Miller', route: '/employees', icon: 'person', section: 'Employees', sub: 'EMP-015 · Operations' }
  ];

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.search.open();
    }
  }

  handleSearch() {
    const q = this.query().toLowerCase();
    if (!q) {
      this.results.set([]);
      this.activeIndex.set(0);
      return;
    }
    this.results.set(this.allItems.filter(i => i.name.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q)));
    this.activeIndex.set(0);
  }

  /** Render-order options (section order, then row order) for arrow-key navigation. */
  private flatOptions(): any[] {
    const out: any[] = [];
    for (const section of this.sections) {
      out.push(...this.getFilteredResults(section.label));
    }
    return out;
  }

  private flatOptionKeys(): string[] {
    const keys: string[] = [];
    for (const section of this.sections) {
      const rows = this.getFilteredResults(section.label);
      rows.forEach((_, i) => keys.push(`${section.label}:${i}`));
    }
    return keys;
  }

  protected moveActive(delta: number): void {
    const options = this.flatOptions();
    if (!options.length) return;
    const next = (this.activeIndex() + delta + options.length) % options.length;
    this.activeIndex.set(next);
    const key = this.flatOptionKeys()[next];
    if (key) document.getElementById(`gs-option-${key.replace(':', '-')}`)?.scrollIntoView({ block: 'nearest' });
  }

  protected isActive(section: string, index: number): boolean {
    const keys = this.flatOptionKeys();
    return keys[this.activeIndex()] === `${section}:${index}`;
  }

  protected activeDescendantId(): string | null {
    const key = this.flatOptionKeys()[this.activeIndex()];
    return key ? `gs-option-${key.replace(':', '-')}` : null;
  }

  getFilteredResults(section: string) {
    if (!this.query()) {
      return this.allItems.filter(i => i.section === section).slice(0, 5);
    }
    return this.results().filter(i => i.section === section);
  }

  handleEnter() {
    const current = this.flatOptions()[this.activeIndex()];
    if (current) this.navigate(current.route);
  }

  navigate(route: string) {
    this.router.navigateByUrl(route);
    this.search.close();
    this.query.set('');
  }
}
