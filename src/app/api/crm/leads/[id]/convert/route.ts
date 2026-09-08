import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { leadConvertSchema } from "@/schemas/leads";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requirePermission("leads.convert");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = leadConvertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Conversion details are incomplete." }, { status: 400 });
    }
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const ref = db.collection(COLLECTIONS.leads).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Lead not found.", 404);
    const current = snap.data() ?? {};
    if (current.convertedEnquiryId) {
      throw new AppError("CONFLICT", "This lead has already been converted.", 409);
    }
    const customerId = String(body.customerId || parsed.data.customerId || "");
    if (!customerId) {
      throw new AppError("VALIDATION", "A customer is required to convert this lead.", 400);
    }
    const enquiryId = parsed.data.createEnquiry
      ? String(body.enquiryId || `enq_${crypto.randomUUID().slice(0, 8)}`)
      : (current.convertedEnquiryId as string | undefined) ?? null;
    const next = {
      status: enquiryId ? "ENQUIRY_CREATED" : "WON",
      customerId,
      contactId: body.contactId || parsed.data.contactId || current.contactId || null,
      convertedCustomerId: customerId,
      convertedEnquiryId: enquiryId,
      convertedAt: nowIso(),
      updatedAt: nowIso(),
      updatedBy: actor.uid,
    };
    await ref.set(next, { merge: true });
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "UPDATE",
      module: "leads",
      recordId: id,
      oldValue: String(current.status ?? ""),
      newValue: "LEAD_CONVERTED",
    });
    return NextResponse.json({ lead: { id, ...current, ...next } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
