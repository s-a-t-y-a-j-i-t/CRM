import type { PermissionKey, RoleId } from "@/types/rbac";

export const ACCOUNT_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export interface IdentityProfile {
  id: string;
  firebaseUid: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone?: string;
  profileImage?: string;
  departmentId: string;
  departmentName: string;
  designation: string;
  roleId: RoleId | string;
  roleName: string;
  status: AccountStatus;
  joiningDate: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface AppRole {
  id: string;
  name: string;
  description: string;
  permissions: PermissionKey[];
  status: "ACTIVE" | "INACTIVE";
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEPARTMENTS = [
  { id: "admin", name: "Administration" },
  { id: "sales", name: "Sales" },
  { id: "bd", name: "Business Development" },
  { id: "qa", name: "Quality Assurance" },
  { id: "qc", name: "Quality Control" },
  { id: "finance", name: "Finance" },
  { id: "production", name: "Production" },
  { id: "dispatch", name: "Dispatch" },
  { id: "regulatory", name: "Regulatory" },
  { id: "support", name: "Customer Support" },
  { id: "management", name: "Management" },
] as const;
