/**
 * JwtRefreshGuard — protects POST /auth/refresh.
 *
 * Runs the 'jwt-refresh' Passport strategy (refresh-token secret, Bearer header)
 * and maps failures to the structured error codes from docs/RBAC.md.
 * The strategy only checks signature + expiry; AuthService.refresh() then checks
 * the token against its hashed PostgreSQL record (revocation, rotation).
 */

import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RefreshTokenContext } from '../strategies/jwt-refresh.strategy';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  handleRequest<TUser = RefreshTokenContext>(
    err: Error | null,
    user: TUser | false,
    info: { name?: string; message?: string } | undefined,
  ): TUser {
    if (err instanceof HttpException) throw err;

    if (err || !user) {
      const isExpired = info?.name === 'TokenExpiredError';
      throw new UnauthorizedException({
        message: isExpired ? 'Refresh token has expired' : 'Invalid or missing refresh token',
        code: isExpired ? 'AUTH_REFRESH_EXPIRED' : 'AUTH_REFRESH_INVALID',
      });
    }

    return user;
  }
}
