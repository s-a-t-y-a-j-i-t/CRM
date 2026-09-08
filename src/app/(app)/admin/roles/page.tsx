"use client";

import type { Route } from "next";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/rbac/can";
import { useAuth } from "@/hooks/useAuth";
import { useIdentityStore } from "@/stores/identity-store";
import { updateRole } from "@/services/identity/role.service";
import { toUserMessage } from "@/lib/errors";
import type { AppRole } from "@/types/identity";

export default function RolesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const roles = useIdentityStore((state) => state.roles);
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<AppRole | null>(null);

  const rows = useMemo(
    () => roles.filter((role) => role.name.toLowerCase().includes(search.trim().toLowerCase())),
    [roles, search],
  );

  const columns: DataTableColumn<AppRole>[] = [
    { key: "name", header: "Role", render: (row) => row.name },
    { key: "description", header: "Description", hideOnMobile: true, render: (row) => row.description },
    { key: "permissions", header: "Permissions", hideOnTablet: true, render: (row) => String(row.permissions.length) },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    {
      key: "system",
      header: "Type",
      hideOnTablet: true,
      render: (row) => (row.isSystem ? "System" : "Custom"),
    },
    {
      key: "actions",
      header: "Actions",
      hideOnMobile: true,
      render: (row) => (
        <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => setViewing(row)}>View</Button>
          <Can permission="roles.update">
            <Button size="sm" variant="ghost" onClick={() => router.push(`/admin/roles/${row.id}/edit` as Route)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                if (!user) return;
                try {
                  await updateRole(row.id, { status: row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }, user);
                  toast.success(row.status === "ACTIVE" ? "Role deactivated" : "Role activated");
                } catch (error) {
                  toast.error(toUserMessage(error));
                }
              }}
            >
              {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Roles"
        description="System and custom roles. Critical roles can be deactivated but not deleted."
        actions={
          <Can permission="roles.create">
            <Button onClick={() => router.push("/admin/roles/new" as Route)}>Create role</Button>
          </Can>
        }
      />
      <SearchInput value={search} onChange={setSearch} placeholder="Search roles" />
      {rows.length === 0 ? (
        <EmptyState title="No roles found" description="Create a custom role or clear the search." />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <DataTable columns={columns} rows={rows} />
        </div>
      )}
      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl">
            <h2 className="text-lg font-semibold">{viewing.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{viewing.description}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {viewing.isSystem ? "System role — deactivate instead of deleting." : "Custom role"}
            </p>
            <ul className="mt-4 grid gap-1 text-xs sm:grid-cols-2">
              {viewing.permissions.map((permission) => (
                <li key={permission} className="rounded-md bg-muted px-2 py-1">{permission}</li>
              ))}
            </ul>
            <div className="mt-5 flex justify-end">
              <Button variant="ghost" onClick={() => setViewing(null)}>Close</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
