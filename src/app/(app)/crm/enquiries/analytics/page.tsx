"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EnquiryAnalytics } from "@/features/enquiries/enquiry-analytics";
import { useAuth } from "@/hooks/useAuth";
import { useEnquiryStore } from "@/stores/enquiry-store";

export default function EnquiryAnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const enquiries = useEnquiryStore((state) => state.enquiries);
  if (!user) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Enquiry analytics"
        description="Figures come from the live enquiry store / Firestore — not placeholder numbers."
        actions={<Button variant="outline" onClick={() => router.push("/crm/enquiries" as Route)}>Back to enquiries</Button>}
      />
      <EnquiryAnalytics enquiries={enquiries} user={user} />
    </div>
  );
}
