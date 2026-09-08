"use client";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { filterNotificationsForUser } from "@/services/reminders";
import { useAppStore } from "@/services/store";
import { useAuth } from "@/hooks/useAuth";

export default function NotificationsPage() {
  const { user } = useAuth();
  const notifications = useAppStore((state) => state.db.notifications);
  const update = useAppStore((state) => state.update);
  if (!user) return null;
  const visible = filterNotificationsForUser(notifications, user);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notification center"
        description="Role-scoped reminders for follow-ups, quotations, documents, complaints and collections."
      />
      {visible.length === 0 ? (
        <EmptyState title="No notifications" description="Operational reminders will appear here for your role." />
      ) : (
        <div className="space-y-3">
          {visible.map((notification) => (
            <Card key={notification.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-1">
                    <StatusBadge value={notification.kind} />
                  </div>
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-sm text-muted-foreground">{notification.body}</p>
                </div>
                {!notification.readBy.includes(user.uid) ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      update("notifications", notification.id, { readBy: [...notification.readBy, user.uid] }, user)
                    }
                  >
                    Mark read
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Read</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
