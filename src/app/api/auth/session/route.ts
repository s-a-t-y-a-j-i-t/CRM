import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_DAYS } from "@/config/app";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { DEMO_PASSWORDS, createDemoDatabase } from "@/lib/seed/demo-data";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";

const maxAge = SESSION_MAX_AGE_DAYS * 24 * 60 * 60;

function cookieOptions(remember: boolean) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge } : {}),
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    idToken?: string;
    demoUserId?: string;
    email?: string;
    remember?: boolean;
  };
  const jar = await cookies();
  const remember = body.remember !== false;

  if (body.idToken) {
    const auth = getAdminAuth();
    const db = getAdminDb();
    if (!auth) {
      return NextResponse.json({ error: "Admin SDK is not configured." }, { status: 500 });
    }
    const decoded = await auth.verifyIdToken(body.idToken);
    if (db) {
      const profile = await db.collection(COLLECTIONS.users).doc(decoded.uid).get();
      const status = profile.data()?.status as string | undefined;
      if (profile.exists && status && status !== "ACTIVE") {
        return NextResponse.json(
          { error: "This account has been disabled. Contact your administrator." },
          { status: 403 },
        );
      }
      if (profile.exists) {
        await profile.ref.set({ lastLoginAt: nowIso(), updatedAt: nowIso() }, { merge: true });
      }
    }
    let sessionValue = decoded.uid;
    try {
      sessionValue = await auth.createSessionCookie(body.idToken, { expiresIn: maxAge * 1000 });
    } catch {
      sessionValue = decoded.uid;
    }
    jar.set(SESSION_COOKIE_NAME, sessionValue, cookieOptions(remember));
    await writeAuditLog({
      userId: decoded.uid,
      userName: decoded.email ?? decoded.uid,
      action: "LOGIN",
      module: "users",
      recordId: decoded.uid,
    });
    return NextResponse.json({ ok: true });
  }

  if (body.demoUserId && body.email && DEMO_PASSWORDS[body.email.toLowerCase()]) {
    const exists = createDemoDatabase().users.some((user) => user.id === body.demoUserId);
    if (!exists) {
      return NextResponse.json({ error: "Unknown demo user." }, { status: 401 });
    }
    jar.set(SESSION_COOKIE_NAME, `demo:${body.demoUserId}`, cookieOptions(remember));
    return NextResponse.json({ ok: true, mode: "demo" });
  }

  return NextResponse.json({ error: "Invalid session request." }, { status: 400 });
}

export async function DELETE() {
  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE_NAME)?.value;
  jar.delete(SESSION_COOKIE_NAME);
  if (session && !session.startsWith("demo:")) {
    await writeAuditLog({
      userId: session.slice(0, 64),
      userName: "session",
      action: "LOGOUT",
      module: "users",
      recordId: "session",
    });
  }
  return NextResponse.json({ ok: true });
}
