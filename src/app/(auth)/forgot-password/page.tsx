"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/config/app";
import { toUserMessage } from "@/lib/errors";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/schemas/auth";
import { requestPasswordReset } from "@/services/auth/auth.service";

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const message = await requestPasswordReset(values.email);
      setSuccess(message);
    } catch (err) {
      setError(toUserMessage(err));
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FlaskConical className="size-5" />
        </div>
        <h1 className="text-xl font-semibold">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Reset your workspace password.</p>
        {success ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            {success}
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" autoComplete="username" {...form.register("email")} />
              {form.formState.errors.email ? (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Sending…" : "Send reset instructions"}
            </Button>
          </form>
        )}
        <p className="mt-5 text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Return to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
