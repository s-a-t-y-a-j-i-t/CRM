"use client";

import { use } from "react";
import { CostingWorkspace } from "@/features/costing/costing-workspace";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CostingWorkspace id={id} initialTab="Approval" />;
}
