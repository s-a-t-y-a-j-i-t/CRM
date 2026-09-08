import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { isDemoMode } from "@/lib/env";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("costing.calculate");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo", costingId: id });
    return NextResponse.json({ ok: true, costingId: id });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
