import { TestBed } from '@angular/core/testing';
import { UiPreferencesService, ACCENT_PRESETS, DEFAULT_PREFS } from './ui-preferences.service';

describe('UiPreferencesService', () => {
  let service: UiPreferencesService;

  beforeEach(() => {
    // Fresh localStorage per test.
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [UiPreferencesService] });
    service = TestBed.inject(UiPreferencesService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to DEFAULT_PREFS when no stored prefs', () => {
    expect(service.compactTables()).toBe(DEFAULT_PREFS.compactTables);
    expect(service.accentKey()).toBe(DEFAULT_PREFS.accentKey);
  });

  it('setCompact toggles and persists', () => {
    service.setCompact(true);
    expect(service.compactTables()).toBe(true);
    const stored = JSON.parse(localStorage.getItem('ewms.ui.prefs.v2')!);
    expect(stored.compactTables).toBe(true);
    service.setCompact(false);
    expect(service.compactTables()).toBe(false);
  });

  it('setAccent validates against known presets and persists', () => {
    service.setAccent('emerald');
    expect(service.accentKey()).toBe('emerald');
    expect(JSON.parse(localStorage.getItem('ewms.ui.prefs.v2')!)).toEqual(jasmine.objectContaining({ accentKey: 'emerald' }));

    // Unknown key is ignored.
    service.setAccent('not-a-real-key');
    expect(service.accentKey()).toBe('emerald');
  });

  it('presetFor returns the matching preset', () => {
    const blue = service.presetFor('blue');
    expect(blue?.label).toBe('Enterprise Blue');
    expect(blue?.primary).toBe('#2f6feb');
    expect(service.presetFor('nope')).toBeUndefined();
  });

  it('ACCENT_PRESETS is non-empty and each has required fields', () => {
    expect(ACCENT_PRESETS.length).toBeGreaterThan(0);
    for (const p of ACCENT_PRESETS) {
      expect(p.key).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.primary).toMatch(/^#/);
      expect(p.accent).toMatch(/^#/);
    }
  });
});
