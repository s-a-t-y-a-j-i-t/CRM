"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { pharmaLabel } from "@/constants/enquiries";
import { computeEnquiryKpis, visibleEnquiries } from "@/services/enquiries/enquiry.service";
import { useEnquiryStore } from "@/stores/enquiry-store";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CrmEnquiry } from "@/types/enquiries";

function countBy(rows: CrmEnquiry[], pick: (enquiry: CrmEnquiry) => string | undefined) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = pick(row) || "Unspecified";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name: pharmaLabel(name), value }));
}

export function EnquiryAnalytics({ enquiries, user }: { enquiries: CrmEnquiry[]; user: AuthenticatedUser }) {
  const scoped = visibleEnquiries(user, enquiries);
  const kpis = computeEnquiryKpis(user, scoped);
  const requirements = useEnquiryStore((state) => state.requirements);
  const byMonth = scoped.reduce<Record<string, number>>((acc, enquiry) => {
    const key = enquiry.receivedDate.slice(0, 7);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const monthly = Object.entries(byMonth)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, value]) => ({ month, value }));
  const conversion = Object.entries(byMonth).map(([month, created]) => {
    const won = scoped.filter((enquiry) => enquiry.status === "WON" && enquiry.updatedAt.startsWith(month)).length;
    return { month, created, won };
  });

  if (scoped.length === 0) {
    return <EmptyState title="No enquiries found." description="Analytics will populate from actual Firestore / store data once enquiries exist." />;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total enquiries" value={kpis.total} />
        <StatCard label="New enquiries" value={kpis.newer} />
        <StatCard label="Under review" value={kpis.underReview} />
        <StatCard label="Technical review" value={kpis.technicalReview} />
        <StatCard label="Pending feasibility" value={kpis.pendingFeasibility} />
        <StatCard label="Pending quotation" value={kpis.pendingQuotation} />
        <StatCard label="Won" value={kpis.won} />
        <StatCard label="Lost" value={kpis.lost} />
        <StatCard label="On hold" value={kpis.onHold} />
        <StatCard label="Enquiry conversion" value={`${kpis.conversionRate}%`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Enquiries by status" data={countBy(scoped, (enquiry) => enquiry.status)} />
        <ChartCard title="Enquiries by source" data={countBy(scoped, (enquiry) => enquiry.enquirySource)} />
        <ChartCard title="Enquiries by customer" data={countBy(scoped, (enquiry) => enquiry.customerName)} />
        <ChartCard
          title="Enquiries by product"
          data={countBy(scoped, (enquiry) => requirements.find((item) => item.enquiryId === enquiry.id && item.isCurrent)?.productName)}
        />
        <ChartCard
          title="Enquiries by dosage form"
          data={countBy(scoped, (enquiry) => requirements.find((item) => item.enquiryId === enquiry.id && item.isCurrent)?.dosageForm)}
        />
        <Card>
          <CardHeader>
            <CardTitle>Monthly enquiries</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {monthly.length === 0 ? (
              <EmptyState title="No monthly data yet." description="Creation trend appears after enquiries are recorded." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Enquiry conversion</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="created" fill="var(--color-muted-foreground)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="won" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChartCard({ title, data }: { title: string; data: Array<{ name: string; value: number }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        {data.length === 0 ? (
          <EmptyState title="No data." description="This chart uses live enquiry records." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide={data.length > 6} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
