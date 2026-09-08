"use client";

import { use, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RoleForm } from "@/features/admin/roles/role-form";
import { useAuth } from "@/hooks/useAuth";
import { getRoleById, updateRole } from "@/services/identity/role.service";
import { useIdentityStore } from "@/stores/identity-store";
import { toUserMessage } from "@/lib/errors";
import type { RoleFormValues } from "@/schemas/identity";
import type { PermissionKey } from "@/types/rbac";

export default function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const roles = useIdentityStore((state) => state.roles);
  const role = roles.find((item) => item.id === id) ?? getRoleById(id);
  const [submitting, setSubmitting] = useState(false);

  if (!role) {
    return <EmptyState title="Role not found" description="This role is no longer available." />;
  }

  const current = role;

  async function onSubmit(values: RoleFormValues) {
    if (!user) return;
    setSubmitting(true);
    try {
      await updateRole(
        current.id,
        {
          name: values.name,
          description: values.description,
          status: values.status,
          permissions: values.permissions as PermissionKey[],
        },
        user,
      );
      toast.success("Role updated");
      router.push("/admin/roles" as Route);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${current.name}`}
        description={current.isSystem ? "System role. Prefer deactivation over deletion." : "Custom role permissions."}
      />
      <RoleForm
        submitting={submitting}
        onSubmit={onSubmit}
        defaultValues={{
          name: current.name,
          description: current.description,
          status: current.status,
          permissions: current.permissions,
        }}
      />
    </div>
  );
}
