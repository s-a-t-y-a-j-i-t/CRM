"use client";

import type { Route } from "next";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useLeadStore } from "@/stores/lead-store";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { classifyFollowUp as classifyLeadFollowUp, completeLeadFollowUp } from "@/services/leads/lead-activity.service";
import { classifyFollowUp as classifyEnquiryFollowUp, completeEnquiryFollowUp } from "@/services/enquiries/enquiry-activity.service";
import { formatDateTime } from "@/lib/dates";
import { toUserMessage } from "@/lib/errors";
import { can } from "@/lib/rbac/can";

interface FollowUpRow {
  id: string;
  purpose: string;
  followUpAt: string;
  assignedToName: string;
  status: string;
  href: Route;
  bucket: "today" | "upcoming" | "overdue" | "done";
}

function FollowUpList({
  title,
  items,
  empty,
  onComplete,
}: {
  title: string;
  items: FollowUpRow[];
  empty: string;
  onComplete: (id: string) => void;
}) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <EmptyState title={empty} description="Follow-ups stay on the lead or enquiry record." />
        ) : (
          items.map((item) => {
            const overdue = item.bucket === "overdue";
            return (
              <div key={item.id} className={`rounded-lg border p-3 ${overdue ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
                <button type="button" className="text-left" onClick={() => router.push(item.href)}>
                  <p className="text-sm font-medium">{item.purpose}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(item.followUpAt)} · {item.assignedToName}</p>
                </button>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge value={item.status} />
                  {item.status === "PENDING" ? (
                    <Button size="sm" variant="ghost" onClick={() => onComplete(item.id)}>Complete</Button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export default function FollowUpsPage() {
  const { user } = useAuth();
  const leadFollowUps = useLeadStore((state) => state.followUps);
  const enquiryFollowUps = useEnquiryStore((state) => state.followUps);
  const rows = useMemo<FollowUpRow[]>(() => {
    const leads = leadFollowUps.map((item) => ({
      id: item.id,
      purpose: item.purpose,
      followUpAt: item.followUpAt,
      assignedToName: item.assignedToName,
      status: item.status,
      href: `/crm/leads/${item.leadId}` as Route,
      bucket: classifyLeadFollowUp(item),
    }));
    const enquiries = enquiryFollowUps.map((item) => ({
      id: item.id,
      purpose: item.purpose,
      followUpAt: item.followUpAt,
      assignedToName: item.assignedToName,
      status: item.status,
      href: `/crm/enquiries/${item.enquiryId}` as Route,
      bucket: classifyEnquiryFollowUp(item),
    }));
    return [...leads, ...enquiries].sort((a, b) => a.followUpAt.localeCompare(b.followUpAt));
  }, [leadFollowUps, enquiryFollowUps]);
  const grouped = {
    today: rows.filter((item) => item.bucket === "today"),
    upcoming: rows.filter((item) => item.bucket === "upcoming"),
    overdue: rows.filter((item) => item.bucket === "overdue"),
  };

  if (!user) return null;
  const actor = user;

  async function complete(id: string) {
    if (!can(actor, "activities.update")) return;
    try {
      if (enquiryFollowUps.some((item) => item.id === id)) {
        await completeEnquiryFollowUp(id, actor);
      } else {
        await completeLeadFollowUp(id, actor);
      }
      toast.success("Follow-up completed");
    } catch (error) {
      toast.error(toUserMessage(error));
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Follow-ups" description="Today, upcoming and overdue follow-ups from leads and enquiries." />
      <div className="grid gap-4 lg:grid-cols-3">
        <FollowUpList title="Today" items={grouped.today} empty="No follow-ups scheduled today." onComplete={(id) => void complete(id)} />
        <FollowUpList title="Upcoming" items={grouped.upcoming} empty="No upcoming follow-ups." onComplete={(id) => void complete(id)} />
        <FollowUpList title="Overdue" items={grouped.overdue} empty="No overdue follow-ups." onComplete={(id) => void complete(id)} />
      </div>
    </div>
  );
}
