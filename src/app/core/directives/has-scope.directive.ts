import { Directive, Input, OnDestroy, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[appHasScope]',
  standalone: true
})
export class HasScopeDirective implements OnDestroy {
  private requiredScopes: string[] = [];
  private rendered = false;
  private readonly subscription: Subscription;

  constructor(
    private readonly auth: AuthService,
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainer: ViewContainerRef
  ) {
    this.subscription = this.auth.scopes$.subscribe(() => this.updateView());
  }

  @Input()
  set appHasScope(scope: string | string[]) {
    this.requiredScopes = Array.isArray(scope) ? scope : [scope];
    this.updateView();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private updateView(): void {
    const allowed = this.requiredScopes.length > 0 && this.auth.hasAnyScope(this.requiredScopes);
    if (allowed && !this.rendered) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.rendered = true;
      return;
    }
    if (!allowed && this.rendered) {
      this.viewContainer.clear();
      this.rendered = false;
    }
  }
}
