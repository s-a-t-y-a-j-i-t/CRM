export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "FIREBASE_UNCONFIGURED"
  | "UPLOAD_REJECTED"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: Record<string, string>;

  constructor(
    code: AppErrorCode,
    message: string,
    status = 500,
    details?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toUserMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
