"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { ROLE_CATALOG, isSystemRoleId } from "@/lib/rbac/catalog";
import { createDemoDatabase } from "@/lib/seed/demo-data";
import { nextEmployeeId } from "@/services/identity/employee-id";
import { useAppStore } from "@/services/store";
import type { AppRole, IdentityProfile } from "@/types/identity";
import type { AuthenticatedUser, PermissionKey } from "@/types/rbac";
import type { AuditLogEntry } from "@/types/audit";

function seedRoles(): AppRole[] {
  const stamp = nowIso();
  return Object.values(ROLE_CATALOG).map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    status: "ACTIVE",
    isSystem: true,
    createdAt: stamp,
    updatedAt: stamp,
  }));
}

function seedUsers(): IdentityProfile[] {
  return createDemoDatabase().users.map((user) => {
    const [firstName, ...rest] = user.displayName.split(" ");
    return {
      id: user.id,
      firebaseUid: user.id,
      employeeId: user.employeeId ?? "EMP-0000",
      firstName: firstName ?? user.displayName,
      lastName: rest.join(" ") || "—",
      displayName: user.displayName,
      email: user.email,
      departmentId: user.department.toLowerCase().replace(/\s+/g, "_"),
      departmentName: user.department,
      designation: ROLE_CATALOG[user.role].name,
      roleId: user.role,
      roleName: ROLE_CATALOG[user.role].name,
      status: user.isActive ? "ACTIVE" : "INACTIVE",
      joiningDate: user.createdAt.slice(0, 10),
      lastLoginAt: undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      createdBy: user.createdBy,
      updatedBy: user.updatedBy,
    };
  });
}

function writeLocalAudit(entry: Omit<AuditLogEntry, "id">) {
  const db = useAppStore.getState().db;
  useAppStore.setState({
    db: {
      ...db,
      auditLogs: [
        {
          ...entry,
          id: `aud_${crypto.randomUUID()}`,
        },
        ...db.auditLogs,
      ],
    },
  });
}

function resolvePermissions(roles: AppRole[], roleId: string): PermissionKey[] {
  const custom = roles.find((role) => role.id === roleId && role.status === "ACTIVE");
  if (custom) return custom.permissions;
  if (isSystemRoleId(roleId)) return ROLE_CATALOG[roleId].permissions;
  return [];
}

export function toAuthenticatedUser(profile: IdentityProfile, roles: AppRole[]): AuthenticatedUser {
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
    permissions: resolvePermissions(roles, profile.roleId),
  };
}

interface IdentityState {
  users: IdentityProfile[];
  roles: AppRole[];
  listUsers: () => IdentityProfile[];
  getUser: (id: string) => IdentityProfile | undefined;
  getUserByEmail: (email: string) => IdentityProfile | undefined;
  createUser: (input: Omit<IdentityProfile, "id" | "employeeId" | "displayName" | "createdAt" | "updatedAt"> & { employeeId?: string }, actor: AuthenticatedUser) => IdentityProfile;
  updateUser: (id: string, patch: Partial<IdentityProfile>, actor: AuthenticatedUser) => IdentityProfile;
  getRoleById: (id: string) => AppRole | undefined;
  createRole: (input: Pick<AppRole, "name" | "description" | "permissions" | "status">, actor: AuthenticatedUser) => AppRole;
  updateRole: (id: string, patch: Partial<AppRole>, actor: AuthenticatedUser) => AppRole;
  recordLogin: (id: string) => void;
}

export const useIdentityStore = create<IdentityState>()(
  persist(
    (set, get) => ({
      users: seedUsers(),
      roles: seedRoles(),
      listUsers: () => get().users,
      getUser: (id) => get().users.find((user) => user.id === id || user.firebaseUid === id),
      getUserByEmail: (email) => get().users.find((user) => user.email.toLowerCase() === email.toLowerCase()),
      createUser: (input, actor) => {
        if (get().users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) {
          throw new AppError("CONFLICT", "A user with this email already exists.", 409);
        }
        if ((input.roleId === "super_admin" || input.roleId === "admin") && actor.role !== "super_admin" && actor.role !== "admin") {
          throw new AppError("FORBIDDEN", "Only administrators can assign administrative roles.", 403);
        }
        const employeeId = input.employeeId?.trim() || nextEmployeeId(get().users.map((user) => user.employeeId));
        if (get().users.some((user) => user.employeeId === employeeId)) {
          throw new AppError("CONFLICT", "Employee ID is already in use.", 409);
        }
        const role = get().roles.find((item) => item.id === input.roleId);
        const now = nowIso();
        const record: IdentityProfile = {
          ...input,
          id: `usr_${crypto.randomUUID().slice(0, 8)}`,
          employeeId,
          displayName: `${input.firstName} ${input.lastName}`.trim(),
          roleName: role?.name ?? input.roleName,
          createdAt: now,
          updatedAt: now,
          createdBy: actor.uid,
          updatedBy: actor.uid,
        };
        set((state) => ({ users: [record, ...state.users] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "create",
          module: "users",
          recordId: record.id,
          timestamp: now,
          oldValue: null,
          newValue: `${record.displayName} (${record.employeeId})`,
        });
        return record;
      },
      updateUser: (id, patch, actor) => {
        const current = get().getUser(id);
        if (!current) throw new AppError("NOT_FOUND", "User not found.", 404);
        if (patch.roleId && patch.roleId !== current.roleId && actor.role !== "super_admin" && actor.role !== "admin") {
          throw new AppError("FORBIDDEN", "Only administrators can change roles.", 403);
        }
        if (patch.roleId === "super_admin" && actor.role !== "super_admin") {
          throw new AppError("FORBIDDEN", "Only a Super Admin can assign the Super Admin role.", 403);
        }
        const role = patch.roleId ? get().roles.find((item) => item.id === patch.roleId) : undefined;
        const next: IdentityProfile = {
          ...current,
          ...patch,
          id: current.id,
          employeeId: current.employeeId,
          email: current.email,
          firebaseUid: current.firebaseUid,
          displayName: patch.firstName || patch.lastName
            ? `${patch.firstName ?? current.firstName} ${patch.lastName ?? current.lastName}`.trim()
            : current.displayName,
          roleName: role?.name ?? patch.roleName ?? current.roleName,
          updatedAt: nowIso(),
          updatedBy: actor.uid,
        };
        set((state) => ({
          users: state.users.map((user) => (user.id === current.id ? next : user)),
        }));
        if (patch.roleId && patch.roleId !== current.roleId) {
          writeLocalAudit({
            userId: actor.uid,
            userEmail: actor.email,
            action: "status_change",
            module: "roles",
            recordId: current.id,
            timestamp: nowIso(),
            oldValue: current.roleName,
            newValue: next.roleName,
          });
        }
        if (patch.status && patch.status !== current.status) {
          writeLocalAudit({
            userId: actor.uid,
            userEmail: actor.email,
            action: "status_change",
            module: "users",
            recordId: current.id,
            timestamp: nowIso(),
            oldValue: current.status,
            newValue: patch.status,
          });
        }
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "users",
          recordId: current.id,
          timestamp: nowIso(),
          oldValue: current.displayName,
          newValue: next.displayName,
        });
        return next;
      },
      getRoleById: (id) => get().roles.find((role) => role.id === id),
      createRole: (input, actor) => {
        const now = nowIso();
        const record: AppRole = {
          id: `role_${crypto.randomUUID().slice(0, 8)}`,
          name: input.name,
          description: input.description,
          permissions: input.permissions,
          status: input.status,
          isSystem: false,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ roles: [record, ...state.roles] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "create",
          module: "roles",
          recordId: record.id,
          timestamp: now,
          oldValue: null,
          newValue: record.name,
        });
        return record;
      },
      updateRole: (id, patch, actor) => {
        const current = get().getRoleById(id);
        if (!current) throw new AppError("NOT_FOUND", "Role not found.", 404);
        if (current.isSystem && patch.isSystem === false) {
          throw new AppError("FORBIDDEN", "System roles cannot be converted.", 403);
        }
        const next = { ...current, ...patch, id: current.id, isSystem: current.isSystem, updatedAt: nowIso() };
        set((state) => ({
          roles: state.roles.map((role) => (role.id === id ? next : role)),
        }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "roles",
          recordId: id,
          timestamp: nowIso(),
          oldValue: current.name,
          newValue: next.name,
        });
        return next;
      },
      recordLogin: (id) => {
        const current = get().getUser(id);
        if (!current) return;
        const lastLoginAt = nowIso();
        set((state) => ({
          users: state.users.map((user) =>
            user.id === current.id ? { ...user, lastLoginAt, updatedAt: lastLoginAt } : user,
          ),
        }));
      },
    }),
    { name: "patri-cmo-identity" },
  ),
);

