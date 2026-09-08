import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { ROLE_CATALOG, isSystemRoleId } from "@/lib/rbac/catalog";
import { writeAuditLog } from "@/services/audit/audit.service";
import { DEPARTMENTS, type IdentityProfile } from "@/types/identity";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requirePermission("users.update");
    const { id } = await context.params;
    const patch = (await request.json()) as Partial<IdentityProfile>;
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, mode: "demo" });
    }
    const auth = getAdminAuth();
    const db = getAdminDb();
    if (!auth || !db) {
      throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required to update users.", 500);
    }
    const ref = db.collection(COLLECTIONS.users).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new AppError("NOT_FOUND", "User not found.", 404);
    }
    const current = snap.data() as IdentityProfile;
    if (patch.roleId === "super_admin" && actor.role !== "super_admin") {
      throw new AppError("FORBIDDEN", "Only a Super Admin can assign the Super Admin role.", 403);
    }
    if (patch.status && patch.status !== "ACTIVE") {
      await requirePermission("users.deactivate");
    }

    const next = {
      ...current,
      ...patch,
      id: current.id,
      firebaseUid: current.firebaseUid,
      email: current.email,
      employeeId: current.employeeId,
      displayName:
        patch.firstName || patch.lastName
          ? `${patch.firstName ?? current.firstName} ${patch.lastName ?? current.lastName}`.trim()
          : current.displayName,
      departmentName: patch.departmentId
        ? (DEPARTMENTS.find((item) => item.id === patch.departmentId)?.name ?? patch.departmentId)
        : current.departmentName,
      roleName: patch.roleId
        ? isSystemRoleId(patch.roleId)
          ? ROLE_CATALOG[patch.roleId].name
          : patch.roleId
        : current.roleName,
      updatedAt: nowIso(),
      updatedBy: actor.uid,
    };

    await ref.set(next, { merge: true });
    if (patch.roleId && patch.roleId !== current.roleId) {
      await auth.setCustomUserClaims(current.firebaseUid || id, { role: patch.roleId });
      await writeAuditLog({
        userId: actor.uid,
        userName: actor.displayName,
        action: "UPDATE",
        module: "roles",
        recordId: id,
        oldValue: current.roleName,
        newValue: next.roleName,
        metadata: { action: "ROLE_CHANGED" },
      });
    }
    if (patch.status && patch.status !== current.status) {
      await auth.updateUser(current.firebaseUid || id, { disabled: patch.status !== "ACTIVE" });
      await writeAuditLog({
        userId: actor.uid,
        userName: actor.displayName,
        action: "UPDATE",
        module: "users",
        recordId: id,
        oldValue: current.status,
        newValue: patch.status,
        metadata: { action: "STATUS_CHANGED" },
      });
    }
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "UPDATE",
      module: "users",
      recordId: id,
      oldValue: current.displayName,
      newValue: next.displayName,
    });
    return NextResponse.json({ profile: next, refreshRequired: Boolean(patch.roleId && patch.roleId !== current.roleId) });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
