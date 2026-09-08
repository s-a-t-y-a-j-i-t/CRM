"use client";

import { hasAllPermissions, hasAnyPermission, hasPermission, hasRole } from "@/lib/rbac/guards";
import { useAuth } from "@/hooks/useAuth";
import type { PermissionKey, RoleId } from "@/types/rbac";

export function usePermission(permission?: PermissionKey) {
  const { user } = useAuth();
  return {
    allowed: permission ? hasPermission(user, permission) : false,
    can: (key: PermissionKey) => hasPermission(user, key),
    canAny: (keys: PermissionKey[]) => hasAnyPermission(user, keys),
    canAll: (keys: PermissionKey[]) => hasAllPermissions(user, keys),
    hasRole: (role: RoleId | string) => hasRole(user, role),
  };
}
