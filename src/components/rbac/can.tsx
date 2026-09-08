"use client";

import type { ReactNode } from "react";
import { hasAllPermissions, hasAnyPermission, hasPermission } from "@/lib/rbac/guards";
import { useAuth } from "@/hooks/useAuth";
import type { PermissionKey } from "@/types/rbac";

export function Can({
  permission,
  any,
  all,
  children,
  fallback = null,
}: {
  permission?: PermissionKey;
  any?: PermissionKey[];
  all?: PermissionKey[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user } = useAuth();
  const allowed = permission
    ? hasPermission(user, permission)
    : any
      ? hasAnyPermission(user, any)
      : all
        ? hasAllPermissions(user, all)
        : false;

  return allowed ? children : fallback;
}
