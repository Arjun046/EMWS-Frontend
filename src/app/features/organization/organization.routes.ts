import { Routes } from '@angular/router';
import { OrganizationPageComponent } from './organization-page.component';
import { BrandingPageComponent } from '../branding/branding-page.component';

export const ORGANIZATION_ROUTES: Routes = [
  { path: '', component: OrganizationPageComponent },
  { path: 'branding', component: BrandingPageComponent }
];
