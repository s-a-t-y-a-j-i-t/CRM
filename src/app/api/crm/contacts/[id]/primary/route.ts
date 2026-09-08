import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { isDemoMode } from "@/lib/env";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requirePermission("contacts.update");
    await context.params;
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, mode: "demo" });
    }
    return NextResponse.json({ error: "Use the Admin SDK customer contact batch in production." }, { status: 501 });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
