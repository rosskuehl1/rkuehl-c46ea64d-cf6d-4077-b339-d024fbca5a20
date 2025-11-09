import { Body, Controller, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';

interface LoginRequestDto {
  readonly email: string;
  readonly password: string;
}

interface LoginResponseDto {
  readonly token: string;
}

const DEFAULT_EMAIL = process.env['DASHBOARD_DEFAULT_EMAIL'] ?? 'user@example.com';
const DEFAULT_PASSWORD = process.env['DASHBOARD_DEFAULT_PASSWORD'] ?? 'secret';
const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

@Controller('auth')
export class AuthController {
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginRequestDto): LoginResponseDto {
    if (!body?.email || !body?.password) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (body.email !== DEFAULT_EMAIL || body.password !== DEFAULT_PASSWORD) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return {
      token: this.createToken(body.email),
    } satisfies LoginResponseDto;
  }

  private createToken(email: string): string {
    const now = Math.floor(Date.now() / 1000);
    const header = this.toBase64Url(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' })
    );
    const payload = this.toBase64Url(
      JSON.stringify({ sub: email, iat: now, exp: now + TOKEN_TTL_SECONDS })
    );
    const signature = this.toBase64Url('demo-signature');

    return `${header}.${payload}.${signature}`;
  }

  private toBase64Url(value: string): string {
    return Buffer.from(value)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
}
