"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { PermissionMatrix } from "@/components/rbac/permission-matrix";
import { roleFormSchema, type RoleFormValues } from "@/schemas/identity";
import type { PermissionKey } from "@/types/rbac";

export function RoleForm({
  defaultValues,
  submitting,
  onSubmit,
}: {
  defaultValues: RoleFormValues;
  submitting?: boolean;
  onSubmit: (values: RoleFormValues) => Promise<void>;
}) {
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues,
  });

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Role details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Role name" htmlFor="name" error={form.formState.errors.name?.message}>
            <Input id="name" {...form.register("name")} />
          </FormField>
          <FormField label="Status" htmlFor="status" error={form.formState.errors.status?.message}>
            <Select id="status" {...form.register("status")}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </Select>
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Description" htmlFor="description" error={form.formState.errors.description?.message}>
              <Textarea id="description" rows={3} {...form.register("description")} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Permissions</h2>
        {form.formState.errors.permissions ? (
          <p className="mb-3 text-xs text-destructive">{form.formState.errors.permissions.message}</p>
        ) : null}
        <Controller
          control={form.control}
          name="permissions"
          render={({ field }) => (
            <PermissionMatrix
              value={field.value as PermissionKey[]}
              onChange={(next) => field.onChange(next)}
            />
          )}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save role"}
        </Button>
      </div>
    </form>
  );
}
