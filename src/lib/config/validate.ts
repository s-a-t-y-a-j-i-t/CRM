import { AppError } from "@/lib/errors";
import { getAdminCredentials, getFirebasePublicConfig, isDemoMode } from "@/lib/env";

export function assertClientConfig(): void {
  if (isDemoMode()) return;
  if (!getFirebasePublicConfig()) {
    throw new AppError(
      "FIREBASE_UNCONFIGURED",
      "Firebase client configuration is incomplete. Check NEXT_PUBLIC_FIREBASE_* variables.",
      500,
    );
  }
}

export function assertServerConfig(): void {
  if (isDemoMode()) return;
  if (!getAdminCredentials()) {
    throw new AppError(
      "FIREBASE_UNCONFIGURED",
      "Firebase Admin configuration is missing. Set FIREBASE_ADMIN_* on the server only.",
      500,
    );
  }
}
