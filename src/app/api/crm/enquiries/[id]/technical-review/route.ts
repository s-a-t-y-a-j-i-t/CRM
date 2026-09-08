import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { validateTransition } from "@/services/enquiries/enquiry-workflow.service";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import type { EnquiryStatus } from "@/types/enquiries";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requirePermission("enquiries.technical_review");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const body = (await request.json().catch(() => ({}))) as { notes?: string };
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const ref = db.collection(COLLECTIONS.enquiries).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Enquiry not found.", 404);
    const current = snap.data() ?? {};
    const from = String(current.status ?? "NEW") as EnquiryStatus;
    if (from !== "TECHNICAL_REVIEW") {
      validateTransition(from, "TECHNICAL_REVIEW");
    }
    const next = {
      status: "TECHNICAL_REVIEW",
      previousStatus: from,
      technicalReviewStatus: "IN_PROGRESS",
      technicalReviewer: actor.uid,
      technicalReviewStartedAt: nowIso(),
      technicalReviewNotes: body.notes ?? null,
      updatedAt: nowIso(),
      updatedBy: actor.uid,
    };
    await ref.set(next, { merge: true });
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "UPDATE",
      module: "enquiries",
      recordId: id,
      oldValue: from,
      newValue: "TECHNICAL_REVIEW",
    });
    return NextResponse.json({ enquiry: { id, ...current, ...next } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
