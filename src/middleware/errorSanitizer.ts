import type { NextFunction, Request, Response } from 'express';
import { mapDbErrorToUserSafe } from '../utils/apiError.js';

/**
 * Global Express error-handling middleware.
 *
 * Responsibilities:
 * - Log the full error server-side (message, stack, DB code, request context).
 * - Return a sanitized, user-safe response to the client.
 * - Never expose SQL, table names, stack traces, or internal details.
 */
export function errorSanitizer(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Avoid double-handling headers-already-sent situations.
  if (res.headersSent) {
    return;
  }

  const statusCode =
    typeof err?.status === 'number'
      ? err.status
      : typeof err?.statusCode === 'number'
      ? err.statusCode
      : 500;

  // Log full details server-side only.
  console.error('[API] Unhandled error (sanitized response):', {
    message: err?.message,
    code: err?.code,
    stack: err?.stack,
    path: req?.originalUrl,
    method: req?.method,
  });

  // Map Postgres errors to user-friendly messages; fall back to a generic one.
  const userSafe = mapDbErrorToUserSafe(err);

  // Keep a response format compatible with current frontend usage.
  res.status(statusCode).json({
    success: false,
    error: userSafe.message,
  });
}
