import { NextResponse } from "next/server";
import { jsonError, requireAuth } from "@/lib/auth/require-auth";
import { ROLE_CATALOG, isSystemRoleId } from "@/lib/rbac/catalog";
import { createDemoDatabase } from "@/lib/seed/demo-data";
import type { IdentityProfile } from "@/types/identity";

export async function GET() {
  try {
    const user = await requireAuth();
    const seed = createDemoDatabase().users.find((item) => item.id === user.uid);
    const [firstName, ...rest] = user.displayName.split(" ");
    const profile: IdentityProfile = {
      id: user.uid,
      firebaseUid: user.uid,
      employeeId: user.employeeId ?? "EMP-0000",
      firstName: user.firstName ?? firstName ?? user.displayName,
      lastName: user.lastName ?? rest.join(" "),
      displayName: user.displayName,
      email: user.email,
      departmentId: user.department.toLowerCase().replace(/\s+/g, "_"),
      departmentName: user.department,
      designation: user.designation ?? user.roleName ?? user.role,
      roleId: user.role,
      roleName: user.roleName ?? (isSystemRoleId(user.role) ? ROLE_CATALOG[user.role].name : user.role),
      status: user.status ?? (user.isActive ? "ACTIVE" : "INACTIVE"),
      joiningDate: seed?.createdAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      lastLoginAt: undefined,
      createdAt: seed?.createdAt ?? new Date().toISOString(),
      updatedAt: seed?.updatedAt ?? new Date().toISOString(),
      createdBy: seed?.createdBy ?? user.uid,
      updatedBy: seed?.updatedBy ?? user.uid,
      profileImage: user.photoURL,
    };
    return NextResponse.json({ user, profile });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
