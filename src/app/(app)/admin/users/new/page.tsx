"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { UserForm } from "@/features/admin/users/user-form";
import { useAuth } from "@/hooks/useAuth";
import { createUserProfile } from "@/services/identity/user.service";
import { nextEmployeeId } from "@/services/identity/employee-id";
import { useIdentityStore } from "@/stores/identity-store";
import { todayIso } from "@/lib/dates";
import { toUserMessage } from "@/lib/errors";
import type { UserFormValues } from "@/schemas/identity";

export default function NewUserPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const preview = nextEmployeeId(useIdentityStore.getState().users.map((item) => item.employeeId));

  async function onSubmit(values: UserFormValues) {
    if (!user) return;
    setSubmitting(true);
    try {
      const created = await createUserProfile(values, user);
      toast.success(`User created · ${created.employeeId}`);
      router.push(`/admin/users/${created.id}` as Route);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Create user" description="Provision an employee profile. A password reset is sent when Firebase Auth is configured." />
      <UserForm
        employeePreview={preview}
        submitting={submitting}
        onSubmit={onSubmit}
        defaultValues={{
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          profileImage: "",
          employeeId: "",
          departmentId: "sales",
          designation: "",
          joiningDate: todayIso(),
          roleId: "viewer",
          status: "ACTIVE",
        }}
      />
    </div>
  );
}
