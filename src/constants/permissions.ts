import type { PermissionAction, PermissionKey } from "@/types/rbac";

export interface PermissionGroup {
  id: string;
  label: string;
  rows: Array<{ label: string; module: string; actions: PermissionAction[] }>;
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    rows: [{ label: "Dashboard", module: "dashboard", actions: ["view"] }],
  },
  {
    id: "crm",
    label: "CRM",
    rows: [
      { label: "Customers", module: "customers", actions: ["view", "create", "update", "delete", "change_status", "export"] },
      { label: "Contacts", module: "contacts", actions: ["view", "create", "update", "delete", "change_status"] },
      { label: "Customer notes", module: "customer_notes", actions: ["create"] },
      { label: "Customer documents", module: "customer_documents", actions: ["upload"] },
      { label: "Leads", module: "leads", actions: ["view", "create", "update", "delete", "assign", "change_status", "convert", "export", "view_all"] },
      { label: "Enquiries", module: "enquiries", actions: ["view", "create", "update", "delete", "assign", "change_status", "convert", "export", "view_all", "technical_review"] },
      { label: "Product requirements", module: "product_requirements", actions: ["view", "create", "update", "version"] },
      { label: "Enquiry documents", module: "enquiry_documents", actions: ["view", "upload", "delete"] },
    ],
  },
  {
    id: "bd",
    label: "Business Development",
    rows: [
      { label: "Products", module: "products", actions: ["view", "create", "update", "change_status", "export"] },
      { label: "Feasibility", module: "feasibility", actions: ["view", "create", "update", "assign", "review", "change_status", "approve", "final_decision", "export"] },
      { label: "Feasibility documents", module: "feasibility_documents", actions: ["view", "upload"] },
      { label: "Costing", module: "costing", actions: ["view", "create", "update", "delete", "calculate", "adjust", "submit", "review", "approve", "reject", "version", "export"] },
      { label: "Costing documents", module: "costing_documents", actions: ["view", "upload"] },
      { label: "Quotations", module: "quotations", actions: ["view", "create", "update", "delete", "calculate", "discount", "submit", "review", "approve", "reject", "send", "cancel", "revise", "export"] },
      { label: "Quotation documents", module: "quotation_documents", actions: ["view", "upload"] },
      { label: "Quotation PDF", module: "quotation_pdf", actions: ["view", "export"] },
      { label: "Orders", module: "purchase_orders", actions: ["view", "create", "update", "approve"] },
    ],
  },
  {
    id: "manufacturing",
    label: "Manufacturing",
    rows: [
      { label: "Manufacturing", module: "manufacturing", actions: ["view", "update"] },
      { label: "Batches", module: "batches", actions: ["view", "update"] },
    ],
  },
  {
    id: "quality",
    label: "Quality",
    rows: [
      { label: "Documents", module: "documents", actions: ["view", "update"] },
      { label: "Complaints", module: "complaints", actions: ["view", "create", "update", "close"] },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    rows: [
      { label: "Invoices", module: "invoices", actions: ["view", "update"] },
      { label: "Payments", module: "payments", actions: ["view", "update"] },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    rows: [{ label: "Activities", module: "activities", actions: ["view", "create", "update"] }],
  },
  {
    id: "reports",
    label: "Reports",
    rows: [{ label: "Reports", module: "reports", actions: ["view", "export"] }],
  },
  {
    id: "admin",
    label: "Administration",
    rows: [
      { label: "Users", module: "users", actions: ["view", "create", "update", "deactivate"] },
      { label: "Roles", module: "roles", actions: ["view", "create", "update"] },
      { label: "Settings", module: "settings", actions: ["view", "manage"] },
      { label: "Audit logs", module: "audit_logs", actions: ["view"] },
    ],
  },
];

export function toPermission(module: string, action: PermissionAction): PermissionKey {
  return `${module}.${action}` as PermissionKey;
}
