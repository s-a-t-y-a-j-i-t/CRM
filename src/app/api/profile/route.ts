import { NextResponse } from "next/server";
import { jsonError, requireAuth } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { profileFormSchema } from "@/schemas/identity";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import type { IdentityProfile } from "@/types/identity";

export async function PATCH(request: Request) {
  try {
    const actor = await requireAuth();
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, mode: "demo" });
    }
    const parsed = profileFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the highlighted fields and try again." }, { status: 400 });
    }
    const db = getAdminDb();
    if (!db) {
      throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required to update profiles.", 500);
    }
    const ref = db.collection(COLLECTIONS.users).doc(actor.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new AppError("NOT_FOUND", "Profile not found.", 404);
    }
    const current = snap.data() as IdentityProfile;
    const next = {
      ...current,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      displayName: `${parsed.data.firstName} ${parsed.data.lastName}`.trim(),
      phone: parsed.data.phone || null,
      profileImage: parsed.data.profileImage || null,
      roleId: current.roleId,
      status: current.status,
      employeeId: current.employeeId,
      updatedAt: nowIso(),
      updatedBy: actor.uid,
    };
    await ref.set(next, { merge: true });
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "UPDATE",
      module: "users",
      recordId: actor.uid,
      oldValue: current.displayName,
      newValue: next.displayName,
    });
    return NextResponse.json({ profile: next });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
