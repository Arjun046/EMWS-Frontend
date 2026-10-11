// Single source of truth lives in shared/. This module re-exports it so
// existing `core/directives/has-scope.directive` imports keep working
// without registering a duplicate `[appHasScope]` selector (H-4).
export { HasScopeDirective } from '../../shared/directives/has-scope.directive';
