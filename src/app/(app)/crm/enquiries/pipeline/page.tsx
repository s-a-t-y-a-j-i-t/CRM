"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { EnquiryPipelineBoard } from "@/features/enquiries/pipeline-board";
import { useAuth } from "@/hooks/useAuth";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { changeEnquiryStatus, visibleEnquiries } from "@/services/enquiries/enquiry.service";
import { toUserMessage } from "@/lib/errors";
import type { CrmEnquiry, EnquiryStatus } from "@/types/enquiries";

export default function EnquiryPipelinePage() {
  const router = useRouter();
  const { user } = useAuth();
  const enquiries = useEnquiryStore((state) => state.enquiries);
  if (!user) return null;
  const actor = user;
  const scoped = visibleEnquiries(actor, enquiries);

  async function onMove(enquiry: CrmEnquiry, status: EnquiryStatus) {
    try {
      await changeEnquiryStatus(enquiry.id, status, actor);
      toast.success(`${enquiry.enquiryNumber} moved to ${status.replaceAll("_", " ")}`);
    } catch (error) {
      toast.error(toUserMessage(error));
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Enquiry pipeline"
        description="Drag a card only if you can change status. Invalid transitions are rejected."
        actions={<Button variant="outline" onClick={() => router.push("/crm/enquiries" as Route)}>Table view</Button>}
      />
      {scoped.length === 0 ? (
        <EmptyState title="No enquiries found." description="Create an enquiry to populate the kanban board." />
      ) : (
        <EnquiryPipelineBoard enquiries={scoped} user={actor} onMove={(enquiry, status) => void onMove(enquiry, status)} />
      )}
    </div>
  );
}
