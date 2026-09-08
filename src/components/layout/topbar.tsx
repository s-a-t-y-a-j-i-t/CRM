"use client";

import type { Route } from "next";
import { Bell, ChevronsLeft, ChevronsRight, Menu, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useUiStore } from "@/stores/ui-store";
import { useAppStore } from "@/services/store";
import { filterNotificationsForUser } from "@/services/reminders";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const notifications = useAppStore((state) => state.db.notifications);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const unread = user
    ? filterNotificationsForUser(notifications, user).filter((item) => !item.readBy.includes(user.uid)).length
    : 0;

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    router.replace("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-border bg-card/80 px-3 backdrop-blur sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open navigation">
          <Menu />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
        </Button>
        <label className="relative hidden max-w-sm flex-1 md:block">
          <span className="sr-only">Workspace search</span>
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search records…"
            className="pl-9"
          />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => router.push("/notifications")}>
          <span className="relative">
            <Bell />
            {unread > 0 ? (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                {unread}
              </span>
            ) : null}
          </span>
        </Button>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="h-auto gap-2 py-1 pr-3 pl-1"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" className="size-full object-cover" />
              ) : (
                initials(user?.displayName ?? "U")
              )}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-semibold leading-tight">{user?.displayName}</span>
              <span className="block text-[11px] text-muted-foreground leading-tight">
                {user?.designation ?? profile?.designation} · {user?.roleName ?? user?.role}
              </span>
            </span>
          </Button>
          {menuOpen ? (
            <div role="menu" className="absolute right-0 z-40 mt-2 w-60 rounded-md border border-border bg-card p-2 shadow-lg">
              <div className="border-b border-border px-2 pb-2 mb-1">
                <p className="text-sm font-medium">{user?.displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              {[
                { label: "My Profile", href: "/profile" },
                { label: "Account Settings", href: "/profile#account" },
                { label: "Notifications", href: "/notifications" },
              ].map((item) => (
                <button
                  key={item.href}
                  type="button"
                  role="menuitem"
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push(item.href as Route);
                  }}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                role="menuitem"
                className="w-full rounded-md px-2 py-1.5 text-left text-sm text-destructive hover:bg-muted"
                onClick={() => void handleLogout()}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
