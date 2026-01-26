import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class AppError extends Error {
  type = 'APP_ERROR' as const;
  code: string;
  statusCode: ContentfulStatusCode;

  constructor(code: string, message: string, statusCode: ContentfulStatusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Factory functions to create errors
export const createError = (
  code: string,
  message: string,
  statusCode: ContentfulStatusCode,
): AppError => new AppError(code, message, statusCode);

// Pre-defined error factories
export const unauthorizedError = (message = 'Unauthorized') =>
  createError('UNAUTHORIZED', message, 401);

export const notFoundError = (message = 'Not Found') =>
  createError('NOT_FOUND', message, 404);

export const badRequestError = (message = 'Bad Request') =>
  createError('BAD_REQUEST', message, 400);

// Type guard to check if something is an AppError
export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError;
