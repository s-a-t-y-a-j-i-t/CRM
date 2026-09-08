"use client";

import { use, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { UserForm } from "@/features/admin/users/user-form";
import { useAuth } from "@/hooks/useAuth";
import { getUserById, updateUserProfile } from "@/services/identity/user.service";
import { useIdentityStore } from "@/stores/identity-store";
import { toUserMessage } from "@/lib/errors";
import type { UserFormValues } from "@/schemas/identity";

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user: actor } = useAuth();
  const users = useIdentityStore((state) => state.users);
  const profile = users.find((item) => item.id === id || item.firebaseUid === id) ?? getUserById(id);
  const [submitting, setSubmitting] = useState(false);

  if (!profile) {
    return <EmptyState title="User not found" description="This employee profile cannot be edited." />;
  }

  const current = profile;

  async function onSubmit(values: UserFormValues) {
    if (!actor) return;
    setSubmitting(true);
    try {
      await updateUserProfile(current.id, values, actor);
      toast.success("User updated");
      router.push(`/admin/users/${current.id}` as Route);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${current.displayName}`} description="Role and status changes are written to the audit log." />
      <UserForm
        emailLocked
        employeePreview={current.employeeId}
        submitting={submitting}
        onSubmit={onSubmit}
        defaultValues={{
          firstName: current.firstName,
          lastName: current.lastName,
          email: current.email,
          phone: current.phone ?? "",
          profileImage: current.profileImage ?? "",
          employeeId: current.employeeId,
          departmentId: current.departmentId,
          designation: current.designation,
          joiningDate: current.joiningDate,
          roleId: String(current.roleId),
          status: current.status,
        }}
      />
    </div>
  );
}
