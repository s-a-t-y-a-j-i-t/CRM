import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { productFormSchema } from "@/schemas/products";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("products.update");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = productFormSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields and try again." }, { status: 400 });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const ref = db.collection(COLLECTIONS.products).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Product not found.", 404);
    const current = snap.data() ?? {};
    const next = { ...parsed.data, productCode: current.productCode, createdAt: current.createdAt, createdBy: current.createdBy, updatedAt: nowIso(), updatedBy: actor.uid };
    await ref.set(next, { merge: true });
    await writeAuditLog({ userId: actor.uid, userName: actor.displayName, action: "UPDATE", module: "products", recordId: id, oldValue: String(current.productName ?? ""), newValue: parsed.data.productName });
    return NextResponse.json({ product: { id, ...current, ...next } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
