import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AppError, HTTP_STATUS } from '../utils/errors';
import { verifyAccessToken } from '../utils/jwt';

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new AppError('Access token is required', HTTP_STATUS.UNAUTHORIZED, 'MISSING_TOKEN'));
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
    next();
  } catch {
    next(new AppError('Invalid or expired access token', HTTP_STATUS.UNAUTHORIZED, 'INVALID_TOKEN'));
  }
}
