import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AppError, HTTP_STATUS } from '../utils/errors';
import { verifyAccessToken } from '../utils/jwt';

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new AppError('Access token is required', HTTP_STATUS.UNAUTHORIZED, 'MISSING_TOKEN'));
    return;
  }

  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    next(new AppError('Invalid or expired access token', HTTP_STATUS.UNAUTHORIZED, 'INVALID_TOKEN'));
  }
}

export function requireOrganizer(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (req.user?.role !== 'ORGANIZER') {
    next(new AppError('Organizer role required', HTTP_STATUS.FORBIDDEN, 'FORBIDDEN'));
    return;
  }
  next();
}
