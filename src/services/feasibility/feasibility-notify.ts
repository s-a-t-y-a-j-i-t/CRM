import { isDemoMode } from "@/lib/env";
import { nowIso } from "@/lib/dates";
import { useAppStore } from "@/services/store";
import { createNotification } from "@/services/notifications/notification.service";
import type { AppNotification, NotificationKind } from "@/types/activity";
import type { AuthenticatedUser } from "@/types/rbac";

export async function notifyFeasibilityEvent(input: {
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  recipientId: string;
  feasibilityId: string;
  actor: AuthenticatedUser;
}): Promise<void> {
  const now = nowIso();
  if (isDemoMode()) {
    const notification: AppNotification = {
      id: `ntf_${crypto.randomUUID().slice(0, 8)}`,
      kind: input.kind,
      title: input.title,
      body: input.body,
      href: input.href,
      recipientUserIds: [input.recipientId],
      audienceRoles: ["business_development", "sales_manager"],
      readBy: [],
      relatedType: "feasibility",
      relatedId: input.feasibilityId,
      createdAt: now,
      updatedAt: now,
      createdBy: input.actor.uid,
      updatedBy: input.actor.uid,
      status: "active",
    };
    const db = useAppStore.getState().db;
    useAppStore.setState({ db: { ...db, notifications: [notification, ...db.notifications] } });
    return;
  }
  try {
    await createNotification({
      type: input.kind,
      title: input.title,
      message: input.body,
      recipientId: input.recipientId,
      relatedModule: "feasibility",
      relatedRecordId: input.feasibilityId,
    });
  } catch {
    // Best-effort.
  }
}
