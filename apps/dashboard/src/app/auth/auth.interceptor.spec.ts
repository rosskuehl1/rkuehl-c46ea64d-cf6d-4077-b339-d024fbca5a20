import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';

const TOKEN_KEY = 'dashboard.auth.token';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('attaches the Authorization header when a token exists', () => {
    localStorage.setItem(TOKEN_KEY, 'jwt-token');

    http.get('/api/data').subscribe();

    const request = httpMock.expectOne('/api/data');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer jwt-token'
    );
  });

  it('does not attach the Authorization header when no token exists', () => {
    http.get('/api/data').subscribe();

    const request = httpMock.expectOne('/api/data');
    expect(request.request.headers.has('Authorization')).toBe(false);
  });
});
