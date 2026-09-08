import { addMinor } from "@/lib/money";
import type { DemoDatabase } from "@/lib/seed/demo-data";

export interface DashboardMetrics {
  totalCustomers: number;
  newLeads: number;
  openEnquiries: number;
  activeOpportunities: number;
  quotations: number;
  purchaseOrders: number;
  outstandingMinor: number;
  openComplaints: number;
}

export function getDashboardMetrics(db: DemoDatabase): DashboardMetrics {
  return {
    totalCustomers: db.customers.length,
    newLeads: db.leads.filter((lead) => lead.stage === "new" || lead.stage === "qualified").length,
    openEnquiries: db.enquiries.filter((item) => !["won", "lost"].includes(item.stage)).length,
    activeOpportunities: db.opportunities.filter((item) => !item.stage.startsWith("closed")).length,
    quotations: db.quotations.length,
    purchaseOrders: db.purchaseOrders.length,
    outstandingMinor: db.invoices.reduce((sum, invoice) => addMinor(sum, invoice.outstandingMinor), 0),
    openComplaints: db.complaints.filter((item) => !["resolved", "closed"].includes(item.investigationStatus)).length,
  };
}
