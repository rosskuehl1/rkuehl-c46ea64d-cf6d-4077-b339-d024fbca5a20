import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(() => {
    controller = new AuthController();
  });

  it('returns a demo token when default credentials are provided', () => {
    const response = controller.login({
      email: 'user@example.com',
      password: 'secret',
    });

    expect(response.token).toEqual(expect.any(String));
    expect(response.token.split('.')).toHaveLength(3);
  });

  it('throws an UnauthorizedException when credentials do not match', () => {
    expect(() =>
      controller.login({
        email: 'user@example.com',
        password: 'wrong-password',
      })
    ).toThrow(UnauthorizedException);
  });
});
