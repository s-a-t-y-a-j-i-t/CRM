"use client";

import { useState } from "react";
import type { ZodType } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toUserMessage } from "@/lib/errors";
import { can } from "@/lib/rbac/can";
import { toTitleCase } from "@/lib/utils";
import { useAppStore, type ResourceName } from "@/services/store";
import { useAuth } from "@/hooks/useAuth";
import type { PermissionKey } from "@/types/rbac";
import { DEFAULT_PAGE_SIZE } from "@/config/app";

export interface ColumnConfig {
  key: string;
  label: string;
  badge?: boolean;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface ResourceConfig {
  title: string;
  description: string;
  resource: ResourceName;
  createPermission: PermissionKey;
  deletePermission: PermissionKey;
  columns: ColumnConfig[];
  fields: FieldConfig[];
  schema: ZodType;
  searchPlaceholder: string;
  filterKey?: string;
  filterOptions?: { value: string; label: string }[];
  defaults?: Record<string, string | number | boolean>;
}

export function ResourcePage({ config }: { config: ResourceConfig }) {
  const { user } = useAuth();
  const list = useAppStore((state) => state.list);
  const create = useAppStore((state) => state.create);
  const archive = useAppStore((state) => state.archive);
  useAppStore((state) => state.db[config.resource]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState(config.columns[0]?.key ?? "updatedAt");
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(config.fields.map((field) => [field.name, String(config.defaults?.[field.name] ?? "")])),
  );

  let result = null;
  let error: string | null = null;
  if (user) {
    try {
      result = list(config.resource, {
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        search,
        sortBy,
        sortDirection: "desc",
        filters: config.filterKey ? { [config.filterKey]: filter } : undefined,
      }, user);
    } catch (caught) {
      error = toUserMessage(caught);
    }
  }

  if (!user) return null;

  const onCreate = () => {
    try {
      const parsed = config.schema.parse({
        ...config.defaults,
        ...Object.fromEntries(
          config.fields.map((field) => {
            const raw = form[field.name];
            if (field.type === "number") return [field.name, raw ? Number(raw) : undefined];
            return [field.name, raw || undefined];
          }),
        ),
        ownerUserId: form.ownerUserId || user.uid,
        assignedUserId: form.assignedUserId || user.uid,
        receivedBy: form.receivedBy || user.uid,
        uploadedBy: form.uploadedBy || user.uid,
      });
      create(config.resource, parsed as never, user);
      toast.success(`${config.title.slice(0, -1)} created`);
      setOpen(false);
    } catch (caught) {
      toast.error(toUserMessage(caught));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          can(user, config.createPermission) ? (
            <Button onClick={() => setOpen(true)}>New record</Button>
          ) : null
        }
      />
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={config.searchPlaceholder}
            aria-label="Search"
          />
          {config.filterKey && config.filterOptions ? (
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter"
            >
              <option value="all">All statuses</option>
              {config.filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </Card>

      {error ? <ErrorState message={error} /> : null}
      {!result ? (
        <Skeleton className="h-80" />
      ) : result.items.length === 0 ? (
        <EmptyState title={`No ${config.title.toLowerCase()}`} description="Try a different search or create a record." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  {config.columns.map((column) => (
                    <th key={column.key} className="px-4 py-3 font-medium">
                      <button type="button" onClick={() => setSortBy(column.key)}>
                        {column.label}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => {
                  const record = item as unknown as Record<string, unknown>;
                  return (
                    <tr key={String(record.id)} className="border-t border-border">
                      {config.columns.map((column) => {
                        const value = String(record[column.key] ?? "—");
                        return (
                          <td key={column.key} className="px-4 py-3">
                            {column.badge ? <StatusBadge value={value} /> : value}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3">
                        {can(user, config.deletePermission) ? (
                          pendingId === record.id ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  archive(config.resource, String(record.id), user);
                                  toast.success("Record archived");
                                  setPendingId(null);
                                }}
                              >
                                Confirm
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setPendingId(null)}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => setPendingId(String(record.id))}>
                              Archive
                            </Button>
                          )
                        ) : (
                          <span className="text-muted-foreground">View</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <p>
              {result.total} records · page {result.page}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={!result.hasMore} onClick={() => setPage((value) => value + 1)}>
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl">
            <h2 className="text-lg font-semibold">New {config.title.slice(0, -1)}</h2>
            <div className="mt-4 grid gap-3">
              {config.fields.map((field) => (
                <div key={field.name} className="space-y-1.5">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      id={field.name}
                      value={form[field.name] ?? ""}
                      onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                    />
                  ) : field.type === "select" ? (
                    <select
                      id={field.name}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form[field.name] ?? ""}
                      onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                    >
                      <option value="">Select</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type}
                      value={form[field.name] ?? ""}
                      onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={onCreate}>Save</Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Values such as {toTitleCase("status")} are validated before write and written to the audit log.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
