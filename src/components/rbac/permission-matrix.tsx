"use client";

import { PERMISSION_GROUPS, toPermission } from "@/constants/permissions";
import type { PermissionAction, PermissionKey } from "@/types/rbac";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
  approve: "Approve",
  export: "Export",
  manage: "Manage",
  close: "Close",
  deactivate: "Deactivate",
  change_status: "Status",
  upload: "Upload",
  assign: "Assign",
  convert: "Convert",
  view_all: "View all",
  technical_review: "Tech review",
  version: "Version",
  review: "Review",
  final_decision: "Decision",
  calculate: "Calculate",
  adjust: "Adjust",
  submit: "Submit",
  reject: "Reject",
  discount: "Discount",
  send: "Send",
  cancel: "Cancel",
  revise: "Revise",
};

export function PermissionMatrix({
  value,
  onChange,
  readOnly = false,
}: {
  value: PermissionKey[];
  onChange?: (next: PermissionKey[]) => void;
  readOnly?: boolean;
}) {
  function toggle(permission: PermissionKey, checked: boolean) {
    if (!onChange) return;
    if (checked) {
      onChange(Array.from(new Set([...value, permission])));
      return;
    }
    onChange(value.filter((item) => item !== permission));
  }

  return (
    <div className="space-y-6">
      {PERMISSION_GROUPS.map((group) => {
        const actions = Array.from(new Set(group.rows.flatMap((row) => row.actions)));
        return (
          <section key={group.id} className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">{group.label}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase">
                    <th className="px-4 py-2 font-medium">Module</th>
                    {actions.map((action) => (
                      <th key={action} className="px-3 py-2 text-center font-medium">
                        {ACTION_LABELS[action]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={row.label} className="border-t border-border/70">
                      <td className="px-4 py-2.5 font-medium">{row.label}</td>
                      {actions.map((action) => {
                        const available = row.actions.includes(action);
                        const permission = toPermission(row.module, action);
                        const checked = value.includes(permission);
                        return (
                          <td key={action} className="px-3 py-2.5 text-center">
                            {available ? (
                              <input
                                type="checkbox"
                                className={cn("size-4 accent-primary", readOnly && "pointer-events-none opacity-80")}
                                checked={checked}
                                disabled={readOnly}
                                onChange={(event) => toggle(permission, event.target.checked)}
                                aria-label={`${row.label} ${ACTION_LABELS[action]}`}
                              />
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
