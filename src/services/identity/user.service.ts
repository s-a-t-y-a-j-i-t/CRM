import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/rbac/can";
import { DEPARTMENTS, type AccountStatus, type IdentityProfile } from "@/types/identity";
import type { AuthenticatedUser } from "@/types/rbac";
import type { PaginatedResult } from "@/types/common";
import { useIdentityStore } from "@/stores/identity-store";
import { useAppStore } from "@/services/store";
import type { AuditLogEntry } from "@/types/audit";

export interface UserListQuery {
  search?: string;
  status?: AccountStatus | "";
  departmentId?: string;
  roleId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "employeeId" | "displayName" | "email" | "departmentName" | "roleName" | "status" | "lastLoginAt" | "createdAt";
  sortDirection?: "asc" | "desc";
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profileImage?: string;
  employeeId?: string;
  departmentId: string;
  designation: string;
  joiningDate: string;
  roleId: string;
  status: AccountStatus;
}

async function authorize(permission: "users.view" | "users.create" | "users.update" | "users.deactivate") {
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

function departmentName(departmentId: string): string {
  return DEPARTMENTS.find((item) => item.id === departmentId)?.name ?? departmentId;
}

function matchesSearch(user: IdentityProfile, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    user.employeeId.toLowerCase().includes(q) ||
    user.displayName.toLowerCase().includes(q) ||
    user.email.toLowerCase().includes(q) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(q)
  );
}

export function listUsers(
  query: UserListQuery = {},
  source?: IdentityProfile[],
): PaginatedResult<IdentityProfile> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const sortBy = query.sortBy ?? "createdAt";
  const direction = query.sortDirection === "asc" ? 1 : -1;
  const rows = (source ?? useIdentityStore.getState().listUsers()).filter((user) => {
      if (query.status && user.status !== query.status) return false;
      if (query.departmentId && user.departmentId !== query.departmentId) return false;
      if (query.roleId && user.roleId !== query.roleId) return false;
      return matchesSearch(user, query.search ?? "");
    })
    .sort((a, b) => {
      const left = String(a[sortBy] ?? "");
      const right = String(b[sortBy] ?? "");
      return left.localeCompare(right) * direction;
    });

  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize);
  return {
    items,
    total: rows.length,
    page,
    pageSize,
    hasMore: start + pageSize < rows.length,
  };
}

export function getUserById(id: string): IdentityProfile | null {
  return useIdentityStore.getState().getUser(id) ?? null;
}

export function getUserProfile(idOrEmail: string): IdentityProfile | null {
  const store = useIdentityStore.getState();
  return store.getUser(idOrEmail) ?? store.getUserByEmail(idOrEmail) ?? null;
}

export async function createUserProfile(input: CreateUserInput, actor: AuthenticatedUser): Promise<IdentityProfile> {
  assertCan(actor, "users.create");
  await authorize("users.create");

  if (isDemoMode()) {
    return useIdentityStore.getState().createUser(
      {
        firebaseUid: "",
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone || undefined,
        profileImage: input.profileImage || undefined,
        employeeId: input.employeeId || undefined,
        departmentId: input.departmentId,
        departmentName: departmentName(input.departmentId),
        designation: input.designation,
        roleId: input.roleId,
        roleName: useIdentityStore.getState().getRoleById(input.roleId)?.name ?? input.roleId,
        status: input.status,
        joiningDate: input.joiningDate,
        createdBy: actor.uid,
        updatedBy: actor.uid,
      },
      actor,
    );
  }

  const response = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json().catch(() => ({}))) as { profile?: IdentityProfile; error?: string };
  if (!response.ok || !data.profile) {
    throw new AppError("INTERNAL", data.error ?? "Unable to create user.", response.status || 500);
  }
  return data.profile;
}

export async function updateUserProfile(
  id: string,
  patch: Partial<CreateUserInput>,
  actor: AuthenticatedUser,
): Promise<IdentityProfile> {
  assertCan(actor, "users.update");
  await authorize("users.update");

  if (isDemoMode()) {
    return useIdentityStore.getState().updateUser(
      id,
      {
        ...patch,
        phone: patch.phone || undefined,
        profileImage: patch.profileImage || undefined,
        departmentName: patch.departmentId ? departmentName(patch.departmentId) : undefined,
      },
      actor,
    );
  }

  const response = await fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = (await response.json().catch(() => ({}))) as { profile?: IdentityProfile; error?: string };
  if (!response.ok || !data.profile) {
    throw new AppError("INTERNAL", data.error ?? "Unable to update user.", response.status || 500);
  }
  return data.profile;
}

export async function updateUserStatus(
  id: string,
  status: AccountStatus,
  actor: AuthenticatedUser,
): Promise<IdentityProfile> {
  assertCan(actor, status === "ACTIVE" ? "users.update" : "users.deactivate");
  await authorize(status === "ACTIVE" ? "users.update" : "users.deactivate");
  return updateUserProfile(id, { status }, actor);
}

export async function assignRole(id: string, roleId: string, actor: AuthenticatedUser): Promise<IdentityProfile> {
  assertCan(actor, "users.update");
  await authorize("users.update");
  return updateUserProfile(id, { roleId }, actor);
}

export async function updateOwnProfile(
  patch: Pick<CreateUserInput, "firstName" | "lastName" | "phone" | "profileImage">,
  actor: AuthenticatedUser,
): Promise<IdentityProfile> {
  const current = getUserById(actor.uid);
  if (!current) {
    throw new AppError("NOT_FOUND", "Profile not found.", 404);
  }
  if (isDemoMode()) {
    return useIdentityStore.getState().updateUser(
      current.id,
      {
        firstName: patch.firstName,
        lastName: patch.lastName,
        phone: patch.phone || undefined,
        profileImage: patch.profileImage || undefined,
      },
      actor,
    );
  }
  const response = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = (await response.json().catch(() => ({}))) as { profile?: IdentityProfile; error?: string };
  if (!response.ok || !data.profile) {
    throw new AppError("INTERNAL", data.error ?? "Unable to update profile.", response.status || 500);
  }
  return data.profile;
}

export function listUserActivity(userId: string): AuditLogEntry[] {
  return useAppStore
    .getState()
    .db.auditLogs.filter((entry) => entry.userId === userId || entry.recordId === userId)
    .slice(0, 40);
}
