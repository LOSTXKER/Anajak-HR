/**
 * Result Type
 * =============================================
 * Standard result type for service operations
 * Provides consistent error handling across the application
 */

/**
 * Success result type
 */
export interface SuccessResult<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Error result type
 */
export interface ErrorResult {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Combined Result type - either success or error
 */
export type Result<T> = SuccessResult<T> | ErrorResult;

/**
 * Create a success result
 */
export function success<T>(data: T, message?: string): SuccessResult<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

/**
 * Create an error result
 */
export function error(message: string, code?: string, details?: unknown): ErrorResult {
  const result: ErrorResult = {
    success: false,
    error: message,
  };
  if (code) {
    result.code = code;
  }
  if (details !== undefined) {
    result.details = details;
  }
  return result;
}

/**
 * Type guard to check if result is successful
 */
export function isSuccess<T>(result: Result<T>): result is SuccessResult<T> {
  return result.success === true;
}

/**
 * Type guard to check if result is an error
 */
export function isError<T>(result: Result<T>): result is ErrorResult {
  return result.success === false;
}

/**
 * Unwrap a result, throwing if it's an error
 */
export function unwrap<T>(result: Result<T>): T {
  if (isSuccess(result)) {
    return result.data;
  }
  throw new Error(result.error);
}

/**
 * Unwrap a result with a default value if it's an error
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  if (isSuccess(result)) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Map over a successful result
 */
export function map<T, U>(result: Result<T>, fn: (data: T) => U): Result<U> {
  if (isSuccess(result)) {
    return success(fn(result.data));
  }
  return result;
}

/**
 * Chain results together
 */
export async function chain<T, U>(
  result: Result<T>,
  fn: (data: T) => Promise<Result<U>>
): Promise<Result<U>> {
  if (isSuccess(result)) {
    return fn(result.data);
  }
  return result;
}

/**
 * Combine multiple results into one
 * Returns error if any result is an error
 */
export function combine<T extends readonly Result<unknown>[]>(
  results: T
): Result<{ [K in keyof T]: T[K] extends Result<infer U> ? U : never }> {
  const errors = results.filter(isError);
  if (errors.length > 0) {
    return error(errors.map((e) => e.error).join("; "));
  }

  const data = results.map((r) => (r as SuccessResult<unknown>).data);
  return success(data as { [K in keyof T]: T[K] extends Result<infer U> ? U : never });
}

/**
 * Try to execute a function and wrap the result
 */
export async function tryAsync<T>(
  fn: () => Promise<T>,
  errorMessage: string = "Operation failed"
): Promise<Result<T>> {
  try {
    const data = await fn();
    return success(data);
  } catch (err: any) {
    console.error(errorMessage, err);
    return error(err.message || errorMessage);
  }
}

/**
 * Try to execute a sync function and wrap the result
 */
export function trySync<T>(
  fn: () => T,
  errorMessage: string = "Operation failed"
): Result<T> {
  try {
    const data = fn();
    return success(data);
  } catch (err: any) {
    console.error(errorMessage, err);
    return error(err.message || errorMessage);
  }
}
