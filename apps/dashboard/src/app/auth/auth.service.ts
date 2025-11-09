import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

const TOKEN_STORAGE_KEY = 'dashboard.auth.token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenSubject = new BehaviorSubject<string | null>(
    this.readToken()
  );

  readonly token$ = this.tokenSubject.asObservable();
  readonly isAuthenticated$ = this.token$.pipe(map((token) => token !== null));

  login(request: LoginRequest): Observable<void> {
    return this.http.post<LoginResponse>('/api/auth/login', request).pipe(
      tap(({ token }) => this.setToken(token)),
      map(() => void 0)
    );
  }

  logout(): void {
    this.setToken(null);
  }

  get token(): string | null {
    return this.tokenSubject.value;
  }

  private setToken(token: string | null): void {
    this.tokenSubject.next(token);

    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to persist auth token', error);
    }
  }

  private readToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to read auth token', error);
      return null;
    }
  }
}
