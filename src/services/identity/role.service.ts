import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/rbac/can";
import type { AppRole } from "@/types/identity";
import type { AuthenticatedUser, PermissionKey } from "@/types/rbac";
import { useIdentityStore } from "@/stores/identity-store";

async function authorize(permission: "roles.view" | "roles.create" | "roles.update") {
  const response = await fetch("/api/admin/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permission }),
  });
  if (response.ok) return;
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  throw new AppError(
    response.status === 403 ? "FORBIDDEN" : "UNAUTHENTICATED",
    data.error ?? "You do not have permission for this action.",
    response.status,
  );
}

export function listRoles(): AppRole[] {
  return useIdentityStore.getState().roles;
}

export function getRoleById(id: string): AppRole | null {
  return useIdentityStore.getState().getRoleById(id) ?? null;
}

export async function createRole(
  input: Pick<AppRole, "name" | "description" | "permissions" | "status">,
  actor: AuthenticatedUser,
): Promise<AppRole> {
  assertCan(actor, "roles.create");
  await authorize("roles.create");
  if (isDemoMode()) {
    return useIdentityStore.getState().createRole(input, actor);
  }
  const response = await fetch("/api/admin/roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json().catch(() => ({}))) as { role?: AppRole; error?: string };
  if (!response.ok || !data.role) {
    throw new AppError("INTERNAL", data.error ?? "Unable to create role.", response.status || 500);
  }
  return data.role;
}

export async function updateRole(
  id: string,
  patch: Partial<AppRole>,
  actor: AuthenticatedUser,
): Promise<AppRole> {
  assertCan(actor, "roles.update");
  await authorize("roles.update");
  if (isDemoMode()) {
    return useIdentityStore.getState().updateRole(id, patch, actor);
  }
  const response = await fetch(`/api/admin/roles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = (await response.json().catch(() => ({}))) as { role?: AppRole; error?: string };
  if (!response.ok || !data.role) {
    throw new AppError("INTERNAL", data.error ?? "Unable to update role.", response.status || 500);
  }
  return data.role;
}

export async function assignPermissions(
  id: string,
  permissions: PermissionKey[],
  actor: AuthenticatedUser,
): Promise<AppRole> {
  return updateRole(id, { permissions }, actor);
}
