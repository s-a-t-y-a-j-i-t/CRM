"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        {children}
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  );
}
