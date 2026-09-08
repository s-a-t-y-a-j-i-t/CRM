"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { formatMoney } from "@/lib/money";
import { labelForLead } from "@/constants/leads";
import { computeLeadKpis, visibleLeads } from "@/services/leads/lead.service";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CrmLead } from "@/types/leads";

function countBy(rows: CrmLead[], pick: (lead: CrmLead) => string | undefined) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = pick(row) || "Unspecified";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name: labelForLead(name), value }));
}

export function LeadAnalytics({ leads, user }: { leads: CrmLead[]; user: AuthenticatedUser }) {
  const scoped = visibleLeads(user, leads);
  const kpis = computeLeadKpis(user, scoped);
  const byMonth = scoped.reduce<Record<string, number>>((acc, lead) => {
    const key = lead.createdAt.slice(0, 7);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const monthly = Object.entries(byMonth)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, value]) => ({ month, value }));
  const conversion = Object.entries(byMonth).map(([month, created]) => {
    const won = scoped.filter((lead) => lead.status === "WON" && lead.convertedAt?.startsWith(month)).length;
    return { month, created, won };
  });

  if (scoped.length === 0) {
    return <EmptyState title="No leads found." description="Analytics will populate from actual Firestore / store data once leads exist." />;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total leads" value={kpis.total} />
        <StatCard label="New leads" value={kpis.newer} />
        <StatCard label="Qualified leads" value={kpis.qualified} />
        <StatCard label="Open leads" value={kpis.open} />
        <StatCard label="Won leads" value={kpis.won} />
        <StatCard label="Lost leads" value={kpis.lost} />
        <StatCard label="Conversion rate" value={`${kpis.conversionRate}%`} />
        <StatCard label="Expected business value" value={formatMoney(kpis.expectedValueMinor, "INR")} />
        <StatCard label="Open pipeline value" value={formatMoney(kpis.openPipelineMinor, "INR")} />
        <StatCard label="Won value" value={formatMoney(kpis.wonValueMinor, "INR")} />
        <StatCard label="Lost value" value={formatMoney(kpis.lostValueMinor, "INR")} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Leads by source" data={countBy(scoped, (lead) => lead.leadSource)} />
        <ChartCard title="Leads by status" data={countBy(scoped, (lead) => lead.status)} />
        <ChartCard title="Leads by sales person" data={countBy(scoped, (lead) => lead.assignedToName)} />
        <ChartCard title="Leads by product" data={countBy(scoped, (lead) => lead.productInterest)} />
        <Card>
          <CardHeader>
            <CardTitle>Monthly lead creation</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {monthly.length === 0 ? (
              <EmptyState title="No monthly data yet." description="Creation trend appears after leads are recorded." />
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
            <CardTitle>Lead conversion trend</CardTitle>
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
          <EmptyState title="No data." description="This chart uses live lead records." />
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
