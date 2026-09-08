"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, FlaskConical, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME, COMPANY_NAME } from "@/config/app";
import { isDemoMode } from "@/lib/env";
import { toUserMessage } from "@/lib/errors";
import { loginSchema, type LoginValues } from "@/schemas/auth";
import { useAuth } from "@/hooks/useAuth";

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: isDemoMode() ? "tina.r@example.net" : "",
      password: "",
      remember: true,
    },
  });

  useEffect(() => {
    if (!loading && isAuthenticated) {
      const next = searchParams.get("next");
      router.replace((next && next.startsWith("/") ? next : "/dashboard") as Route);
    }
  }, [loading, isAuthenticated, router, searchParams]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email, values.password, values.remember);
      toast.success("Signed in");
      const next = searchParams.get("next");
      router.replace((next && next.startsWith("/") ? next : "/dashboard") as Route);
    } catch (error) {
      const message = toUserMessage(error);
      setFormError(message);
      toast.error(message);
    }
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_top_left,oklch(0.38_0.07_170),oklch(0.22_0.03_170)_55%,oklch(0.16_0.02_170))] text-white lg:flex">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px),radial-gradient(circle_at_80%_70%,white_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative z-10 flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <FlaskConical className="size-5" />
            </div>
            <div>
              <p className="text-lg font-semibold">{APP_NAME}</p>
              <p className="text-sm text-white/70">{COMPANY_NAME}</p>
            </div>
          </div>
          <div className="max-w-md space-y-4">
            <p className="text-3xl font-semibold tracking-tight">Precision manufacturing. Controlled access.</p>
            <p className="text-sm leading-6 text-white/75">
              Secure workspace for contract manufacturing operations — from customer onboarding through
              quality, dispatch, and collections.
            </p>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <ShieldCheck className="size-4" />
              Role-based access · audit-ready sessions
            </div>
          </div>
          <p className="text-xs text-white/50">Authorized personnel only. All sign-ins are logged.</p>
        </div>
      </aside>

      <main className="flex items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FlaskConical className="size-5" />
            </div>
            <div>
              <p className="font-semibold">{APP_NAME}</p>
              <p className="text-xs text-muted-foreground">{COMPANY_NAME}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-6 flex justify-center">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                Logo
              </div>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in with your company credentials.</p>
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" autoComplete="username" {...form.register("email")} />
                {form.formState.errors.email ? (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="pr-10"
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    className="absolute top-1.5 right-2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {form.formState.errors.password ? (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="size-4 accent-primary" {...form.register("remember")} />
                  Remember session
                </label>
                <Link href={"/forgot-password" as Route} className="text-primary hover:underline">
                  Forgot password
                </Link>
              </div>
              {formError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
            {isDemoMode() ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Demo mode is on. Use tina.r@example.net / Demo@12345, or any seeded role mailbox with the
                same password. Viewer: karen.d@example.net.
              </p>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
