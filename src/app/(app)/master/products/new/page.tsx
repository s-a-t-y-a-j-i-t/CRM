"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm, emptyProductForm } from "@/features/products/product-form";
import { useAuth } from "@/hooks/useAuth";
import { createProduct } from "@/services/products/product.service";
import { toUserMessage } from "@/lib/errors";
import type { ProductFormValues } from "@/schemas/products";

export default function NewProductPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(values: ProductFormValues) {
    if (!user) return;
    setSubmitting(true);
    try {
      const created = await createProduct(values, user);
      toast.success(`Product created · ${created.productCode}`);
      router.push(`/master/products/${created.id}` as Route);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New product master" description="Codes are assigned server-side (PRD-00001). This does not create a customer requirement." />
      <ProductForm defaultValues={emptyProductForm} submitting={submitting} submitLabel="Create product" onSubmit={onSubmit} />
    </div>
  );
}
