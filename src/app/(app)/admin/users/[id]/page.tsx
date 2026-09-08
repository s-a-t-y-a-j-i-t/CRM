"use client";

import type { Route } from "next";
import { use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline, TimelineItem } from "@/components/shared/timeline";
import { Can } from "@/components/rbac/can";
import { getUserById, listUserActivity } from "@/services/identity/user.service";
import { getRoleById } from "@/services/identity/role.service";
import { formatDate, formatDateTime } from "@/lib/dates";
import { useIdentityStore } from "@/stores/identity-store";

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const users = useIdentityStore((state) => state.users);
  const user = users.find((item) => item.id === id || item.firebaseUid === id) ?? getUserById(id);
  const role = user ? getRoleById(String(user.roleId)) : null;
  const activity = user ? listUserActivity(user.id) : [];

  if (!user) {
    return <EmptyState title="User not found" description="This employee profile is no longer available." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.displayName}
        description={`${user.employeeId} · ${user.designation}`}
        actions={
          <Can permission="users.update">
            <Button onClick={() => router.push(`/admin/users/${user.id}/edit` as Route)}>Edit</Button>
          </Can>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Employee ID" value={user.employeeId} />
            <Row label="Email" value={user.email} />
            <Row label="Phone" value={user.phone} />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge value={user.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Employment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Department" value={user.departmentName} />
            <Row label="Designation" value={user.designation} />
            <Row label="Joining date" value={formatDate(user.joiningDate)} />
            <Row label="Created" value={formatDate(user.createdAt)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Access & permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Role" value={user.roleName} />
            <Row label="Last login" value={formatDateTime(user.lastLoginAt)} />
            <p className="pt-2 text-xs text-muted-foreground">{role?.permissions.length ?? 0} permissions assigned to this role.</p>
          </CardContent>
        </Card>
      </section>

      <Card id="activity">
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <EmptyState title="No activity found" description="Login events and record changes will appear here." />
          ) : (
            <Timeline>
              {activity.map((entry) => (
                <TimelineItem
                  key={entry.id}
                  title={`${entry.action.replaceAll("_", " ")} · ${entry.module}`}
                  meta={formatDateTime(entry.timestamp)}
                >
                  <p className="text-xs text-muted-foreground">
                    {entry.recordId}
                    {entry.oldValue || entry.newValue ? ` · ${entry.oldValue ?? "—"} → ${entry.newValue ?? "—"}` : ""}
                  </p>
                </TimelineItem>
              ))}
            </Timeline>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit history</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <EmptyState title="No audit history" description="Administrative changes to this user are recorded automatically." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="py-2">When</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th>Actor</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((entry) => (
                    <tr key={entry.id} className="border-t border-border">
                      <td className="py-2">{formatDateTime(entry.timestamp)}</td>
                      <td>{entry.action}</td>
                      <td>{entry.module}</td>
                      <td>{entry.userEmail}</td>
                      <td>{entry.oldValue || entry.newValue ? `${entry.oldValue ?? "—"} → ${entry.newValue ?? "—"}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
