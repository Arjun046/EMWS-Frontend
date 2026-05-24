import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  const requiredScope = route.data?.['requiredScope'] as string | undefined;
  const requiredAnyScope = route.data?.['requiredAnyScope'] as string[] | undefined;
  if (requiredScope && !auth.hasScope(requiredScope)) {
    snackBar.open('Access denied', 'Close', { duration: 3000 });
    return router.createUrlTree(['/dashboard']);
  }

  if (requiredAnyScope?.length && !auth.hasAnyScope(requiredAnyScope)) {
    snackBar.open('Access denied', 'Close', { duration: 3000 });
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
