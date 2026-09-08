"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionMatrix } from "@/components/rbac/permission-matrix";
import { Select } from "@/components/ui/select";
import { useIdentityStore } from "@/stores/identity-store";

export default function PermissionsPage() {
  const roles = useIdentityStore((state) => state.roles);
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const selected = roles.find((role) => role.id === roleId) ?? roles[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Permissions"
        description="Grouped permission catalog. Edit assignments from the role form — this view is a reference matrix."
      />
      <Select value={selected?.id ?? ""} onChange={(event) => setRoleId(event.target.value)}>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </Select>
      {selected ? <PermissionMatrix value={selected.permissions} readOnly /> : null}
    </div>
  );
}
