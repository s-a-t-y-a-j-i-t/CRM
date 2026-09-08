import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { productFormSchema } from "@/schemas/products";
import { allocateProductCode } from "@/services/products/product-code.server";
import { buildProductSearchIndex } from "@/services/products/product-code";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("products.create");
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = productFormSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields and try again." }, { status: 400 });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const productCode = await allocateProductCode();
    const now = nowIso();
    const values = parsed.data;
    const payload = {
      ...values,
      productCode,
      searchIndex: buildProductSearchIndex({ ...values, productCode }),
      createdAt: now,
      updatedAt: now,
      createdBy: actor.uid,
      updatedBy: actor.uid,
    };
    const ref = await db.collection(COLLECTIONS.products).add(payload);
    await writeAuditLog({ userId: actor.uid, userName: actor.displayName, action: "CREATE", module: "products", recordId: ref.id, newValue: productCode });
    return NextResponse.json({ product: { id: ref.id, ...payload } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
