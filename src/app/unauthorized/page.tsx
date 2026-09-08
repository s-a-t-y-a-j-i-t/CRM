"use client";

import type { Route } from "next";
import { ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user, profile } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldOff className="size-7" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Access denied</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Your role does not include permission for this workspace area. If you need access, ask an
        administrator to review your role assignment.
      </p>
      <div className="mt-6 w-full max-w-sm rounded-xl border border-border bg-card p-4 text-left text-sm">
        <p className="font-medium">{user?.displayName ?? "Signed-in user"}</p>
        <p className="text-muted-foreground">{user?.email}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {profile?.employeeId ?? user?.employeeId} · {user?.roleName ?? user?.role} · {user?.department}
        </p>
      </div>
      <Button className="mt-6" onClick={() => router.push("/dashboard" as Route)}>
        Return to dashboard
      </Button>
    </div>
  );
}
