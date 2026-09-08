"use client";

import { use } from "react";
import { FeasibilityWorkspace } from "@/features/feasibility/feasibility-workspace";

export default function FeasibilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <FeasibilityWorkspace id={id} />;
}
