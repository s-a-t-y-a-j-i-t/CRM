import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { isDemoMode } from "@/lib/env";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await context.params;
    await requirePermission("quotation_pdf.export");
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    return NextResponse.json({ error: "Generate the PDF from the quotation preview in this session." }, { status: 501 });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
