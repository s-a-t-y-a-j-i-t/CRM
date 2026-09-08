import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { ROLE_CATALOG, isSystemRoleId } from "@/lib/rbac/catalog";
import { userFormSchema } from "@/schemas/identity";
import { allocateEmployeeId } from "@/services/identity/employee-id.server";
import { writeAuditLog } from "@/services/audit/audit.service";
import { DEPARTMENTS } from "@/types/identity";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("users.create");
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, mode: "demo" });
    }
    const parsed = userFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the highlighted fields and try again." }, { status: 400 });
    }
    const input = parsed.data;
    if ((input.roleId === "super_admin" || input.roleId === "admin") && actor.role !== "super_admin" && actor.role !== "admin") {
      throw new AppError("FORBIDDEN", "Only administrators can assign administrative roles.", 403);
    }
    if (input.roleId === "super_admin" && actor.role !== "super_admin") {
      throw new AppError("FORBIDDEN", "Only a Super Admin can assign the Super Admin role.", 403);
    }

    const auth = getAdminAuth();
    const db = getAdminDb();
    if (!auth || !db) {
      throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required to create users.", 500);
    }

    const created = await auth.createUser({
      email: input.email,
      displayName: `${input.firstName} ${input.lastName}`.trim(),
      disabled: input.status !== "ACTIVE",
    });
    await auth.setCustomUserClaims(created.uid, { role: input.roleId });
    await auth.generatePasswordResetLink(input.email).catch(() => undefined);

    const employeeId = input.employeeId?.trim() || (await allocateEmployeeId());
    const roleName = isSystemRoleId(input.roleId) ? ROLE_CATALOG[input.roleId].name : input.roleId;
    const departmentName = DEPARTMENTS.find((item) => item.id === input.departmentId)?.name ?? input.departmentId;
    const now = nowIso();
    const profile = {
      id: created.uid,
      firebaseUid: created.uid,
      employeeId,
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: `${input.firstName} ${input.lastName}`.trim(),
      email: input.email,
      phone: input.phone || null,
      profileImage: input.profileImage || null,
      departmentId: input.departmentId,
      departmentName,
      designation: input.designation,
      roleId: input.roleId,
      roleName,
      status: input.status,
      joiningDate: input.joiningDate,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.uid,
      updatedBy: actor.uid,
    };
    await db.collection(COLLECTIONS.users).doc(created.uid).set(profile);
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "CREATE",
      module: "users",
      recordId: created.uid,
      newValue: `${profile.displayName} (${employeeId})`,
    });
    return NextResponse.json({ profile });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
