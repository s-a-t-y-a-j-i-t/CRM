"use client";

import { use, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductForm } from "@/features/products/product-form";
import { useAuth } from "@/hooks/useAuth";
import { useProductStore } from "@/stores/product-store";
import { updateProduct } from "@/services/products/product.service";
import { toUserMessage } from "@/lib/errors";
import type { ProductFormValues } from "@/schemas/products";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const product = useProductStore((state) => state.products.find((item) => item.id === id));
  const specifications = useProductStore((state) => state.specifications.filter((item) => item.productId === id));
  const [submitting, setSubmitting] = useState(false);

  if (!product) return <EmptyState title="Product not found" description="This product master is no longer available." />;
  const current = product;

  async function onSubmit(values: ProductFormValues) {
    if (!user) return;
    setSubmitting(true);
    try {
      await updateProduct(current.id, values, user);
      toast.success("Product updated");
      router.push(`/master/products/${current.id}` as Route);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const defaults: ProductFormValues = {
    productName: product.productName,
    genericName: product.genericName,
    brandName: product.brandName ?? "",
    productType: product.productType,
    productCategory: product.productCategory,
    dosageForm: product.dosageForm,
    strength: product.strength ?? "",
    strengthUnit: (product.strengthUnit as ProductFormValues["strengthUnit"]) ?? "mg",
    composition: product.composition,
    specifications: specifications.map((item) => ({
      specificationType: item.specificationType,
      parameter: item.parameter,
      limit: item.limit,
      unit: item.unit ?? "",
      testMethod: item.testMethod ?? "",
      remarks: item.remarks ?? "",
    })),
    therapeuticCategory: product.therapeuticCategory ?? "",
    pharmacopoeiaStandard: product.pharmacopoeiaStandard ?? "",
    manufacturingSite: product.manufacturingSite ?? "",
    manufacturingUnit: product.manufacturingUnit ?? "",
    packagingType: product.packagingType ?? "",
    standardPackSize: product.standardPackSize ?? "",
    marketType: product.marketType,
    status: product.status,
    regulatoryStatus: product.regulatoryStatus ?? "",
    description: product.description ?? "",
    notes: product.notes ?? "",
  };

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${product.productCode}`} description="Product code cannot be changed." />
      <ProductForm defaultValues={defaults} submitting={submitting} onSubmit={onSubmit} />
    </div>
  );
}
