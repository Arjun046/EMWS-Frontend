import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ForbiddenPageComponent } from './forbidden-page.component';
import { RouterTestingModule } from '@angular/router/testing';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { provideHttpClient } from '@angular/common/http';

describe('ForbiddenPageComponent', () => {
  let fixture: ComponentFixture<ForbiddenPageComponent>;
  let component: ForbiddenPageComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ForbiddenPageComponent, RouterTestingModule, MatCardModule, MatButtonModule, MatIconModule],
      providers: [AuthService, provideHttpClient()]
    });
    fixture = TestBed.createComponent(ForbiddenPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders access denied message', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Access denied');
    expect(text).toContain('not authorized for this area');
  });

  it('provides return to dashboard and sign out actions', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Return to dashboard');
    expect(text).toContain('Sign out');
  });
});
