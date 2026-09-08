import type { PermissionKey } from "@/types/rbac";

interface RouteRule {
  test: RegExp;
  permission?: PermissionKey;
}

const RULES: RouteRule[] = [
  { test: /^\/admin\/users\/new(?:\/|$)/, permission: "users.create" },
  { test: /^\/admin\/users\/[^/]+\/edit(?:\/|$)/, permission: "users.update" },
  { test: /^\/admin\/users(?:\/|$)/, permission: "users.view" },
  { test: /^\/admin\/roles\/new(?:\/|$)/, permission: "roles.create" },
  { test: /^\/admin\/roles\/[^/]+\/edit(?:\/|$)/, permission: "roles.update" },
  { test: /^\/admin\/roles(?:\/|$)/, permission: "roles.view" },
  { test: /^\/admin\/permissions(?:\/|$)/, permission: "roles.view" },
  { test: /^\/admin\/settings(?:\/|$)/, permission: "settings.manage" },
  { test: /^\/admin\/audit(?:\/|$)/, permission: "audit_logs.view" },
  { test: /^\/dashboard(?:\/|$)/, permission: "dashboard.view" },
  { test: /^\/crm\/customers\/new(?:\/|$)/, permission: "customers.create" },
  { test: /^\/crm\/customers\/[^/]+\/edit(?:\/|$)/, permission: "customers.update" },
  { test: /^\/crm\/customers(?:\/|$)/, permission: "customers.view" },
  { test: /^\/crm\/contacts(?:\/|$)/, permission: "contacts.view" },
  { test: /^\/crm\/leads\/new(?:\/|$)/, permission: "leads.create" },
  { test: /^\/crm\/leads\/pipeline(?:\/|$)/, permission: "leads.view" },
  { test: /^\/crm\/leads\/analytics(?:\/|$)/, permission: "leads.view" },
  { test: /^\/crm\/leads\/[^/]+\/edit(?:\/|$)/, permission: "leads.update" },
  { test: /^\/crm\/leads(?:\/|$)/, permission: "leads.view" },
  { test: /^\/crm\/prospects(?:\/|$)/, permission: "leads.view" },
  { test: /^\/crm\/enquiries\/new(?:\/|$)/, permission: "enquiries.create" },
  { test: /^\/crm\/enquiries\/pipeline(?:\/|$)/, permission: "enquiries.view" },
  { test: /^\/crm\/enquiries\/analytics(?:\/|$)/, permission: "enquiries.view" },
  { test: /^\/crm\/enquiries\/[^/]+\/edit-requirements(?:\/|$)/, permission: "product_requirements.update" },
  { test: /^\/crm\/enquiries\/[^/]+\/edit(?:\/|$)/, permission: "enquiries.update" },
  { test: /^\/crm\/enquiries(?:\/|$)/, permission: "enquiries.view" },
  { test: /^\/crm\/feasibility\/new(?:\/|$)/, permission: "feasibility.create" },
  { test: /^\/crm\/feasibility\/[^/]+\/review(?:\/|$)/, permission: "feasibility.review" },
  { test: /^\/crm\/feasibility\/[^/]+\/edit(?:\/|$)/, permission: "feasibility.update" },
  { test: /^\/crm\/feasibility(?:\/|$)/, permission: "feasibility.view" },
  { test: /^\/crm\/costing\/new(?:\/|$)/, permission: "costing.create" },
  { test: /^\/crm\/costing\/[^/]+\/edit(?:\/|$)/, permission: "costing.update" },
  { test: /^\/crm\/costing\/[^/]+\/approval(?:\/|$)/, permission: "costing.review" },
  { test: /^\/crm\/costing\/[^/]+\/(materials|packaging|manufacturing|pricing)(?:\/|$)/, permission: "costing.update" },
  { test: /^\/crm\/costing(?:\/|$)/, permission: "costing.view" },
  { test: /^\/crm\/quotations\/new(?:\/|$)/, permission: "quotations.create" },
  { test: /^\/crm\/quotations\/[^/]+\/edit(?:\/|$)/, permission: "quotations.update" },
  { test: /^\/crm\/quotations\/[^/]+\/approval(?:\/|$)/, permission: "quotations.review" },
  { test: /^\/crm\/quotations\/[^/]+\/(items|terms)(?:\/|$)/, permission: "quotations.update" },
  { test: /^\/crm\/quotations\/[^/]+\/preview(?:\/|$)/, permission: "quotation_pdf.view" },
  { test: /^\/crm\/quotations(?:\/|$)/, permission: "quotations.view" },
  { test: /^\/business\/quotations(?:\/|$)/, permission: "quotations.view" },
  { test: /^\/master\/products\/new(?:\/|$)/, permission: "products.create" },
  { test: /^\/master\/products\/[^/]+\/edit(?:\/|$)/, permission: "products.update" },
  { test: /^\/master\/products(?:\/|$)/, permission: "products.view" },
  { test: /^\/crm\/opportunities(?:\/|$)/, permission: "opportunities.view" },
  { test: /^\/crm\/activities(?:\/|$)/, permission: "activities.view" },
  { test: /^\/crm\/follow-ups(?:\/|$)/, permission: "activities.view" },
  { test: /^\/business\//, permission: "products.view" },
  { test: /^\/manufacturing\//, permission: "manufacturing.view" },
  { test: /^\/quality\//, permission: "documents.view" },
  { test: /^\/finance\//, permission: "invoices.view" },
  { test: /^\/reports(?:\/|$)/, permission: "reports.view" },
  { test: /^\/notifications(?:\/|$)/, permission: "notifications.view" },
];

export function permissionForPath(pathname: string): PermissionKey | null {
  const rule = RULES.find((item) => item.test.test(pathname));
  return rule?.permission ?? null;
}
