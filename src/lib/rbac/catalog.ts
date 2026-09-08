import type { PermissionKey, RoleDefinition, RoleId } from "@/types/rbac";
import { MODULES, type ModuleId } from "@/types/rbac";

const ALL_ACTIONS = [
  "view",
  "create",
  "update",
  "delete",
  "export",
  "approve",
  "manage",
  "close",
  "deactivate",
  "change_status",
  "upload",
  "assign",
  "convert",
  "view_all",
  "technical_review",
  "version",
  "review",
  "final_decision",
  "calculate",
  "adjust",
  "submit",
  "reject",
  "discount",
  "send",
  "cancel",
  "revise",
] as const;

function allFor(...modules: ModuleId[]): PermissionKey[] {
  return modules.flatMap((module) =>
    ALL_ACTIONS.map((action) => `${module}.${action}` as PermissionKey),
  );
}

function viewFor(...modules: ModuleId[]): PermissionKey[] {
  return modules.map((module) => `${module}.view` as PermissionKey);
}

const COMMERCIAL: ModuleId[] = [
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
  "notifications",
  "customer_notes",
  "customer_documents",
  "enquiry_documents",
  "feasibility_documents",
  "costing",
  "costing_documents",
  "quotation_documents",
  "quotation_pdf",
];

export const ROLE_CATALOG: Record<RoleId, RoleDefinition> = {
  super_admin: {
    id: "super_admin",
    name: "Super Admin",
    description: "Full platform control, including users, roles, and audit logs.",
    permissions: allFor(...MODULES),
  },
  admin: {
    id: "admin",
    name: "Admin",
    description: "Operational administration without destroying audit history.",
    permissions: allFor(...MODULES.filter((module) => module !== "audit_logs")).concat(
      viewFor("audit_logs"),
    ),
  },
  management: {
    id: "management",
    name: "Management",
    description: "Executive visibility across commercial, plant, quality, and finance.",
    permissions: [
      ...viewFor(...MODULES),
      ...allFor("reports", "notifications"),
      "leads.view_all",
      "leads.assign",
      "leads.convert",
      "leads.change_status",
      "enquiries.view_all",
      "enquiries.assign",
      "enquiries.convert",
      "enquiries.change_status",
      "enquiries.technical_review",
      "feasibility.assign",
      "feasibility.approve",
      "feasibility.final_decision",
      "feasibility.review",
      "costing.calculate",
      "costing.approve",
      "costing.reject",
      "costing.review",
      "quotations.calculate",
      "quotations.approve",
      "quotations.reject",
      "quotations.review",
      "quotations.send",
    ],
  },
  sales_manager: {
    id: "sales_manager",
    name: "Sales Manager",
    description: "Owns the commercial pipeline and team activities.",
    permissions: [
      ...allFor(...COMMERCIAL, "reports"),
      ...viewFor("invoices", "payments", "receivables", "complaints", "documents"),
    ],
  },
  business_development: {
    id: "business_development",
    name: "Business Development",
    description: "Product requirements, feasibility, quotations, and negotiations.",
    permissions: [
      ...allFor(
        "dashboard",
        "customers",
        "contacts",
        "leads",
        "enquiries",
        "opportunities",
        "products",
        "product_requirements",
        "feasibility",
        "quotations",
        "negotiations",
        "activities",
        "notifications",
        "customer_notes",
        "customer_documents",
        "enquiry_documents",
        "feasibility_documents",
        "costing",
        "costing_documents",
        "quotation_documents",
        "quotation_pdf",
      ),
      ...viewFor("purchase_orders", "reports"),
    ],
  },
  sales_executive: {
    id: "sales_executive",
    name: "Sales Executive",
    description: "Day-to-day customer, lead, enquiry, and follow-up work.",
    permissions: [
      ...allFor("customers", "contacts", "leads", "enquiries", "activities", "notifications", "customer_notes", "customer_documents", "product_requirements", "enquiry_documents").filter(
        (permission) =>
          permission !== "leads.view_all" &&
          permission !== "leads.assign" &&
          permission !== "enquiries.view_all" &&
          permission !== "enquiries.assign",
      ),
      ...viewFor("dashboard", "quotations", "opportunities", "products", "purchase_orders", "feasibility", "costing"),
      "feasibility.create",
    ],
  },
  production: {
    id: "production",
    name: "Production",
    description: "Manufacturing orders, batches, and plant coordination.",
    permissions: [
      ...allFor("manufacturing", "batches", "activities", "notifications"),
      ...viewFor("dashboard", "customers", "products", "purchase_orders", "dispatch", "documents", "feasibility"),
      "feasibility.review",
      "feasibility.update",
    ],
  },
  quality_assurance: {
    id: "quality_assurance",
    name: "Quality Assurance",
    description: "Complaints, CAPA coordination, and controlled documents.",
    permissions: [
      ...allFor("complaints", "documents", "activities", "notifications"),
      ...viewFor("dashboard", "customers", "products", "batches", "manufacturing", "reports", "feasibility"),
      "feasibility.review",
      "feasibility.update",
    ],
  },
  quality_control: {
    id: "quality_control",
    name: "Quality Control",
    description: "Batch testing status and COA / specification documents.",
    permissions: [
      ...allFor("documents", "batches", "notifications"),
      ...viewFor("dashboard", "complaints", "products", "manufacturing", "feasibility"),
      "feasibility.review",
    ],
  },
  regulatory: {
    id: "regulatory",
    name: "Regulatory",
    description: "Dossiers, artwork, and regulatory document control.",
    permissions: [
      ...allFor("documents", "products", "notifications"),
      ...viewFor("dashboard", "customers", "complaints", "feasibility"),
      "feasibility.review",
      "feasibility.update",
    ],
  },
  finance: {
    id: "finance",
    name: "Finance",
    description: "Invoices, collections, credit, and receivables aging.",
    permissions: [
      ...allFor("invoices", "payments", "receivables", "quotations", "reports", "notifications"),
      ...viewFor("dashboard", "customers", "purchase_orders", "activities", "costing", "quotation_pdf"),
      "costing.calculate",
      "costing.review",
      "costing.approve",
      "costing.reject",
      "quotations.calculate",
      "quotations.review",
      "quotations.approve",
      "quotations.reject",
      "quotations.export",
    ],
  },
  dispatch: {
    id: "dispatch",
    name: "Dispatch",
    description: "Ready-for-dispatch and logistics coordination.",
    permissions: [
      ...allFor("dispatch", "notifications"),
      ...viewFor("dashboard", "customers", "purchase_orders", "manufacturing", "batches"),
    ],
  },
  customer_support: {
    id: "customer_support",
    name: "Customer Support",
    description: "Complaints, follow-ups, and customer communication.",
    permissions: [
      ...allFor("complaints", "activities", "notifications"),
      ...viewFor("dashboard", "customers", "contacts", "documents", "invoices"),
    ],
  },
  viewer: {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access to non-administrative modules.",
    permissions: viewFor(
      ...MODULES.filter((module) => !["users", "roles", "permissions", "settings", "audit_logs"].includes(module)),
    ),
  },
};

export function getRole(role: RoleId): RoleDefinition {
  return ROLE_CATALOG[role];
}

export function isSystemRoleId(role: string): role is RoleId {
  return role in ROLE_CATALOG;
}

export function roleHas(role: RoleId | string, permission: PermissionKey): boolean {
  if (!isSystemRoleId(role)) {
    return false;
  }
  return ROLE_CATALOG[role].permissions.includes(permission);
}
