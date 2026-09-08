import { AppError } from "@/lib/errors";
import { roleHas } from "@/lib/rbac/catalog";
import type { AuthenticatedUser, PermissionKey } from "@/types/rbac";

export function can(user: AuthenticatedUser | null, permission: PermissionKey): boolean {
  if (!user || !user.isActive || user.status === "SUSPENDED" || user.status === "INACTIVE") {
    return false;
  }
  if (user.permissions?.includes(permission)) {
    return true;
  }
  return roleHas(user.role, permission);
}

export function assertCan(user: AuthenticatedUser | null, permission: PermissionKey): void {
  if (!user) {
    throw new AppError("UNAUTHENTICATED", "Sign in to continue.", 401);
  }
  if (!user.isActive) {
    throw new AppError("FORBIDDEN", "This account is inactive.", 403);
  }
  if (!can(user, permission)) {
    throw new AppError("FORBIDDEN", "You do not have permission for this action.", 403);
  }
}

export function canView(
  user: AuthenticatedUser | null,
  module: import("@/types/rbac").ModuleId,
): boolean {
  return can(user, `${module}.view`);
}
