import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let authService: jest.Mocked<AuthService>;
  let router: Pick<Router, 'navigateByUrl'>;

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      logout: jest.fn(),
      token: null,
      token$: of(null),
      isAuthenticated$: of(false),
    } as unknown as jest.Mocked<AuthService>;

    router = {
      navigateByUrl: jest.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createComponent = () => TestBed.createComponent(LoginComponent);

  it('submits credentials when the form is valid', () => {
    authService.login.mockReturnValue(of(void 0));

    const fixture = createComponent();
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.setValue({
      email: 'user@example.com',
      password: 'strong-password',
    });

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit'));

    expect(authService.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'strong-password',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('does not submit when the form is invalid', () => {
    const fixture = createComponent();
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit'));

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('renders an error banner when the login fails', () => {
    authService.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 401,
        error: 'Invalid credentials',
      }))
    );

    const fixture = createComponent();
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.setValue({
      email: 'user@example.com',
      password: 'wrong-password',
    });

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.error-banner');
    expect(banner?.textContent).toContain('Invalid credentials');
  });
});
