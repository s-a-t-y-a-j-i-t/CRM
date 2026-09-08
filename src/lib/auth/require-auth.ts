import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/config/app";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { ROLE_CATALOG, isSystemRoleId } from "@/lib/rbac/catalog";
import { assertCan } from "@/lib/rbac/can";
import { createDemoDatabase } from "@/lib/seed/demo-data";
import type { IdentityProfile } from "@/types/identity";
import type { AuthenticatedUser, PermissionKey, RoleId } from "@/types/rbac";

function fromSeed(userId: string): AuthenticatedUser {
  const profile = createDemoDatabase().users.find((user) => user.id === userId);
  if (!profile || !profile.isActive) {
    throw new AppError("UNAUTHENTICATED", "Sign in to continue.", 401);
  }
  return {
    uid: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    roleName: ROLE_CATALOG[profile.role].name,
    department: profile.department,
    designation: ROLE_CATALOG[profile.role].name,
    employeeId: profile.employeeId,
    isActive: profile.isActive,
    status: "ACTIVE",
    permissions: ROLE_CATALOG[profile.role].permissions,
  };
}

function fromIdentity(profile: IdentityProfile, permissions: AuthenticatedUser["permissions"]): AuthenticatedUser {
  return {
    uid: profile.firebaseUid || profile.id,
    email: profile.email,
    displayName: profile.displayName,
    firstName: profile.firstName,
    lastName: profile.lastName,
    role: profile.roleId,
    roleName: profile.roleName,
    department: profile.departmentName,
    designation: profile.designation,
    employeeId: profile.employeeId,
    isActive: profile.status === "ACTIVE",
    status: profile.status,
    photoURL: profile.profileImage,
    permissions,
  };
}

export async function requireAuth(): Promise<AuthenticatedUser> {
  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!session) {
    throw new AppError("UNAUTHENTICATED", "Sign in to continue.", 401);
  }

  if (session.startsWith("demo:")) {
    if (!isDemoMode()) {
      throw new AppError("UNAUTHENTICATED", "Sign in to continue.", 401);
    }
    return fromSeed(session.slice("demo:".length));
  }

  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    throw new AppError("FIREBASE_UNCONFIGURED", "Server authorization is unavailable.", 500);
  }

  let uid = session;
  try {
    const decoded = await auth.verifySessionCookie(session, true);
    uid = decoded.uid;
  } catch {
    try {
      const decoded = await auth.verifyIdToken(session, true);
      uid = decoded.uid;
    } catch {
      throw new AppError("UNAUTHENTICATED", "Your session has expired. Please sign in again.", 401);
    }
  }

  const snap = await db.collection(COLLECTIONS.users).doc(uid).get();
  if (!snap.exists) {
    throw new AppError("UNAUTHENTICATED", "This account is not provisioned.", 401);
  }
  const profile = { id: snap.id, ...snap.data() } as IdentityProfile;
  if (profile.status !== "ACTIVE") {
    throw new AppError("FORBIDDEN", "This account has been disabled. Contact your administrator.", 403);
  }

  const roleSnap = await db.collection(COLLECTIONS.roles).doc(String(profile.roleId)).get();
  const rolePermissions = roleSnap.exists
    ? ((roleSnap.data()?.permissions ?? []) as AuthenticatedUser["permissions"])
    : isSystemRoleId(String(profile.roleId))
      ? ROLE_CATALOG[profile.roleId as RoleId].permissions
      : [];

  return fromIdentity(profile, rolePermissions);
}

export async function requirePermission(permission: PermissionKey): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  assertCan(user, permission);
  return user;
}

export async function requireRole(role: RoleId | string): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (user.role !== role) {
    throw new AppError("FORBIDDEN", "You do not have permission for this action.", 403);
  }
  return user;
}

export function jsonError(error: unknown): { body: { error: string; code?: string }; status: number } {
  if (error instanceof AppError) {
    return { body: { error: error.message, code: error.code }, status: error.status };
  }
  return { body: { error: "Unable to complete this request." }, status: 500 };
}
