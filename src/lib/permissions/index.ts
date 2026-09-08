export { can, assertCan, canView } from "@/lib/rbac/can";
export { ROLE_CATALOG, getRole, roleHas, isSystemRoleId } from "@/lib/rbac/catalog";
export { hasPermission, hasAnyPermission, hasAllPermissions, hasRole } from "@/lib/rbac/guards";
export type { PermissionKey, RoleId, ModuleId } from "@/types/rbac";
