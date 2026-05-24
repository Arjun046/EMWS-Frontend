import { Directive, Input, TemplateRef, ViewContainerRef, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

/**
 * Structural directive to conditionally show/hide elements based on user permissions (scopes).
 * Usage: *appHasScope="'USER_CREATE'" or *appHasScope="['USER_CREATE', 'USER_WRITE']"
 */
@Directive({
  selector: '[appHasScope]',
  standalone: true
})
export class HasScopeDirective implements OnInit, OnDestroy {
  private requiredScopes: string[] = [];
  private isViewCreated = false;
  private readonly destroy$ = new Subject<void>();

  @Input() set appHasScope(val: string | string[]) {
    this.requiredScopes = Array.isArray(val) ? val : [val];
    this.updateView();
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.scopes$
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
    const userScopes = this.authService.currentScopes;
    const hasPermission = this.checkPermission(userScopes);

    if (hasPermission && !this.isViewCreated) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.isViewCreated = true;
    } else if (!hasPermission && this.isViewCreated) {
      this.viewContainer.clear();
      this.isViewCreated = false;
    }
  }

  private checkPermission(userScopes: string[]): boolean {
    if (!this.requiredScopes || this.requiredScopes.length === 0) {
      return true;
    }
    // Check if user has ANY of the required scopes
    return this.requiredScopes.some(scope => userScopes.includes(scope));
  }
}
