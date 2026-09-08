"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { FileUpload } from "@/components/shared/file-upload";
import { ACCOUNT_STATUSES, DEPARTMENTS } from "@/types/identity";
import { userFormSchema, type UserFormValues } from "@/schemas/identity";
import { listRoles } from "@/services/identity/role.service";

export function UserForm({
  defaultValues,
  employeePreview,
  emailLocked = false,
  onSubmit,
  submitting,
}: {
  defaultValues: UserFormValues;
  employeePreview?: string;
  emailLocked?: boolean;
  submitting?: boolean;
  onSubmit: (values: UserFormValues) => Promise<void>;
}) {
  const roles = listRoles().filter((role) => role.status === "ACTIVE");
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues,
  });

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="First name" htmlFor="firstName" error={form.formState.errors.firstName?.message}>
            <Input id="firstName" {...form.register("firstName")} />
          </FormField>
          <FormField label="Last name" htmlFor="lastName" error={form.formState.errors.lastName?.message}>
            <Input id="lastName" {...form.register("lastName")} />
          </FormField>
          <FormField label="Work email" htmlFor="email" error={form.formState.errors.email?.message}>
            <Input id="email" type="email" disabled={emailLocked} {...form.register("email")} />
          </FormField>
          <FormField label="Phone" htmlFor="phone" error={form.formState.errors.phone?.message}>
            <Input id="phone" {...form.register("phone")} />
          </FormField>
          <div className="sm:col-span-2">
            <FileUpload
              label="Profile image"
              accept="image/png,image/jpeg"
              onFile={(file) => form.setValue("profileImage", file.name)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Employee ID" htmlFor="employeeId">
            <Input id="employeeId" value={employeePreview ?? "Assigned on save"} disabled readOnly />
          </FormField>
          <FormField label="Department" htmlFor="departmentId" error={form.formState.errors.departmentId?.message}>
            <Select id="departmentId" {...form.register("departmentId")}>
              <option value="">Select department</option>
              {DEPARTMENTS.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Designation" htmlFor="designation" error={form.formState.errors.designation?.message}>
            <Input id="designation" {...form.register("designation")} />
          </FormField>
          <FormField label="Joining date" htmlFor="joiningDate" error={form.formState.errors.joiningDate?.message}>
            <Input id="joiningDate" type="date" {...form.register("joiningDate")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Role" htmlFor="roleId" error={form.formState.errors.roleId?.message}>
            <Select id="roleId" {...form.register("roleId")}>
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Status" htmlFor="status" error={form.formState.errors.status?.message}>
            <Select id="status" {...form.register("status")}>
              {ACCOUNT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save user"}
        </Button>
      </div>
    </form>
  );
}
