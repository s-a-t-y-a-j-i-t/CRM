import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/config/app";

const PUBLIC_PATHS = new Set(["/login", "/forgot-password"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    PUBLIC_PATHS.has(pathname)
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
