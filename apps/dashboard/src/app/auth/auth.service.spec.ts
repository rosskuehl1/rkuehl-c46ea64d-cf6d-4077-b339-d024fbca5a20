import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

const TOKEN_KEY = 'dashboard.auth.token';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('stores JWT on successful login', () => {
    service.login({ email: 'user@example.com', password: 'secret' }).subscribe();

    const request = httpMock.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');

    request.flush({ token: 'jwt-token' });

    expect(service.token).toBe('jwt-token');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-token');
  });

  it('clears token on logout', () => {
    service.login({ email: 'user@example.com', password: 'secret' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({ token: 'jwt-token' });

    service.logout();

    expect(service.token).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
