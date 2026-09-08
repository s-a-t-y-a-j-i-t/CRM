import { AppError } from "@/lib/errors";

const FRIENDLY: Record<string, { code: AppError["code"]; message: string; status: number }> = {
  "auth/invalid-credential": {
    code: "UNAUTHENTICATED",
    message: "Invalid email or password.",
    status: 401,
  },
  "auth/invalid-email": {
    code: "VALIDATION",
    message: "Enter a valid work email.",
    status: 400,
  },
  "auth/user-disabled": {
    code: "FORBIDDEN",
    message: "This account has been disabled. Contact your administrator.",
    status: 403,
  },
  "auth/user-not-found": {
    code: "UNAUTHENTICATED",
    message: "Invalid email or password.",
    status: 401,
  },
  "auth/wrong-password": {
    code: "UNAUTHENTICATED",
    message: "Invalid email or password.",
    status: 401,
  },
  "auth/too-many-requests": {
    code: "FORBIDDEN",
    message: "Too many sign-in attempts. Please wait and try again.",
    status: 429,
  },
  "auth/network-request-failed": {
    code: "INTERNAL",
    message: "Network error. Check your connection and try again.",
    status: 503,
  },
  "auth/invalid-action-code": {
    code: "VALIDATION",
    message: "This password reset link is invalid or has expired.",
    status: 400,
  },
};

function firebaseCode(error: unknown): string | undefined {
  if (typeof error === "object" && error && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return undefined;
}

export function toAuthError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  const code = firebaseCode(error);
  if (code && FRIENDLY[code]) {
    const mapped = FRIENDLY[code];
    return new AppError(mapped.code, mapped.message, mapped.status);
  }
  if (error instanceof Error && /network|fetch|Failed to fetch/i.test(error.message)) {
    return new AppError("INTERNAL", "Network error. Check your connection and try again.", 503);
  }
  return new AppError("UNAUTHENTICATED", "Unable to sign in. Please try again.", 401);
}
