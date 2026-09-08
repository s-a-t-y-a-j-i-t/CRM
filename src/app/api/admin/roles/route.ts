import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { roleFormSchema } from "@/schemas/identity";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import type { PermissionKey } from "@/types/rbac";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("roles.create");
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, mode: "demo" });
    }
    const parsed = roleFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the highlighted fields and try again." }, { status: 400 });
    }
    const db = getAdminDb();
    if (!db) {
      throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required to create roles.", 500);
    }
    const now = nowIso();
    const ref = db.collection(COLLECTIONS.roles).doc();
    const role = {
      id: ref.id,
      name: parsed.data.name,
      description: parsed.data.description,
      permissions: parsed.data.permissions as PermissionKey[],
      status: parsed.data.status,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(role);
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "CREATE",
      module: "roles",
      recordId: role.id,
      newValue: role.name,
    });
    return NextResponse.json({ role });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
