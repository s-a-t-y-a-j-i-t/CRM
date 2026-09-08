import { can } from "@/lib/rbac/can";
import type { AuthenticatedUser, PermissionKey, RoleId } from "@/types/rbac";

export function hasPermission(user: AuthenticatedUser | null, permission: PermissionKey): boolean {
  return can(user, permission);
}

export function hasAnyPermission(user: AuthenticatedUser | null, permissions: PermissionKey[]): boolean {
  return permissions.some((permission) => can(user, permission));
}

export function hasAllPermissions(user: AuthenticatedUser | null, permissions: PermissionKey[]): boolean {
  return permissions.every((permission) => can(user, permission));
}

export function hasRole(user: AuthenticatedUser | null, role: RoleId | string): boolean {
  return Boolean(user && user.role === role);
}
