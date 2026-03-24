import { Routes } from '@angular/router';
import { LoginPageComponent } from './login-page.component';
import { SignupPageComponent } from './signup-page.component';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'signup', component: SignupPageComponent }
];
