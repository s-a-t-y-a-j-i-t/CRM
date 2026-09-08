"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { LeadAnalytics } from "@/features/leads/lead-analytics";
import { useAuth } from "@/hooks/useAuth";
import { useLeadStore } from "@/stores/lead-store";

export default function LeadAnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const leads = useLeadStore((state) => state.leads);
  if (!user) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lead analytics"
        description="Figures come from the live lead store / Firestore — not placeholder numbers."
        actions={<Button variant="outline" onClick={() => router.push("/crm/leads" as Route)}>Back to leads</Button>}
      />
      <LeadAnalytics leads={leads} user={user} />
    </div>
  );
}
