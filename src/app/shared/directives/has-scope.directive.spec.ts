import { Component, ViewChild } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HasScopeDirective } from './has-scope.directive';
import { AuthService } from '../../core/services/auth.service';
import { provideHttpClient } from '@angular/common/http';

@Component({
  template: `<ng-container *appHasScope="requiredScopes">allowed</ng-container>`,
  standalone: true,
  imports: [HasScopeDirective]
})
class HostComponent {
  @ViewChild(HasScopeDirective) directive!: HasScopeDirective;
  requiredScopes: string | string[] = 'USER_CREATE';
}

describe('HasScopeDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let component: HostComponent;
  let auth: AuthService;

  const setScopes = (scopes: string[], isAdmin = false) => {
    (auth as any).scopesSubject.next(scopes);
    (auth as any).adminState.set(isAdmin);
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HostComponent, AuthService, provideHttpClient()]
    });
    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
    auth = TestBed.inject(AuthService);
    // Ensure clean logged-out state with no scopes.
    (auth as any).scopesSubject.next([]);
    (auth as any).adminState.set(false);
    fixture.detectChanges();
  });

  it('hides content when scope is missing', () => {
    setScopes(['OTHER_SCOPE']);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('allowed');
  });

  it('shows content when scope is present', () => {
    setScopes(['USER_CREATE']);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('allowed');
  });

  it('shows content for admin even without the explicit scope', () => {
    setScopes([], true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('allowed');
  });

  it('hides again when admin state is revoked', () => {
    setScopes([], true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('allowed');
    setScopes([], false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('allowed');
  });
});
