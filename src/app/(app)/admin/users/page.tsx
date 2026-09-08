"use client";

import type { Route } from "next";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterPanel } from "@/components/shared/filter-panel";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Can } from "@/components/rbac/can";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useIdentityStore } from "@/stores/identity-store";
import { listUsers, updateUserStatus, assignRole } from "@/services/identity/user.service";
import { formatDate, formatDateTime } from "@/lib/dates";
import { toUserMessage } from "@/lib/errors";
import { ACCOUNT_STATUSES, DEPARTMENTS, type AccountStatus, type IdentityProfile } from "@/types/identity";

export default function UsersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const users = useIdentityStore((state) => state.users);
  const roles = useIdentityStore((state) => state.roles);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AccountStatus | "">("");
  const [departmentId, setDepartmentId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<{ id: string; status: AccountStatus } | null>(null);
  const [assigning, setAssigning] = useState<IdentityProfile | null>(null);
  const [nextRole, setNextRole] = useState("");

  const result = useMemo(
    () => listUsers({ search, status, departmentId, roleId, page, pageSize: 10, sortBy: "createdAt" }, users),
    [users, search, status, departmentId, roleId, page],
  );

  const columns: DataTableColumn<IdentityProfile>[] = [
    { key: "employeeId", header: "Employee ID", render: (row) => row.employeeId },
    { key: "name", header: "Name", render: (row) => row.displayName },
    { key: "email", header: "Email", hideOnTablet: true, render: (row) => row.email },
    { key: "department", header: "Department", hideOnMobile: true, render: (row) => row.departmentName },
    { key: "designation", header: "Designation", hideOnTablet: true, render: (row) => row.designation },
    { key: "role", header: "Role", render: (row) => row.roleName },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    { key: "lastLogin", header: "Last Login", hideOnTablet: true, render: (row) => formatDateTime(row.lastLoginAt) },
    { key: "created", header: "Created Date", hideOnTablet: true, render: (row) => formatDate(row.createdAt) },
    {
      key: "actions",
      header: "Actions",
      hideOnMobile: true,
      render: (row) => (
        <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => router.push(`/admin/users/${row.id}` as Route)}>
            View
          </Button>
          <Can permission="users.update">
            <Button size="sm" variant="ghost" onClick={() => router.push(`/admin/users/${row.id}/edit` as Route)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAssigning(row); setNextRole(String(row.roleId)); }}>
              Assign Role
            </Button>
          </Can>
          <Can permission="users.deactivate">
            {row.status !== "ACTIVE" ? (
              <Button size="sm" variant="ghost" onClick={() => setPending({ id: row.id, status: "ACTIVE" })}>
                Activate
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setPending({ id: row.id, status: "INACTIVE" })}>
                Deactivate
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setPending({ id: row.id, status: "SUSPENDED" })}>
              Suspend
            </Button>
          </Can>
          <Button size="sm" variant="ghost" onClick={() => router.push(`/admin/users/${row.id}#activity` as Route)}>
            Activity
          </Button>
        </div>
      ),
    },
  ];

  async function applyStatus() {
    if (!pending || !user) return;
    try {
      await updateUserStatus(pending.id, pending.status, user);
      toast.success(`User ${pending.status.toLowerCase()}`);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setPending(null);
    }
  }

  async function applyRole() {
    if (!assigning || !user || !nextRole) return;
    try {
      await assignRole(assigning.id, nextRole, user);
      toast.success("Role updated");
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setAssigning(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        description="Employee directory, access status, and role assignment."
        actions={
          <Can permission="users.create">
            <Button onClick={() => router.push("/admin/users/new" as Route)}>Create user</Button>
          </Can>
        }
      />
      <FilterPanel>
        <div className="grid gap-3 md:grid-cols-4">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search ID, name, or email" />
          <Select value={status} onChange={(event) => { setStatus(event.target.value as AccountStatus | ""); setPage(1); }}>
            <option value="">All statuses</option>
            {ACCOUNT_STATUSES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </Select>
          <Select value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setPage(1); }}>
            <option value="">All departments</option>
            {DEPARTMENTS.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
          <Select value={roleId} onChange={(event) => { setRoleId(event.target.value); setPage(1); }}>
            <option value="">All roles</option>
            {roles.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
        </div>
      </FilterPanel>
      {result.items.length === 0 ? (
        <EmptyState title="No users found" description="Adjust filters or create a new employee profile." />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <DataTable columns={columns} rows={result.items} onRowClick={(row) => router.push(`/admin/users/${row.id}` as Route)} />
          <div className="border-t border-border px-4 py-3">
            <Pagination page={result.page} hasMore={result.hasMore} total={result.total} onPageChange={setPage} />
          </div>
        </div>
      )}
      {pending ? (
        <ConfirmDialog
          title={`${pending.status === "ACTIVE" ? "Activate" : pending.status === "SUSPENDED" ? "Suspend" : "Deactivate"} user`}
          description="This change is audited and immediately affects workspace access."
          confirmLabel="Confirm"
          onCancel={() => setPending(null)}
          onConfirm={() => void applyStatus()}
        />
      ) : null}
      {assigning ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Assign role</h2>
            <p className="mt-1 text-sm text-muted-foreground">{assigning.displayName}</p>
            <Select className="mt-4" value={nextRole} onChange={(event) => setNextRole(event.target.value)}>
              {roles.filter((role) => role.status === "ACTIVE").map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </Select>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAssigning(null)}>Cancel</Button>
              <Button onClick={() => void applyRole()}>Save</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
