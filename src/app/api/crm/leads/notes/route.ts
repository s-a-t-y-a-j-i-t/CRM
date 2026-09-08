import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { leadNoteSchema } from "@/schemas/leads";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("leads.update");
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const body = (await request.json()) as { leadId?: string; text?: string };
    const parsed = leadNoteSchema.safeParse({ text: body.text });
    if (!parsed.success || !body.leadId) {
      return NextResponse.json({ error: "Enter a note." }, { status: 400 });
    }
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const payload = {
      leadId: body.leadId,
      text: parsed.data.text,
      createdAt: nowIso(),
      createdBy: actor.uid,
      createdByName: actor.displayName,
    };
    const ref = await db.collection(COLLECTIONS.leadNotes).add(payload);
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "CREATE",
      module: "leads",
      recordId: body.leadId,
      newValue: "NOTE_ADDED",
    });
    return NextResponse.json({ note: { id: ref.id, ...payload } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
