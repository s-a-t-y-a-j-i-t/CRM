"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/form-field";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/hooks/useAuth";
import { profileFormSchema, type ProfileFormValues } from "@/schemas/identity";
import { updateOwnProfile } from "@/services/identity/user.service";
import { formatDate, formatDateTime } from "@/lib/dates";
import { toUserMessage } from "@/lib/errors";

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: profile?.firstName ?? user?.firstName ?? "",
      lastName: profile?.lastName ?? user?.lastName ?? "",
      phone: profile?.phone ?? "",
      profileImage: profile?.profileImage ?? "",
    },
  });

  if (!user) {
    return <EmptyState title="No profile" description="Sign in to view your account." />;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateOwnProfile(values, user);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(toUserMessage(error));
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="Update personal details. Role and employee identity are controlled by administrators." />

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <FormField label="First name" htmlFor="firstName" error={form.formState.errors.firstName?.message}>
              <Input id="firstName" {...form.register("firstName")} />
            </FormField>
            <FormField label="Last name" htmlFor="lastName" error={form.formState.errors.lastName?.message}>
              <Input id="lastName" {...form.register("lastName")} />
            </FormField>
            <FormField label="Phone" htmlFor="phone" error={form.formState.errors.phone?.message}>
              <Input id="phone" {...form.register("phone")} />
            </FormField>
            <FormField label="Profile image URL" htmlFor="profileImage">
              <Input id="profileImage" {...form.register("profileImage")} />
            </FormField>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Employee ID" value={profile?.employeeId ?? user.employeeId} />
          <Field label="Department" value={profile?.departmentName ?? user.department} />
          <Field label="Designation" value={profile?.designation ?? user.designation} />
          <Field label="Joining date" value={formatDate(profile?.joiningDate)} />
        </CardContent>
      </Card>

      <Card id="account">
        <CardHeader>
          <CardTitle>Account information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Email" value={user.email} />
          <Field label="Role" value={user.roleName ?? user.role} />
          <Field label="Status" value={user.status ?? (user.isActive ? "ACTIVE" : "INACTIVE")} />
          <Field label="Last login" value={formatDateTime(profile?.lastLoginAt)} />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
