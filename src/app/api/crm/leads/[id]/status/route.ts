import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { leadStatusSchema } from "@/schemas/leads";
import { validateTransition } from "@/services/leads/lead-workflow.service";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import type { LeadStatus } from "@/types/leads";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requirePermission("leads.change_status");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = leadStatusSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status change." }, { status: 400 });
    }
    if (parsed.data.status === "WON") {
      throw new AppError("VALIDATION", "Use the conversion workflow to mark a lead as won.", 400);
    }
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const ref = db.collection(COLLECTIONS.leads).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Lead not found.", 404);
    const current = snap.data() ?? {};
    const from = String(current.status ?? "NEW") as LeadStatus;
    validateTransition(from, parsed.data.status);
    if (parsed.data.status === "LOST" && !parsed.data.lostReason) {
      throw new AppError("VALIDATION", "A lost reason is required.", 400);
    }
    const next = {
      status: parsed.data.status,
      previousStatus: parsed.data.status === "ON_HOLD" || parsed.data.status === "LOST" ? from : current.previousStatus ?? null,
      lostReason: parsed.data.status === "LOST" ? parsed.data.lostReason ?? null : current.lostReason ?? null,
      lostNotes: parsed.data.status === "LOST" ? parsed.data.lostNotes ?? null : current.lostNotes ?? null,
      lostAt: parsed.data.status === "LOST" ? nowIso() : current.lostAt ?? null,
      lostBy: parsed.data.status === "LOST" ? actor.uid : current.lostBy ?? null,
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
      oldValue: from,
      newValue: parsed.data.status,
    });
    return NextResponse.json({ lead: { id, ...current, ...next } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
