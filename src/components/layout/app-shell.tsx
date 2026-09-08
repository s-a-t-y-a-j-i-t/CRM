"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { RouteGuard } from "@/components/auth/route-guard";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RouteGuard>
      <div className="min-h-screen bg-background">
        <div
          className={cn(
            "hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col lg:border-r lg:border-border",
            collapsed ? "lg:w-16" : "lg:w-64",
          )}
        >
          <Sidebar />
        </div>
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative h-full w-72 shadow-xl">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        ) : null}
        <div className={cn(collapsed ? "lg:pl-16" : "lg:pl-64")}>
          <Topbar onMenu={() => setMobileOpen(true)} />
          <main className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-4">
              <Breadcrumbs />
            </div>
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
