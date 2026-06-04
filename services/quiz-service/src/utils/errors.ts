export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const createErrorResponse = (
  error: AppError | Error,
  timestamp: string = new Date().toISOString()
) => {
  if (error instanceof AppError) {
    return {
      success: false,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      timestamp,
    };
  }

  return {
    success: false,
    message: error.message || 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    timestamp,
  };
};

export const createSuccessResponse = <T>(
  data: T,
  timestamp: string = new Date().toISOString()
) => ({
  success: true,
  data,
  timestamp,
});
