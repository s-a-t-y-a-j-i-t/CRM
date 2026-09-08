import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { productRequirementSchema } from "@/schemas/enquiries";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import { can } from "@/lib/rbac/can";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requirePermission("product_requirements.update");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = productRequirementSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Requirement details are incomplete." }, { status: 400 });
    }
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const enquiryRef = db.collection(COLLECTIONS.enquiries).doc(id);
    const snap = await enquiryRef.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Enquiry not found.", 404);
    const enquiry = snap.data() ?? {};
    if (!can(actor, "enquiries.view_all") && enquiry.assignedTo !== actor.uid) {
      throw new AppError("FORBIDDEN", "You can only access enquiries assigned to you.", 403);
    }
    const now = nowIso();
    const existing = await db.collection(COLLECTIONS.productRequirements).where("enquiryId", "==", id).where("isCurrent", "==", true).limit(1).get();
    const current = existing.docs[0];
    const versionNumber = current ? Number(current.data()?.versionNumber ?? 1) + 1 : 1;
    if (current) {
      await requirePermission("product_requirements.version");
      await current.ref.set({ isCurrent: false, updatedAt: now, updatedBy: actor.uid }, { merge: true });
      await db.collection(COLLECTIONS.requirementVersions).add({
        enquiryId: id,
        requirementId: current.id,
        versionNumber: current.data()?.versionNumber ?? 1,
        changedBy: actor.uid,
        changedByName: actor.displayName,
        changedAt: now,
        changeReason: parsed.data.changeReason || "Requirement updated",
        snapshot: current.data(),
      });
    }
    const payload = {
      enquiryId: id,
      ...parsed.data,
      versionNumber,
      isCurrent: true,
      createdAt: current?.data()?.createdAt ?? now,
      updatedAt: now,
      createdBy: current?.data()?.createdBy ?? actor.uid,
      updatedBy: actor.uid,
    };
    const ref = current
      ? db.collection(COLLECTIONS.productRequirements).doc()
      : db.collection(COLLECTIONS.productRequirements).doc();
    await ref.set(payload);
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "UPDATE",
      module: "product_requirements",
      recordId: id,
      oldValue: current ? String(current.data()?.versionNumber ?? "") : null,
      newValue: String(versionNumber),
    });
    return NextResponse.json({ requirement: { id: ref.id, ...payload } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
