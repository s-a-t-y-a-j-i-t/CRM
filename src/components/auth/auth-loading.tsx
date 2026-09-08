import { FlaskConical } from "lucide-react";
import { APP_NAME } from "@/config/app";

export function AuthLoading({ message = "Securing your workspace…" }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
        <FlaskConical className="size-6" />
      </div>
      <p className="mt-4 text-sm font-semibold tracking-tight">{APP_NAME}</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  );
}
