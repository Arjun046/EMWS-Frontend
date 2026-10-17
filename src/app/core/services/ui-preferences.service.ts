import { Injectable, signal } from '@angular/core';

export interface AccentPreset {
  key: string;
  label: string;
  primary: string;
  accent: string;
}

/** Curated, accessible accent/primary color pairs for workspace theming. */
export const ACCENT_PRESETS: AccentPreset[] = [
  { key: 'blue', label: 'Enterprise Blue', primary: '#2f6feb', accent: '#8b5cf6' },
  { key: 'indigo', label: 'Indigo', primary: '#4f46e5', accent: '#a855f7' },
  { key: 'emerald', label: 'Emerald', primary: '#10b981', accent: '#34d399' },
  { key: 'amber', label: 'Amber', primary: '#f59e0b', accent: '#fbbf24' },
  { key: 'rose', label: 'Rose', primary: '#e11d48', accent: '#f472b6' },
  { key: 'slate', label: 'Slate', primary: '#475569', accent: '#94a3b8' },
];

export interface UiPreferences {
  compactTables: boolean;
  accentKey: string;
}

export const DEFAULT_PREFS: UiPreferences = {
  compactTables: false,
  accentKey: 'blue',
};

const PREFS_KEY = 'ewms.ui.prefs.v2';

@Injectable({ providedIn: 'root' })
export class UiPreferencesService {
  private readonly prefs = signal<UiPreferences>(this.load());
  private readonly _compactTables = signal<boolean>(this.prefs().compactTables);
  private readonly _accentKey = signal<string>(this.prefs().accentKey);

  readonly compactTables = this._compactTables.asReadonly();
  readonly accentKey = this._accentKey.asReadonly();

  private load(): UiPreferences {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UiPreferences>;
        return { ...DEFAULT_PREFS, ...parsed };
      }
    } catch {
      // corrupted prefs: fall through to defaults
    }
    return { ...DEFAULT_PREFS };
  }

  private persist() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs()));
  }

  setCompact(value: boolean) {
    this._compactTables.set(value);
    this.prefs.update(p => { p.compactTables = value; this.persist(); return p; });
  }

  setAccent(key: string) {
    if (!ACCENT_PRESETS.some(p => p.key === key)) return;
    this._accentKey.set(key);
    this.prefs.update(p => { p.accentKey = key; this.persist(); return p; });
  }

  presetFor(key: string): AccentPreset | undefined {
    return ACCENT_PRESETS.find(p => p.key === key);
  }
}
