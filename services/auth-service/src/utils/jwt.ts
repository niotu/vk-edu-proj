import jwt, { SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;
}

const accessOptions: SignOptions = { expiresIn: env.jwtExpiry as SignOptions['expiresIn'] };
const refreshOptions: SignOptions = {
  expiresIn: env.jwtRefreshExpiry as SignOptions['expiresIn'],
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, accessOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, refreshOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
}
