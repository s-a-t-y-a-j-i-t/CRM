import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Boxes,
  Building2,
  CalendarCheck,
  Calculator,
  ClipboardList,
  Factory,
  FileStack,
  FileText,
  Handshake,
  Kanban,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Shield,
  Truck,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { ModuleId, PermissionKey } from "@/types/rbac";

export interface NavItem {
  title: string;
  href: string;
  module: ModuleId;
  permission: PermissionKey;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAVIGATION: NavSection[] = [
  {
    title: "Overview",
    items: [{ title: "Dashboard", href: "/dashboard", module: "dashboard", permission: "dashboard.view", icon: LayoutDashboard }],
  },
  {
    title: "CRM",
    items: [
      { title: "Leads", href: "/crm/leads", module: "leads", permission: "leads.view", icon: UserRound },
      { title: "Pipeline", href: "/crm/leads/pipeline", module: "leads", permission: "leads.view", icon: Kanban },
      { title: "Lead Analytics", href: "/crm/leads/analytics", module: "leads", permission: "leads.view", icon: FileText },
      { title: "Prospects", href: "/crm/prospects", module: "leads", permission: "leads.view", icon: Handshake },
      { title: "Customers", href: "/crm/customers", module: "customers", permission: "customers.view", icon: Building2 },
      { title: "Contacts", href: "/crm/contacts", module: "contacts", permission: "contacts.view", icon: Users },
      { title: "Enquiries", href: "/crm/enquiries", module: "enquiries", permission: "enquiries.view", icon: ClipboardList },
      { title: "Enquiry Pipeline", href: "/crm/enquiries/pipeline", module: "enquiries", permission: "enquiries.view", icon: Kanban },
      { title: "Enquiry Analytics", href: "/crm/enquiries/analytics", module: "enquiries", permission: "enquiries.view", icon: FileText },
      { title: "Opportunities", href: "/crm/opportunities", module: "opportunities", permission: "opportunities.view", icon: BadgeCheck },
      { title: "Activities", href: "/crm/activities", module: "activities", permission: "activities.view", icon: Activity },
      { title: "Follow-ups", href: "/crm/follow-ups", module: "activities", permission: "activities.view", icon: CalendarCheck },
    ],
  },
  {
    title: "Business Development",
    items: [
      { title: "Product Requirements", href: "/business/requirements", module: "product_requirements", permission: "product_requirements.view", icon: ClipboardList },
      { title: "Products", href: "/master/products", module: "products", permission: "products.view", icon: Package },
      { title: "Feasibility", href: "/crm/feasibility", module: "feasibility", permission: "feasibility.view", icon: FileStack },
      { title: "Costing", href: "/crm/costing", module: "costing", permission: "costing.view", icon: Calculator },
      { title: "Quotations", href: "/crm/quotations", module: "quotations", permission: "quotations.view", icon: FileText },
      { title: "Negotiations", href: "/business/negotiations", module: "negotiations", permission: "negotiations.view", icon: Handshake },
      { title: "Purchase Orders", href: "/business/purchase-orders", module: "purchase_orders", permission: "purchase_orders.view", icon: Receipt },
    ],
  },
  {
    title: "Manufacturing",
    items: [
      { title: "Manufacturing Orders", href: "/manufacturing/orders", module: "manufacturing", permission: "manufacturing.view", icon: Factory },
      { title: "Batch Tracking", href: "/manufacturing/batches", module: "batches", permission: "batches.view", icon: Boxes },
      { title: "Dispatch", href: "/manufacturing/dispatch", module: "dispatch", permission: "dispatch.view", icon: Truck },
    ],
  },
  {
    title: "Quality",
    items: [
      { title: "Documents", href: "/quality/documents", module: "documents", permission: "documents.view", icon: FileStack },
      { title: "Complaints", href: "/quality/complaints", module: "complaints", permission: "complaints.view", icon: AlertTriangle },
      { title: "Quality Requests", href: "/quality/requests", module: "documents", permission: "documents.view", icon: ClipboardList },
    ],
  },
  {
    title: "Finance",
    items: [
      { title: "Invoices", href: "/finance/invoices", module: "invoices", permission: "invoices.view", icon: Receipt },
      { title: "Payments", href: "/finance/payments", module: "payments", permission: "payments.view", icon: Banknote },
      { title: "Outstanding", href: "/finance/outstanding", module: "receivables", permission: "receivables.view", icon: Wallet },
    ],
  },
  {
    title: "Communication",
    items: [
      { title: "Activities", href: "/crm/activities", module: "activities", permission: "activities.view", icon: Activity },
      { title: "Notifications", href: "/notifications", module: "notifications", permission: "notifications.view", icon: CalendarCheck },
    ],
  },
  {
    title: "Reports",
    items: [{ title: "Reports", href: "/reports", module: "reports", permission: "reports.view", icon: FileText }],
  },
  {
    title: "Administration",
    items: [
      { title: "Users", href: "/admin/users", module: "users", permission: "users.view", icon: Users },
      { title: "Roles", href: "/admin/roles", module: "roles", permission: "roles.view", icon: Shield },
      { title: "Permissions", href: "/admin/permissions", module: "permissions", permission: "permissions.view", icon: Shield },
      { title: "Settings", href: "/admin/settings", module: "settings", permission: "settings.manage", icon: Settings },
    ],
  },
];
