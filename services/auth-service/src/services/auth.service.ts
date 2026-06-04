import { Role, User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, HTTP_STATUS } from '../utils/errors';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { LoginInput, PublicUser, RegisterInput } from '../types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function validateEmail(email: string): void {
  if (!email || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
    throw new AppError('Invalid email format', HTTP_STATUS.BAD_REQUEST, 'INVALID_EMAIL');
  }
}

function validatePassword(password: string): void {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_PASSWORD'
    );
  }
}

function validateRole(role?: string): Role {
  if (!role) {
    return Role.MEMBER;
  }
  const normalized = role.toUpperCase();
  if (normalized === Role.MEMBER || normalized === Role.ORGANIZER) {
    return normalized as Role;
  }
  throw new AppError('Invalid role. Use MEMBER or ORGANIZER', HTTP_STATUS.BAD_REQUEST, 'INVALID_ROLE');
}

export class AuthService {
  async register(input: RegisterInput) {
    const email = input.email.trim().toLowerCase();
    validateEmail(email);
    validatePassword(input.password);
    const role = validateRole(input.role);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('User with this email already exists', HTTP_STATUS.CONFLICT, 'EMAIL_EXISTS');
    }

    const password_hash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: { email, password_hash, role },
    });

    const tokens = this.issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  }

  async login(input: LoginInput) {
    const email = input.email.trim().toLowerCase();
    validateEmail(email);
    validatePassword(input.password);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED, 'INVALID_CREDENTIALS');
    }

    const valid = await verifyPassword(input.password, user.password_hash);
    if (!valid) {
      throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED, 'INVALID_CREDENTIALS');
    }

    const tokens = this.issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new AppError('Refresh token is required', HTTP_STATUS.UNAUTHORIZED, 'MISSING_REFRESH_TOKEN');
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED, 'INVALID_REFRESH_TOKEN');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.UNAUTHORIZED, 'USER_NOT_FOUND');
    }

    const tokens = this.issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
    }
    return toPublicUser(user);
  }

  private issueTokens(user: User) {
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = signRefreshToken({ sub: user.id });
    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
