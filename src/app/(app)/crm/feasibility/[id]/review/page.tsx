"use client";

import { use } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { DepartmentReviewForm } from "@/features/feasibility/department-review-form";
import { useAuth } from "@/hooks/useAuth";
import { useFeasibilityStore } from "@/stores/feasibility-store";
import { listReviews } from "@/services/feasibility/feasibility-review.service";
import { isOverdue } from "@/services/feasibility/feasibility.service";

export default function FeasibilityReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const item = useFeasibilityStore((state) => state.assessments.find((row) => row.id === id));
  const reviews = listReviews(id);

  if (!item) return <EmptyState title="Feasibility not found" description="This assessment is unavailable." />;
  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${item.feasibilityNumber} · Department review`}
        description={`${item.customerName} · ${item.productName}. Score never auto-approves the product.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={item.status} />
            {isOverdue(item) ? <StatusBadge value="OVERDUE" /> : null}
            <Button variant="outline" onClick={() => router.push(`/crm/feasibility/${item.id}` as Route)}>Back to assessment</Button>
          </div>
        }
      />
      <div className="space-y-4">
        {reviews.map((review) => (
          <DepartmentReviewForm key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}
