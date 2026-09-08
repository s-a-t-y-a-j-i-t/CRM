import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import type { PermissionKey } from "@/types/rbac";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { permission?: PermissionKey };
    if (!body.permission) {
      return NextResponse.json({ error: "Permission is required." }, { status: 400 });
    }
    const user = await requirePermission(body.permission);
    return NextResponse.json({
      ok: true,
      user: { uid: user.uid, email: user.email, role: user.role },
    });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
