// lib/domain/errors.ts
// Error ber-code agar response API dapat distandardisasi. Port dari ApiError_ (Utils.js).

export class ApiError extends Error {
  readonly code: string;
  readonly details?: unknown[];

  constructor(code: string, message?: string, details?: unknown[]) {
    super(message || code);
    this.name = 'ApiError';
    this.code = code;
    if (details) this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const message = err instanceof Error ? err.message : 'Terjadi kesalahan internal';
  return new ApiError('server_error', message);
}
