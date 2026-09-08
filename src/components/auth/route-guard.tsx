"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthLoading } from "@/components/auth/auth-loading";
import { useAuth } from "@/hooks/useAuth";
import { permissionForPath } from "@/lib/auth/route-permissions";
import { hasPermission } from "@/lib/rbac/guards";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const required = permissionForPath(pathname);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (required && !hasPermission(user, required)) {
      router.replace("/unauthorized");
    }
  }, [loading, isAuthenticated, required, user, pathname, router]);

  if (loading || !isAuthenticated) {
    return <AuthLoading />;
  }

  if (required && !hasPermission(user, required)) {
    return <AuthLoading message="Checking authorization…" />;
  }

  return children;
}
