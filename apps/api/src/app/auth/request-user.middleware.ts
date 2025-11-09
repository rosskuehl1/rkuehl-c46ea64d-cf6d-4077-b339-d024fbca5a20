import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { DirectoryService } from '../identity/directory.service';
import { User } from '../models/user.model';

const BEARER_PREFIX = 'Bearer ';

interface RequestWithUser extends Request {
  user?: User;
}

@Injectable()
export class RequestUserMiddleware implements NestMiddleware {
  constructor(private readonly directory: DirectoryService) {}

  use(req: RequestWithUser, _res: Response, next: NextFunction): void {
    const header = req.headers['authorization'];
    if (typeof header !== 'string' || !header.startsWith(BEARER_PREFIX)) {
      next();
      return;
    }

    const token = header.slice(BEARER_PREFIX.length).trim();
    const email = this.extractEmail(token);
    if (email) {
      const user = this.directory.getUserByEmail(email);
      if (user) {
        req.user = user;
      }
    }

    next();
  }

  private extractEmail(token: string): string | undefined {
    const segments = token.split('.');
    if (segments.length < 2) {
      return undefined;
    }

    try {
      const payloadJson = this.base64UrlDecode(segments[1]);
      const payload = JSON.parse(payloadJson) as { readonly sub?: unknown };
      return typeof payload.sub === 'string' ? payload.sub : undefined;
    } catch {
      return undefined;
    }
  }

  private base64UrlDecode(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    return Buffer.from(normalized + padding, 'base64').toString('utf8');
  }
}
