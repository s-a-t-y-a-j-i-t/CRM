"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { RoleForm } from "@/features/admin/roles/role-form";
import { useAuth } from "@/hooks/useAuth";
import { createRole } from "@/services/identity/role.service";
import { toUserMessage } from "@/lib/errors";
import type { RoleFormValues } from "@/schemas/identity";
import type { PermissionKey } from "@/types/rbac";

export default function NewRolePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(values: RoleFormValues) {
    if (!user) return;
    setSubmitting(true);
    try {
      await createRole(
        {
          name: values.name,
          description: values.description,
          status: values.status,
          permissions: values.permissions as PermissionKey[],
        },
        user,
      );
      toast.success("Role created");
      router.push("/admin/roles" as Route);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Create role" description="Name the role and select permissions from the matrix." />
      <RoleForm
        submitting={submitting}
        onSubmit={onSubmit}
        defaultValues={{ name: "", description: "", status: "ACTIVE", permissions: ["dashboard.view"] }}
      />
    </div>
  );
}
