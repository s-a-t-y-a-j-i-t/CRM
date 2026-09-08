import { AppError } from "@/lib/errors";
import type { PermissionKey } from "@/types/rbac";

export async function authorizeClient(permission: PermissionKey): Promise<void> {
  const response = await fetch("/api/admin/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permission }),
  });
  if (response.ok) return;
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  throw new AppError(
    response.status === 403 ? "FORBIDDEN" : "UNAUTHENTICATED",
    data.error ?? "You do not have permission for this action.",
    response.status,
  );
}
