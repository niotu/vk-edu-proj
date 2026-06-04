import { Request, Response, NextFunction } from 'express';
import { AppError, createErrorResponse, HTTP_STATUS } from '../utils/errors';

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err.message);

  if (err instanceof AppError) {
    res.status(err.statusCode).json(createErrorResponse(err));
    return;
  }

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(createErrorResponse(err));
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
