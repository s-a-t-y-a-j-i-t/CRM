import {
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { isDemoMode, isFirebaseConfigured } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { toAuthError } from "@/lib/auth/firebase-errors";
import { getClientAuth } from "@/lib/firebase/client";
import { nowIso } from "@/lib/dates";
import { DEMO_PASSWORDS } from "@/lib/seed/demo-data";
import { toAuthenticatedUser, useIdentityStore } from "@/stores/identity-store";
import { useAppStore } from "@/services/store";
import type { AuthenticatedUser } from "@/types/rbac";
import type { IdentityProfile } from "@/types/identity";

export const RESET_ACK_MESSAGE =
  "If an account exists for that email, password reset instructions have been sent.";

function writeAuthAudit(
  user: Pick<AuthenticatedUser, "uid" | "email">,
  action: "login" | "logout",
) {
  const db = useAppStore.getState().db;
  useAppStore.setState({
    db: {
      ...db,
      auditLogs: [
        {
          id: `aud_${crypto.randomUUID()}`,
          userId: user.uid,
          userEmail: user.email,
          action,
          module: "users",
          recordId: user.uid,
          timestamp: nowIso(),
          oldValue: null,
          newValue: action.toUpperCase(),
        },
        ...db.auditLogs,
      ],
    },
  });
}

async function establishSession(payload: Record<string, string | boolean>) {
  const session = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!session.ok) {
    const data = (await session.json().catch(() => ({}))) as { error?: string };
    throw new AppError("UNAUTHENTICATED", data.error ?? "Unable to establish a secure session.", 401);
  }
}

function assertActiveProfile(profile: IdentityProfile): void {
  if (profile.status === "SUSPENDED" || profile.status === "INACTIVE") {
    throw new AppError(
      "FORBIDDEN",
      "This account has been disabled. Contact your administrator.",
      403,
    );
  }
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
  remember = true,
): Promise<{ user: AuthenticatedUser; profile: IdentityProfile }> {
  try {
    if (isDemoMode()) {
      const identity = useIdentityStore.getState();
      const profile = identity.getUserByEmail(email);
      const expected = DEMO_PASSWORDS[email.toLowerCase()];
      if (!profile || !expected || expected !== password) {
        throw new AppError("UNAUTHENTICATED", "Invalid email or password.", 401);
      }
      assertActiveProfile(profile);
      const user = toAuthenticatedUser(profile, identity.roles);
      await establishSession({
        demoUserId: user.uid,
        email: user.email,
        remember,
      });
      identity.recordLogin(profile.id);
      writeAuthAudit(user, "login");
      return { user, profile: { ...profile, lastLoginAt: nowIso() } };
    }

    if (!isFirebaseConfigured()) {
      throw new AppError(
        "FIREBASE_UNCONFIGURED",
        "Firebase is not configured. Add credentials or enable demo mode.",
        500,
      );
    }

    const auth = getClientAuth();
    if (!auth) {
      throw new AppError("FIREBASE_UNCONFIGURED", "Firebase Auth is unavailable.", 500);
    }

    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();
    await establishSession({ idToken, remember });

    const identity = useIdentityStore.getState();
    const local = identity.getUserByEmail(email);
    if (local) {
      assertActiveProfile(local);
      const user = toAuthenticatedUser(
        { ...local, firebaseUid: credential.user.uid, lastLoginAt: nowIso() },
        identity.roles,
      );
      identity.recordLogin(local.id);
      writeAuthAudit(user, "login");
      return { user, profile: { ...local, lastLoginAt: nowIso() } };
    }

    const profileResponse = await fetch("/api/auth/me");
    if (!profileResponse.ok) {
      await signOut(auth).catch(() => undefined);
      throw new AppError("FORBIDDEN", "This account is not provisioned. Contact your administrator.", 403);
    }
    const payload = (await profileResponse.json()) as { user: AuthenticatedUser; profile: IdentityProfile };
    if (payload.profile.status !== "ACTIVE") {
      await signOut(auth).catch(() => undefined);
      throw new AppError("FORBIDDEN", "This account has been disabled. Contact your administrator.", 403);
    }
    writeAuthAudit(payload.user, "login");
    return payload;
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function logoutCurrentUser(user?: AuthenticatedUser | null): Promise<void> {
  if (user) {
    writeAuthAudit(user, "logout");
  }
  const auth = getClientAuth();
  if (auth) {
    await signOut(auth).catch(() => undefined);
  }
  await fetch("/api/auth/session", { method: "DELETE" });
}

export async function requestPasswordReset(email: string): Promise<string> {
  try {
    const existing = useIdentityStore.getState().getUserByEmail(email);
    if (existing) {
      const db = useAppStore.getState().db;
      useAppStore.setState({
        db: {
          ...db,
          auditLogs: [
            {
              id: `aud_${crypto.randomUUID()}`,
              userId: existing.id,
              userEmail: existing.email,
              action: "update",
              module: "users",
              recordId: existing.id,
              timestamp: nowIso(),
              oldValue: null,
              newValue: "PASSWORD_RESET_REQUESTED",
            },
            ...db.auditLogs,
          ],
        },
      });
    }
    if (isDemoMode()) {
      return RESET_ACK_MESSAGE;
    }
    const auth = getClientAuth();
    if (!auth) {
      return RESET_ACK_MESSAGE;
    }
    await sendPasswordResetEmail(auth, email);
    return RESET_ACK_MESSAGE;
  } catch (error) {
    const mapped = toAuthError(error);
    if (mapped.code === "INTERNAL") {
      throw mapped;
    }
    return RESET_ACK_MESSAGE;
  }
}

export async function refreshIdToken(): Promise<void> {
  const auth = getClientAuth();
  const current = auth?.currentUser;
  if (!current) return;
  const idToken = await current.getIdToken(true);
  await establishSession({ idToken, remember: true });
}
