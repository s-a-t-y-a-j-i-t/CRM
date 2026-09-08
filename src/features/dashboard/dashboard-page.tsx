"use client";

import dynamic from "next/dynamic";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ActivityItem } from "@/components/shared/activity-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { canView } from "@/lib/rbac/can";
import { getDashboardMetrics } from "@/services/dashboard.service";
import { useAppStore } from "@/services/store";
import { useAuth } from "@/hooks/useAuth";
import { filterNotificationsForUser } from "@/services/reminders";

const Charts = dynamic(() => import("@/features/dashboard/dashboard-charts").then((mod) => mod.DashboardCharts), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-muted" />,
});

export function DashboardPage() {
  const { user } = useAuth();
  const db = useAppStore((state) => state.db);
  if (!user) return null;

  const metrics = getDashboardMetrics(db);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations dashboard"
        description="CMO pipeline, plant load, receivables and quality signals. Metrics come from the dashboard service, not hardcoded UI values."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {canView(user, "customers") ? <StatCard label="Total Customers" value={metrics.totalCustomers} /> : null}
        {canView(user, "leads") ? <StatCard label="New Leads" value={metrics.newLeads} /> : null}
        {canView(user, "enquiries") ? <StatCard label="Open Enquiries" value={metrics.openEnquiries} /> : null}
        {canView(user, "opportunities") ? <StatCard label="Active Opportunities" value={metrics.activeOpportunities} /> : null}
        {canView(user, "quotations") ? <StatCard label="Quotations" value={metrics.quotations} /> : null}
        {canView(user, "purchase_orders") ? <StatCard label="Purchase Orders" value={metrics.purchaseOrders} /> : null}
        {canView(user, "receivables") ? <StatCard label="Outstanding Amount" value={formatMoney(metrics.outstandingMinor, "INR")} /> : null}
        {canView(user, "complaints") ? <StatCard label="Open Complaints" value={metrics.openComplaints} /> : null}
      </div>
      <Charts />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent enquiries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {db.enquiries.slice(0, 4).map((enquiry) => (
              <ActivityItem key={enquiry.id} title={enquiry.enquiryNumber} detail={enquiry.subject} status={enquiry.stage} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {db.activities
              .filter((item) => item.activityStatus !== "completed")
              .slice(0, 4)
              .map((activity) => (
                <ActivityItem key={activity.id} title={activity.subject} detail={activity.dueAt} status={activity.activityStatus} />
              ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {db.purchaseOrders.slice(0, 4).map((order) => (
              <ActivityItem key={order.id} title={order.poNumber} detail={order.orderDate} status={order.stage} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filterNotificationsForUser(db.notifications, user)
              .slice(0, 4)
              .map((notification) => (
                <ActivityItem key={notification.id} title={notification.title} detail={notification.body} />
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
