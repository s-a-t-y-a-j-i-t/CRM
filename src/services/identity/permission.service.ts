import { PERMISSION_GROUPS, toPermission } from "@/constants/permissions";
import type { PermissionKey } from "@/types/rbac";

export function listPermissionGroups() {
  return PERMISSION_GROUPS;
}

export function flattenPermissions(): PermissionKey[] {
  return PERMISSION_GROUPS.flatMap((group) =>
    group.rows.flatMap((row) => row.actions.map((action) => toPermission(row.module, action))),
  );
}

export function isKnownPermission(value: string): value is PermissionKey {
  return flattenPermissions().includes(value as PermissionKey);
}
