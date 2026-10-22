/**
 * AuthService — all authentication business logic lives here.
 *
 * Controllers are thin. Zero business logic in controllers.
 *
 * Responsibilities:
 * - register: validate uniqueness, hash password, persist user, return safe fields
 * - login: verify credentials, issue token pair, persist refresh token
 * - getProfile: fetch the caller's own user record (+ driverId if DRIVER)
 *
 * Rate limiting for register/login is implemented in AuthController using
 * RedisService (the existing application Redis pool) per REDIS_SCHEMA.md.
 *
 * Source: docs/API_CONTRACTS.md — POST /auth/register, POST /auth/login, GET /auth/profile
 * Source: docs/RBAC.md — RBAC Matrix, Error Responses
 * Source: docs/ENGINEERING_RULES.md — "No business logic in controllers"
 */

import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { TokenService } from './token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  LoginResponseData,
  ProfileResponseData,
  RegisterResponseData,
} from './dto/auth-response.dto';
import { AuthenticatedUser, Role } from '@common/types';
import { UserRole } from '@prisma/client';
import { RefreshTokenContext } from './strategies/jwt-refresh.strategy';

const BCRYPT_ROUNDS = 12;

// Map our Role enum → Prisma UserRole enum (values are identical strings)
const roleToPrisma = (role: Role): UserRole => role as unknown as UserRole;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Register a new user account.
   *
   * Security notes:
   * - Password is hashed with bcrypt (12 rounds) before any DB write.
   * - Duplicate email is rejected with 409 before any hash work is done.
   * - ADMIN registration is blocked at the DTO level, not just here.
   *
   * Source: docs/RBAC.md — POST /auth/register: Admin ❌
   */
  async register(dto: RegisterDto): Promise<RegisterResponseData> {
    const emailTaken = await this.usersRepository.existsByEmail(dto.email);

    if (emailTaken) {
      throw new ConflictException({
        message: 'An account with this email already exists',
        code: 'USER_EMAIL_TAKEN',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: roleToPrisma(dto.role),
    });

    this.logger.log(`User registered: id=${user.id} role=${user.role}`);

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
    };
  }

  /**
   * Authenticate a user and issue an access + refresh token pair.
   *
   * Security notes:
   * - Generic "invalid credentials" message — no user enumeration via 404.
   * - bcrypt.compare runs even if user is not found (timing attack mitigation).
   * - Suspended users are rejected with 403 (not 401) to distinguish from auth failure.
   * - driverId is embedded in the access token for downstream ownership checks.
   *
   * Source: docs/RBAC.md — POST /auth/login: all roles ✅ (unauthenticated)
   * Source: docs/REDIS_SCHEMA.md — auth:refresh:{userId}:{tokenFamily} (Phase 2B)
   */
  async login(dto: LoginDto): Promise<LoginResponseData> {
    const user = await this.usersRepository.findByEmailWithDriver(dto.email);

    // Constant-time comparison even when user doesn't exist
    const DUMMY_HASH = '$2b$12$invalidhashfortimingnormalization000000000000000000000000';
    const passwordHash = user?.passwordHash ?? DUMMY_HASH;
    const isValid = await bcrypt.compare(dto.password, passwordHash);

    if (!user || !isValid) {
      throw new UnauthorizedException({
        message: 'Invalid email or password',
        code: 'AUTH_INVALID_CREDENTIALS',
      });
    }

    if (!user.isActive) {
      throw new ForbiddenException({
        message: 'Your account has been suspended',
        code: 'AUTH_ACCOUNT_SUSPENDED',
      });
    }

    this.logger.log(`User logged in: id=${user.id} role=${user.role}`);

    return this.issueTokenPair(user);
  }

  /**
   * Exchange a valid refresh token for a new access + refresh pair (rotation).
   * The presented token's family is revoked; replaying it later revokes every
   * session for the user (see TokenService.validateRefreshToken).
   * The new access token re-reads driverId, so it picks up a driver profile
   * created after the original login.
   */
  async refresh(ctx: RefreshTokenContext): Promise<LoginResponseData> {
    await this.tokenService.validateRefreshToken(ctx.userId, ctx.tokenFamily, ctx.rawToken);

    const user = await this.usersRepository.findByIdWithDriver(ctx.userId);
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found', code: 'AUTH_INVALID_TOKEN' });
    }
    if (!user.isActive) {
      await this.tokenService.revokeAllForUser(user.id);
      throw new ForbiddenException({
        message: 'Your account has been suspended',
        code: 'AUTH_ACCOUNT_SUSPENDED',
      });
    }

    await this.tokenService.revokeFamily(ctx.userId, ctx.tokenFamily);
    return this.issueTokenPair(user);
  }

  /**
   * Log out the current session: blacklist the access token and, when the
   * client sends it, revoke the refresh token family.
   */
  async logout(caller: AuthenticatedUser, refreshToken?: string): Promise<void> {
    if (caller.jti && caller.tokenExp) {
      await this.tokenService.blacklistAccessToken(caller.jti, caller.tokenExp);
    }

    const family = refreshToken ? this.tokenService.decodeRefreshFamily(refreshToken, caller.id) : null;
    if (family) {
      await this.tokenService.revokeFamily(caller.id, family);
    }

    this.logger.log(`User logged out: id=${caller.id}`);
  }

  private async issueTokenPair(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    driver: { id: string } | null;
  }): Promise<LoginResponseData> {
    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as Role,
      driverId: user.driver?.id,
    });

    const { token: refreshToken, tokenFamily } =
      this.tokenService.generateRefreshToken(user.id);

    await this.tokenService.storeRefreshToken(user.id, tokenFamily, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
      },
    };
  }

  /**
   * Return the authenticated caller's own profile.
   * Includes driverId if the user is a DRIVER (required for ownership checks).
   *
   * Source: docs/RBAC.md — GET /auth/profile: all roles ✅ (own profile)
   * Source: docs/RBAC.md — Field-Level Restrictions (role-specific fields in future)
   */
  async getProfile(userId: string): Promise<ProfileResponseData> {
    const user = await this.usersRepository.findByIdWithDriver(userId);

    if (!user) {
      throw new UnauthorizedException({
        message: 'User not found',
        code: 'AUTH_INVALID_TOKEN',
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      createdAt: user.createdAt,
      averageRating: user.averageRating.toString(),
      totalRatings: user.totalRatings,
      totalRides: user._count.rides,
      driverId: user.driver?.id,
    };
  }
}
