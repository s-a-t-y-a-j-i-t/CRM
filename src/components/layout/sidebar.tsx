"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { NAVIGATION } from "@/config/navigation";
import { APP_NAME } from "@/config/app";
import { can } from "@/lib/rbac/can";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUiStore } from "@/stores/ui-store";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className={cn("flex items-center gap-2 border-b border-border py-4", collapsed ? "justify-center px-2" : "px-5")}>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FlaskConical className="size-4" />
        </div>
        {collapsed ? null : (
          <div>
            <p className="text-sm font-semibold tracking-tight">{APP_NAME}</p>
            <p className="text-[11px] text-muted-foreground">Contract manufacturing</p>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4" aria-label="Primary">
        {NAVIGATION.map((section) => {
          const items = section.items.filter((item) => can(user, item.permission));
          if (items.length === 0) return null;
          return (
            <div key={section.title}>
              {collapsed ? null : (
                <p className="mb-2 px-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={`${section.title}-${item.href}`}
                      href={item.href as Route}
                      onClick={onNavigate}
                      title={item.title}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                        collapsed && "justify-center px-2",
                        active
                          ? "bg-accent font-medium text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {collapsed ? <span className="sr-only">{item.title}</span> : item.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
