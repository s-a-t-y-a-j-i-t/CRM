"use client";

import { useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { COUNTRY_OPTIONS } from "@/constants/customers";
import {
  DOSAGE_FORM_OPTIONS,
  ENQUIRY_CURRENCY_OPTIONS,
  INGREDIENT_ROLE_OPTIONS,
  PACKAGING_TYPE_OPTIONS,
  PRICE_BASIS_OPTIONS,
  QUANTITY_UNIT_OPTIONS,
  STRENGTH_UNIT_OPTIONS,
} from "@/constants/pharma";
import { ARTWORK_STATUS_OPTIONS, SAMPLE_STATUS_OPTIONS, SPECIFICATION_STATUS_OPTIONS } from "@/constants/enquiries";
import { PHARMA_DOSAGE_FORMS, type PharmaDosageForm } from "@/constants/pharma";
import { searchProducts } from "@/services/products/product.service";
import { useAuth } from "@/hooks/useAuth";
import type { EnquiryFormValues } from "@/schemas/enquiries";

function mapDosage(value: string): PharmaDosageForm {
  const key = value.toUpperCase().replaceAll("-", "_") as PharmaDosageForm;
  return (PHARMA_DOSAGE_FORMS as readonly string[]).includes(key) ? key : "OTHER";
}

export function RequirementFields({
  form,
  showChangeReason,
}: {
  form: UseFormReturn<EnquiryFormValues>;
  showChangeReason?: boolean;
}) {
  const composition = form.watch("requirement.composition") ?? [];
  const { user } = useAuth();
  const [productQuery, setProductQuery] = useState("");
  const productMatches = useMemo(() => {
    if (!user || !productQuery.trim()) return [];
    try {
      return searchProducts(productQuery, user);
    } catch {
      return [];
    }
  }, [productQuery, user]);

  function addLine() {
    form.setValue("requirement.composition", [
      ...composition,
      { id: `cmp_${crypto.randomUUID().slice(0, 6)}`, ingredient: "", strength: "", unit: "mg", quantityRatio: "", role: "API", sortOrder: composition.length },
    ]);
  }

  function moveLine(index: number, direction: -1 | 1) {
    const next = [...composition];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const current = next[index];
    const swap = next[target];
    if (!current || !swap) return;
    next[index] = swap;
    next[target] = current;
    form.setValue("requirement.composition", next.map((line, sortOrder) => ({ ...line, sortOrder })));
  }

  function numberField(name: `requirement.${"requiredQuantity" | "annualQuantity" | "batchQuantity" | "moqRequirement" | "targetPrice" | "unitsPerPack" | "sampleQuantity"}`) {
    return form.register(name, {
      setValueAs: (value) => (value === "" || value === null || Number.isNaN(Number(value)) ? undefined : Number(value)),
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Product information</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.watch("requirement.isNewProductRequirement")} onChange={(event) => form.setValue("requirement.isNewProductRequirement", event.target.checked)} />
            New product requirement (does not create a product master)
          </label>
          <div className="sm:col-span-2 space-y-2">
            <FormField label="Select existing product master (optional)" htmlFor="productMasterSearch">
              <Input id="productMasterSearch" placeholder="Search product code, generic or brand" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} />
            </FormField>
            {productMatches.length > 0 ? (
              <ul className="rounded-lg border border-border text-sm">
                {productMatches.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        form.setValue("requirement.productMasterId", product.id);
                        form.setValue("requirement.isNewProductRequirement", false);
                        form.setValue("requirement.productName", product.productName);
                        form.setValue("requirement.genericName", product.genericName);
                        form.setValue("requirement.brandName", product.brandName ?? "");
                        form.setValue("requirement.dosageForm", mapDosage(product.dosageForm));
                        form.setValue("requirement.strength", product.strength ?? "");
                        form.setValue("requirement.packSize", product.standardPackSize ?? "");
                        setProductQuery("");
                      }}
                    >
                      {product.productCode} · {product.genericName} {product.strength}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-xs text-muted-foreground">Product master is the company catalogue. This form still captures a customer-specific requirement.</p>
          </div>
          <FormField label="Product name *" htmlFor="productName" error={form.formState.errors.requirement?.productName?.message}>
            <Input id="productName" {...form.register("requirement.productName")} />
          </FormField>
          <FormField label="Generic name" htmlFor="genericName">
            <Input id="genericName" {...form.register("requirement.genericName")} />
          </FormField>
          <FormField label="Brand name" htmlFor="brandName">
            <Input id="brandName" {...form.register("requirement.brandName")} />
          </FormField>
          <FormField label="Dosage form *" htmlFor="dosageForm" error={form.formState.errors.requirement?.dosageForm?.message}>
            <Select id="dosageForm" {...form.register("requirement.dosageForm")}>
              {DOSAGE_FORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Strength" htmlFor="strength">
            <Input id="strength" {...form.register("requirement.strength")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Composition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {composition.map((line, index) => (
            <div key={line.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-6">
              <Input placeholder="Ingredient *" {...form.register(`requirement.composition.${index}.ingredient`)} />
              <Input placeholder="Strength *" {...form.register(`requirement.composition.${index}.strength`)} />
              <Select {...form.register(`requirement.composition.${index}.unit`)}>
                {STRENGTH_UNIT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <Input placeholder="Ratio" {...form.register(`requirement.composition.${index}.quantityRatio`)} />
              <Select {...form.register(`requirement.composition.${index}.role`)}>
                {INGREDIENT_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => moveLine(index, -1)}>Up</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => moveLine(index, 1)}>Down</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => form.setValue("requirement.composition", composition.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
              </div>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={addLine}>Add ingredient</Button>
          {form.formState.errors.requirement?.composition?.message ? (
            <p className="text-xs text-destructive">{form.formState.errors.requirement.composition.message}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Packaging</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Primary packaging" htmlFor="primaryType">
            <Select id="primaryType" {...form.register("requirement.primaryType")}>
              <option value="">Select</option>
              {PACKAGING_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Secondary packaging" htmlFor="secondaryType">
            <Select id="secondaryType" {...form.register("requirement.secondaryType")}>
              <option value="">Select</option>
              {PACKAGING_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Tertiary packaging" htmlFor="tertiaryType">
            <Select id="tertiaryType" {...form.register("requirement.tertiaryType")}>
              <option value="">Select</option>
              {PACKAGING_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Pack size" htmlFor="packSize">
            <Input id="packSize" {...form.register("requirement.packSize")} />
          </FormField>
          <FormField label="Units per pack" htmlFor="unitsPerPack">
            <Input id="unitsPerPack" type="number" min={0} {...numberField("requirement.unitsPerPack")} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Special packaging notes" htmlFor="packagingNotes">
              <Textarea id="packagingNotes" rows={2} {...form.register("requirement.packagingNotes")} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Quantity and commercial</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Required quantity" htmlFor="requiredQuantity" error={form.formState.errors.requirement?.requiredQuantity?.message}>
            <Input id="requiredQuantity" type="number" min={0} {...numberField("requirement.requiredQuantity")} />
          </FormField>
          <FormField label="Unit" htmlFor="quantityUnit">
            <Select id="quantityUnit" {...form.register("requirement.quantityUnit")}>
              {QUANTITY_UNIT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Annual quantity" htmlFor="annualQuantity">
            <Input id="annualQuantity" type="number" min={0} {...numberField("requirement.annualQuantity")} />
          </FormField>
          <FormField label="Batch quantity" htmlFor="batchQuantity">
            <Input id="batchQuantity" type="number" min={0} {...numberField("requirement.batchQuantity")} />
          </FormField>
          <FormField label="MOQ" htmlFor="moqRequirement">
            <Input id="moqRequirement" type="number" min={0} {...numberField("requirement.moqRequirement")} />
          </FormField>
          <FormField label="Target price" htmlFor="targetPrice" error={form.formState.errors.requirement?.targetPrice?.message}>
            <Input id="targetPrice" type="number" min={0} step="0.01" {...numberField("requirement.targetPrice")} />
          </FormField>
          <FormField label="Currency" htmlFor="currency">
            <Select id="currency" {...form.register("requirement.currency")}>
              {ENQUIRY_CURRENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Price basis" htmlFor="priceBasis">
            <Select id="priceBasis" {...form.register("requirement.priceBasis")}>
              <option value="">Select</option>
              {PRICE_BASIS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Market and regulatory capture</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Market" htmlFor="market">
            <Input id="market" {...form.register("requirement.market")} />
          </FormField>
          <FormField label="Country" htmlFor="reqCountry">
            <Select id="reqCountry" {...form.register("requirement.country")}>
              <option value="">Select</option>
              {COUNTRY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Regulatory market type" htmlFor="marketType">
            <Select id="marketType" {...form.register("requirement.marketType")}>
              <option value="">Select</option>
              <option value="DOMESTIC">Domestic</option>
              <option value="EXPORT">Export</option>
            </Select>
          </FormField>
          <p className="sm:col-span-2 text-xs text-muted-foreground">These fields capture customer requirements. They do not make the CRM itself regulatory compliant.</p>
          <FormField label="Regulatory requirement" htmlFor="regulatoryRequirement">
            <Textarea id="regulatoryRequirement" rows={2} {...form.register("requirement.regulatoryRequirement")} />
          </FormField>
          <FormField label="Customer regulatory requirement" htmlFor="customerRegulatoryRequirement">
            <Textarea id="customerRegulatoryRequirement" rows={2} {...form.register("requirement.customerRegulatoryRequirement")} />
          </FormField>
          <FormField label="License / registration requirement" htmlFor="licenseRequirement">
            <Textarea id="licenseRequirement" rows={2} {...form.register("requirement.licenseRequirement")} />
          </FormField>
          <FormField label="Special regulatory notes" htmlFor="regulatoryNotes">
            <Textarea id="regulatoryNotes" rows={2} {...form.register("requirement.regulatoryNotes")} />
          </FormField>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Artwork</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select {...form.register("requirement.artworkStatus")}>
              {ARTWORK_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            <Textarea placeholder="Artwork notes" {...form.register("requirement.artworkNotes")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Specification</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select {...form.register("requirement.specificationStatus")}>
              {SPECIFICATION_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            <Input placeholder="Specification type" {...form.register("requirement.specificationType")} />
            <Textarea placeholder="Specification notes" {...form.register("requirement.specificationNotes")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sample</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.watch("requirement.sampleRequired")} onChange={(event) => form.setValue("requirement.sampleRequired", event.target.checked)} />
              Sample required
            </label>
            <Input type="number" min={0} placeholder="Sample quantity" {...numberField("requirement.sampleQuantity")} />
            <Input placeholder="Sample type" {...form.register("requirement.sampleType")} />
            <Input type="date" {...form.register("requirement.sampleDeliveryDate")} />
            <Select {...form.register("requirement.sampleStatus")}>
              {SAMPLE_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            <Textarea placeholder="Sample notes" {...form.register("requirement.sampleNotes")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Stability (capture only)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.watch("requirement.stabilityRequired")} onChange={(event) => form.setValue("requirement.stabilityRequired", event.target.checked)} />
              Stability required
            </label>
            <Input placeholder="Stability type" {...form.register("requirement.stabilityType")} />
            <Input placeholder="Storage condition" {...form.register("requirement.storageCondition")} />
            <Input placeholder="Duration" {...form.register("requirement.stabilityDuration")} />
            <Textarea placeholder="Special requirement" {...form.register("requirement.stabilityNotes")} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Delivery</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Required delivery date" htmlFor="requiredDeliveryDate">
            <Input id="requiredDeliveryDate" type="date" {...form.register("requirement.requiredDeliveryDate")} />
          </FormField>
          <FormField label="Expected lead time" htmlFor="expectedLeadTime">
            <Input id="expectedLeadTime" {...form.register("requirement.expectedLeadTime")} />
          </FormField>
          <FormField label="Delivery location" htmlFor="deliveryLocation">
            <Input id="deliveryLocation" {...form.register("requirement.deliveryLocation")} />
          </FormField>
          <FormField label="Special logistics" htmlFor="logisticsNotes">
            <Textarea id="logisticsNotes" rows={2} {...form.register("requirement.logisticsNotes")} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Special requirements" htmlFor="specialRequirements">
              <Textarea id="specialRequirements" rows={3} {...form.register("requirement.specialRequirements")} />
            </FormField>
          </div>
          {showChangeReason ? (
            <div className="sm:col-span-2">
              <FormField label="Change reason (creates a new version)" htmlFor="changeReason">
                <Input id="changeReason" {...form.register("requirement.changeReason")} />
              </FormField>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
