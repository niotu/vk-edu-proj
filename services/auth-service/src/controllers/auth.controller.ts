import { Response } from 'express';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { authService } from '../services/auth.service';
import { AuthRequest } from '../types';
import { createSuccessResponse } from '../utils/errors';

const REFRESH_COOKIE = 'refreshToken';

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

export const authController = {
  async register(req: AuthRequest, res: Response): Promise<void> {
    const { name, email, password, role } = req.body as {
      name?: string;
      email: string;
      password: string;
      role?: Role;
    };
    const result = await authService.register({ name, email, password, role });
    setRefreshCookie(res, result.refreshToken);
    res.status(201).json(
      createSuccessResponse({
        user: result.user,
        accessToken: result.accessToken,
      })
    );
  },

  async login(req: AuthRequest, res: Response): Promise<void> {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.login({ email, password });
    setRefreshCookie(res, result.refreshToken);
    res.json(
      createSuccessResponse({
        user: result.user,
        accessToken: result.accessToken,
      })
    );
  },

  async refresh(req: AuthRequest, res: Response): Promise<void> {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const result = await authService.refresh(token || '');
    setRefreshCookie(res, result.refreshToken);
    res.json(
      createSuccessResponse({
        user: result.user,
        accessToken: result.accessToken,
      })
    );
  },

  async me(req: AuthRequest, res: Response): Promise<void> {
    const profile = await authService.getProfile(req.user!.id);
    res.json(createSuccessResponse({ user: profile }));
  },

  logout(_req: AuthRequest, res: Response): void {
    clearRefreshCookie(res);
    res.json(createSuccessResponse({ message: 'Logged out successfully' }));
  },
};
