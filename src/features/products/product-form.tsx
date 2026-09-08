"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { DOSAGE_FORM_OPTIONS, INGREDIENT_ROLE_OPTIONS, PACKAGING_TYPE_OPTIONS, STRENGTH_UNIT_OPTIONS } from "@/constants/pharma";
import {
  MANUFACTURING_SITE_OPTIONS,
  PHARMACOPOEIA_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_MARKET_OPTIONS,
  PRODUCT_STATUS_OPTIONS,
  REGULATORY_STATUS_OPTIONS,
} from "@/constants/products";
import { productFormSchema, type ProductFormValues } from "@/schemas/products";

export const emptyProductForm: ProductFormValues = {
  productName: "",
  genericName: "",
  brandName: "",
  productType: "TABLET",
  productCategory: "GENERIC",
  dosageForm: "TABLET",
  strength: "",
  strengthUnit: "mg",
  composition: [{ id: "cmp_new", ingredientName: "", activeIngredient: true, strength: "", unit: "mg", quantity: "", role: "API", sortOrder: 0 }],
  specifications: [{ specificationType: "Finished product", parameter: "", limit: "", unit: "", testMethod: "", remarks: "" }],
  therapeuticCategory: "",
  pharmacopoeiaStandard: "IP",
  manufacturingSite: "",
  manufacturingUnit: "",
  packagingType: "",
  standardPackSize: "",
  marketType: "DOMESTIC",
  status: "DRAFT",
  regulatoryStatus: "NOT_ASSESSED",
  description: "",
  notes: "",
};

export function ProductForm({
  defaultValues,
  submitting,
  submitLabel = "Save product",
  onSubmit,
}: {
  defaultValues: ProductFormValues;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: ProductFormValues) => Promise<void>;
}) {
  const form = useForm<ProductFormValues>({ resolver: zodResolver(productFormSchema), defaultValues });
  const composition = form.watch("composition") ?? [];
  const specifications = form.watch("specifications") ?? [];

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader><CardTitle>Basic information</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Product name *" htmlFor="productName" error={form.formState.errors.productName?.message}>
            <Input id="productName" {...form.register("productName")} />
          </FormField>
          <FormField label="Generic name *" htmlFor="genericName" error={form.formState.errors.genericName?.message}>
            <Input id="genericName" {...form.register("genericName")} />
          </FormField>
          <FormField label="Brand name" htmlFor="brandName"><Input id="brandName" {...form.register("brandName")} /></FormField>
          <FormField label="Product type *" htmlFor="productType">
            <Select id="productType" {...form.register("productType")}>{DOSAGE_FORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          </FormField>
          <FormField label="Product category" htmlFor="productCategory">
            <Select id="productCategory" {...form.register("productCategory")}>{PRODUCT_CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dosage information</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <FormField label="Dosage form *" htmlFor="dosageForm">
            <Select id="dosageForm" {...form.register("dosageForm")}>{DOSAGE_FORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          </FormField>
          <FormField label="Strength" htmlFor="strength"><Input id="strength" {...form.register("strength")} /></FormField>
          <FormField label="Strength unit" htmlFor="strengthUnit">
            <Select id="strengthUnit" {...form.register("strengthUnit")}>{STRENGTH_UNIT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Composition</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {composition.map((line, index) => (
            <div key={line.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-6">
              <Input placeholder="Ingredient *" {...form.register(`composition.${index}.ingredientName`)} />
              <Input placeholder="Strength *" {...form.register(`composition.${index}.strength`)} />
              <Select {...form.register(`composition.${index}.unit`)}>{STRENGTH_UNIT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
              <Input placeholder="Quantity" {...form.register(`composition.${index}.quantity`)} />
              <Select {...form.register(`composition.${index}.role`)}>{INGREDIENT_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" {...form.register(`composition.${index}.activeIngredient`)} /> API</label>
                <Button type="button" size="sm" variant="ghost" onClick={() => form.setValue("composition", composition.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
              </div>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => form.setValue("composition", [...composition, { id: `cmp_${crypto.randomUUID().slice(0, 6)}`, ingredientName: "", activeIngredient: false, strength: "", unit: "mg", quantity: "", role: "EXCIPIENT", sortOrder: composition.length }])}>Add ingredient</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Specifications (QC capture only)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {specifications.map((line, index) => (
            <div key={`${line.parameter}-${index}`} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-5">
              <Input placeholder="Type" {...form.register(`specifications.${index}.specificationType`)} />
              <Input placeholder="Parameter" {...form.register(`specifications.${index}.parameter`)} />
              <Input placeholder="Limit" {...form.register(`specifications.${index}.limit`)} />
              <Input placeholder="Unit" {...form.register(`specifications.${index}.unit`)} />
              <Input placeholder="Test method" {...form.register(`specifications.${index}.testMethod`)} />
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => form.setValue("specifications", [...specifications, { specificationType: "", parameter: "", limit: "", unit: "", testMethod: "", remarks: "" }])}>Add specification</Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Therapeutic / manufacturing</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <FormField label="Therapeutic category" htmlFor="therapeuticCategory"><Input id="therapeuticCategory" {...form.register("therapeuticCategory")} /></FormField>
            <FormField label="Pharmacopoeia" htmlFor="pharmacopoeiaStandard">
              <Select id="pharmacopoeiaStandard" {...form.register("pharmacopoeiaStandard")}>{PHARMACOPOEIA_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
            </FormField>
            <FormField label="Manufacturing site" htmlFor="manufacturingSite">
              <Select id="manufacturingSite" {...form.register("manufacturingSite")}><option value="">Select</option>{MANUFACTURING_SITE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
            </FormField>
            <FormField label="Manufacturing unit" htmlFor="manufacturingUnit"><Input id="manufacturingUnit" {...form.register("manufacturingUnit")} /></FormField>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Packaging / market / status</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <FormField label="Packaging type" htmlFor="packagingType">
              <Select id="packagingType" {...form.register("packagingType")}><option value="">Select</option>{PACKAGING_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
            </FormField>
            <FormField label="Standard pack size" htmlFor="standardPackSize"><Input id="standardPackSize" {...form.register("standardPackSize")} /></FormField>
            <FormField label="Market type" htmlFor="marketType">
              <Select id="marketType" {...form.register("marketType")}>{PRODUCT_MARKET_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
            </FormField>
            <FormField label="Status" htmlFor="status">
              <Select id="status" {...form.register("status")}>{PRODUCT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
            </FormField>
            <FormField label="Regulatory status" htmlFor="regulatoryStatus">
              <Select id="regulatoryStatus" {...form.register("regulatoryStatus")}>{REGULATORY_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
            </FormField>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Description</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <Textarea rows={3} placeholder="Description" {...form.register("description")} />
          <Textarea rows={2} placeholder="Internal notes" {...form.register("notes")} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}
