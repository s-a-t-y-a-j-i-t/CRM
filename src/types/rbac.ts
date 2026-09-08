export const ROLE_IDS = [
  "super_admin",
  "admin",
  "management",
  "sales_manager",
  "business_development",
  "sales_executive",
  "production",
  "quality_assurance",
  "quality_control",
  "regulatory",
  "finance",
  "dispatch",
  "customer_support",
  "viewer",
] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export const MODULES = [
  "dashboard",
  "customers",
  "contacts",
  "leads",
  "enquiries",
  "opportunities",
  "activities",
  "products",
  "product_requirements",
  "feasibility",
  "quotations",
  "negotiations",
  "purchase_orders",
  "manufacturing",
  "batches",
  "dispatch",
  "documents",
  "complaints",
  "invoices",
  "payments",
  "receivables",
  "reports",
  "notifications",
  "users",
  "roles",
  "permissions",
  "settings",
  "audit_logs",
  "customer_notes",
  "customer_documents",
  "enquiry_documents",
  "feasibility_documents",
  "costing",
  "costing_documents",
  "quotation_documents",
  "quotation_pdf",
] as const;

export type ModuleId = (typeof MODULES)[number];

export type PermissionAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "approve"
  | "manage"
  | "close"
  | "deactivate"
  | "change_status"
  | "upload"
  | "assign"
  | "convert"
  | "view_all"
  | "technical_review"
  | "version"
  | "review"
  | "final_decision"
  | "calculate"
  | "adjust"
  | "submit"
  | "reject"
  | "discount"
  | "send"
  | "cancel"
  | "revise";

export type PermissionKey = `${ModuleId}.${PermissionAction}`;

export interface RoleDefinition {
  id: RoleId;
  name: string;
  description: string;
  permissions: PermissionKey[];
}

export interface AuthenticatedUser {
  uid: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  role: RoleId | string;
  roleName?: string;
  department: string;
  designation?: string;
  employeeId?: string;
  isActive: boolean;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  photoURL?: string;
  permissions?: PermissionKey[];
}
