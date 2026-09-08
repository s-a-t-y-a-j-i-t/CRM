"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toTitleCase } from "@/lib/utils";

export function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href="/dashboard" className="hover:text-foreground">
            Home
          </Link>
        </li>
        {parts.map((part, index) => {
          const href = `/${parts.slice(0, index + 1).join("/")}`;
          const last = index === parts.length - 1;
          return (
            <li key={href} className="flex items-center gap-1">
              <span>/</span>
              {last ? (
                <span className="text-foreground">{toTitleCase(part)}</span>
              ) : (
                <Link href={href as Route} className="hover:text-foreground">
                  {toTitleCase(part)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
