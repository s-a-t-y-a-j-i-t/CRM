"use client";

import { use } from "react";
import { ProductWorkspace } from "@/features/products/product-workspace";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProductWorkspace id={id} />;
}
