"use client";

import { use } from "react";
import { PackagingEditor } from "@/features/costing/costing-editors";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PackagingEditor id={id} />;
}
