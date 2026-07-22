import { AppError, createErrorResponse, createSuccessResponse, HTTP_STATUS } from './errors';

describe('errors utils', () => {
  it('creates an error response from AppError', () => {
    const err = new AppError('Nope', HTTP_STATUS.CONFLICT, 'ROOM_TAKEN');
    const body = createErrorResponse(err);
    expect(body).toMatchObject({
      success: false,
      message: 'Nope',
      code: 'ROOM_TAKEN',
      statusCode: 409,
    });
  });

  it('falls back to 500 for unknown errors', () => {
    const body = createErrorResponse(new Error('boom'));
    expect(body.statusCode).toBe(500);
    expect(body.code).toBe('INTERNAL_ERROR');
  });

  it('wraps data in a success response', () => {
    const body = createSuccessResponse({ ok: 1 });
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ ok: 1 });
  });
});
