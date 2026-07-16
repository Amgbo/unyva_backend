import type { Request, Response } from 'express';

export type UserSafeError = {
  message: string;
  error?: string;
  code?: string;
};

function isObject(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null;
}

export function getDbErrorCode(err: any): string | undefined {
  if (!err) return undefined;

  // node-postgres / postgres error code on the error object
  if (typeof err.code === 'string') return err.code;

  // Some libraries nest the code
  if (isObject(err.original) && typeof err.original.code === 'string') {
    return err.original.code;
  }

  return undefined;
}

export function mapDbErrorToUserSafe(err: any): UserSafeError {
  const code = getDbErrorCode(err);

  switch (code) {
    // undefined_table / undefined_column: feature/schema not ready
    case '42P01':
    case '42703':
      return { message: 'This feature is not available right now. Please try again later.' };

    // unique_violation
    case '23505':
      return { message: 'That request could not be completed because it conflicts with existing data.' };

    // foreign_key_violation
    case '23503':
      return { message: 'That request references something that does not exist or is no longer available.' };

    // not_null_violation
    case '23502':
      return { message: 'Some required information is missing. Please check your input and try again.' };

    // check_violation
    case '23514':
      return { message: 'The provided information does not meet the required conditions.' };

    // invalid_text_representation / syntax_error
    case '22P02':
    case '42601':
      return { message: 'Invalid input format. Please check your request and try again.' };

    // insufficient_privilege
    case '42501':
      return { message: 'You do not have permission to perform this action.' };

    // connection_failure / too_many_connections
    case '08006':
    case '53300':
      return { message: 'We are experiencing high demand right now. Please try again in a moment.' };

    default:
      return { message: 'Something went wrong. Please try again later.' };
  }
}

/**
 * Send a user-safe API error response while keeping full internal details in
 * server-side logs only.
 */
export function safeApiErrorResponse(
  res: Response,
  statusCode: number,
  publicErr: UserSafeError,
  opts?: {
    errorKey?: string;
    internalError?: any;
    requestId?: string;
    context?: string;
  }
) {
  const { errorKey = 'error', internalError, requestId, context } = opts || {};

  // Server-side logging only
  if (internalError) {
    const dbCode = getDbErrorCode(internalError);
    const logged: Record<string, any> = {
      statusCode,
      dbCode,
      context,
      requestId,
      message: internalError?.message,
      stack: internalError?.stack,
      code: internalError?.code,
    };

    // eslint-disable-next-line no-console
    console.error('[API] Safe error response:', logged);
  }

  const payload: Record<string, any> = {
    success: false,
    message: publicErr.message,
  };

  // Preserve the existing frontend contract style when a public error key is provided.
  if (publicErr.error) payload[errorKey] = publicErr.error;

  if (publicErr.code) payload.code = publicErr.code;

  return res.status(statusCode).json(payload);
}

/**
 * Convenience helper for controllers: given an unknown error, return a
 * sanitized response and log the original error.
 */
export function handleControllerError(
  res: Response,
  err: any,
  opts: {
    statusCode?: number;
    publicMessage?: string;
    publicError?: string;
    context?: string;
  } = {}
) {
  const {
    statusCode = 500,
    publicMessage,
    publicError = 'Internal server error',
    context,
  } = opts;

  const userSafe = mapDbErrorToUserSafe(err);
  const message = publicMessage ?? userSafe.message;

  return safeApiErrorResponse(res, statusCode, { message, error: publicError }, {
    internalError: err,
    context,
  });
}
