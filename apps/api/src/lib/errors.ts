import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type AppError = {
  type: 'APP_ERROR';
  code: string;
  message: string;
  statusCode: ContentfulStatusCode;
};

// Factory functions to create errors
export const createError = (
  code: string,
  message: string,
  statusCode: ContentfulStatusCode,
): AppError => ({
  type: 'APP_ERROR',
  code,
  message,
  statusCode,
});

// Pre-defined error factories
export const unauthorizedError = (message = 'Unauthorized') =>
  createError('UNAUTHORIZED', message, 401);

export const notFoundError = (message = 'Not Found') =>
  createError('NOT_FOUND', message, 404);

export const badRequestError = (message = 'Bad Request') =>
  createError('BAD_REQUEST', message, 400);

// Type guard to check if something is an AppError
export const isAppError = (error: unknown): error is AppError =>
  typeof error === 'object' &&
  error !== null &&
  'type' in error &&
  error.type === 'APP_ERROR';
