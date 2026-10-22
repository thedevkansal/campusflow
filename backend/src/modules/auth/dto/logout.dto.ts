/**
 * LogoutDto — optional payload for POST /auth/logout.
 * When the refresh token is supplied, its family is revoked as well.
 */

import { IsJWT, IsOptional } from 'class-validator';

export class LogoutDto {
  @IsOptional()
  @IsJWT()
  refreshToken?: string;
}
