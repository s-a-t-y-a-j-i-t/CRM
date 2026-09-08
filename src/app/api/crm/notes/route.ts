import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { customerNoteSchema } from "@/schemas/crm";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("customer_notes.create");
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, mode: "demo" });
    }
    const body = await request.json();
    const parsed = customerNoteSchema.safeParse(body);
    const customerId = String(body.customerId ?? "");
    if (!parsed.success || !customerId) {
      return NextResponse.json({ error: "Enter a note." }, { status: 400 });
    }
    const db = getAdminDb();
    if (!db) {
      throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required to add notes.", 500);
    }
    const payload = {
      customerId,
      text: parsed.data.text,
      createdAt: nowIso(),
      createdBy: actor.uid,
      createdByName: actor.displayName,
    };
    const ref = await db.collection(COLLECTIONS.customers).doc(customerId).collection("notes").add(payload);
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "CREATE",
      module: "customers",
      recordId: customerId,
      newValue: "NOTE_ADDED",
    });
    return NextResponse.json({ note: { id: ref.id, ...payload } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
