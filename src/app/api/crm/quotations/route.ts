import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { createQuotationSchema } from "@/schemas/quotations";
import { allocateQuotationNumber } from "@/services/quotations/quotation-code.server";
import { buildQuotationSearchIndex, formatQuotationDisplay } from "@/services/quotations/quotation-code";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("quotations.create");
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = createQuotationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Quotation details are incomplete." }, { status: 400 });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const quotationNumber = await allocateQuotationNumber();
    const now = nowIso();
    const payload = {
      ...parsed.data,
      quotationNumber,
      displayNumber: formatQuotationDisplay(quotationNumber, 1),
      version: 1,
      status: "DRAFT",
      approvalStatus: "NOT_SUBMITTED",
      searchIndex: buildQuotationSearchIndex({ quotationNumber, displayNumber: formatQuotationDisplay(quotationNumber, 1) }),
      createdAt: now,
      updatedAt: now,
      createdBy: actor.uid,
      updatedBy: actor.uid,
    };
    const ref = await db.collection(COLLECTIONS.quotations).add(payload);
    await ref.set({ familyId: ref.id }, { merge: true });
    await writeAuditLog({ userId: actor.uid, userName: actor.displayName, action: "CREATE", module: "quotations", recordId: ref.id, newValue: quotationNumber });
    return NextResponse.json({ quotation: { id: ref.id, familyId: ref.id, ...payload } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
