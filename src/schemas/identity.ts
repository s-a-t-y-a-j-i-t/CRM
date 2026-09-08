import { z } from "zod";
import { ACCOUNT_STATUSES } from "@/types/identity";

export const userFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  email: z.string().trim().email("Enter a valid work email.").max(180),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  profileImage: z.string().trim().max(500).optional().or(z.literal("")),
  employeeId: z.string().trim().max(20).optional().or(z.literal("")),
  departmentId: z.string().min(1, "Select a department."),
  designation: z.string().trim().min(1, "Designation is required.").max(120),
  joiningDate: z.string().min(1, "Joining date is required."),
  roleId: z.string().min(1, "Select a role."),
  status: z.enum(ACCOUNT_STATUSES),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const userUpdateSchema = userFormSchema.omit({ email: true, employeeId: true });

export type UserUpdateValues = z.infer<typeof userUpdateSchema>;

export const profileFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  profileImage: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const roleFormSchema = z.object({
  name: z.string().trim().min(2, "Role name is required.").max(80),
  description: z.string().trim().min(4, "Describe this role.").max(280),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  permissions: z.array(z.string()).min(1, "Select at least one permission."),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;
