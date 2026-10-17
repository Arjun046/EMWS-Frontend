import { Directive, Input, TemplateRef, ViewContainerRef, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Observable, Subject, takeUntil } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';

/**
 * Structural directive to conditionally show/hide elements based on user permissions (scopes).
 * Usage: *appHasScope="'USER_CREATE'" or *appHasScope="['USER_CREATE', 'USER_WRITE']"
 *
 * Reacts to both scope list changes and admin-state changes so an admin
 * mid-session flip re-evaluates visibility immediately.
 */
@Directive({
  selector: '[appHasScope]',
  standalone: true
})
export class HasScopeDirective implements OnInit, OnDestroy {
  private requiredScopes: string[] = [];
  private isViewCreated = false;
  private readonly destroy$ = new Subject<void>();
  private isAdmin$!: Observable<boolean>;

  @Input() set appHasScope(val: string | string[]) {
    this.requiredScopes = Array.isArray(val) ? val : [val];
    this.updateView();
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {
    // toObservable must run in an injection context (constructor).
    this.isAdmin$ = toObservable(this.authService.isAdmin);
  }

  ngOnInit(): void {
    combineLatest([this.authService.scopes$, this.isAdmin$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    const hasPermission = this.checkPermission();

    if (hasPermission && !this.isViewCreated) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.isViewCreated = true;
    } else if (!hasPermission && this.isViewCreated) {
      this.viewContainer.clear();
      this.isViewCreated = false;
    }
  }

  private checkPermission(): boolean {
    if (!this.requiredScopes || this.requiredScopes.length === 0) {
      return true;
    }
    // Admin super-user bypass (matches AuthService.hasAnyScope + BE ROLE_ADMIN).
    return this.authService.hasAnyScope(this.requiredScopes);
  }
}
