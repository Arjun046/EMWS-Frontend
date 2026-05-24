import { Routes } from '@angular/router';
import { LoginPageComponent } from './login-page.component';
import { SignupPageComponent } from './signup-page.component';
import { SetupPasswordComponent } from './setup-password.component';
import { ResetPasswordComponent } from './reset-password.component';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'signup', component: SignupPageComponent },
  { path: 'setup-password', component: SetupPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent }
];
