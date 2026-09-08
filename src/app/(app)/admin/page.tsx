"use client";

import type { Route } from "next";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthLoading } from "@/components/auth/auth-loading";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/lib/rbac/guards";

export default function AdminIndexPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (hasPermission(user, "users.view")) {
      router.replace("/admin/users" as Route);
      return;
    }
    if (hasPermission(user, "roles.view")) {
      router.replace("/admin/roles" as Route);
      return;
    }
    if (hasPermission(user, "settings.manage")) {
      router.replace("/admin/settings" as Route);
      return;
    }
    router.replace("/unauthorized" as Route);
  }, [loading, user, router]);

  return <AuthLoading message="Opening administration…" />;
}
