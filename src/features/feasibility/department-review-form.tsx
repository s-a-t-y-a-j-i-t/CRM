"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAuth } from "@/hooks/useAuth";
import { submitDepartmentReview } from "@/services/feasibility/feasibility-review.service";
import {
  DEPARTMENT_REVIEW_STATUS_OPTIONS,
  FEASIBILITY_DECISION_OPTIONS,
  SUPPLY_AVAILABILITY_OPTIONS,
} from "@/constants/feasibility";
import { departmentReviewSchema, type DepartmentReviewValues } from "@/schemas/feasibility";
import { toUserMessage } from "@/lib/errors";
import type { DepartmentReview } from "@/types/feasibility";

export function DepartmentReviewForm({ review }: { review: DepartmentReview }) {
  const { user } = useAuth();
  const form = useForm<DepartmentReviewValues>({
    resolver: zodResolver(departmentReviewSchema),
    defaultValues: {
      status: review.status === "PENDING" ? "IN_REVIEW" : review.status,
      decision: review.decision ?? "FEASIBLE",
      remarks: review.remarks ?? "",
      manufacturingLine: review.production?.manufacturingLine ?? "",
      availableCapacity: review.production?.availableCapacity ?? "",
      requiredCapacity: review.production?.requiredCapacity ?? "",
      batchSize: review.production?.batchSize ?? "",
      estimatedBatches: review.production?.estimatedBatches,
      processAvailable: review.production?.processAvailable,
      equipmentAvailable: review.production?.equipmentAvailable,
      technologyAvailable: review.production?.technologyAvailable,
      qualityRequirements: review.qa?.qualityRequirements ?? "",
      specificationAvailability: review.qa?.specificationAvailability ?? "",
      qualitySystemRequirements: review.qa?.qualitySystemRequirements ?? "",
      documentationRequirements: review.qa?.documentationRequirements ?? "",
      specialRequirements: review.qa?.specialRequirements ?? "",
      testingRequirement: review.qc?.testingRequirement ?? "",
      methodAvailable: review.qc?.methodAvailable,
      instrumentAvailability: review.qc?.instrumentAvailability ?? "",
      referenceStandardAvailability: review.qc?.referenceStandardAvailability ?? "",
      sampleRequirement: review.qc?.sampleRequirement ?? "",
      targetMarket: review.regulatory?.targetMarket ?? "",
      regulatoryPath: review.regulatory?.regulatoryPath ?? "",
      registrationRequirement: review.regulatory?.registrationRequirement ?? "",
      customerRegistrationRequirement: review.regulatory?.customerRegistrationRequirement ?? "",
      documentationRequirement: review.regulatory?.documentationRequirement ?? "",
      licenseRequirement: review.regulatory?.licenseRequirement ?? "",
      packagingType: review.packaging?.packagingType ?? "",
      packSize: review.packaging?.packSize ?? "",
      materialAvailability: review.packaging?.materialAvailability ?? "",
      artworkRequirement: review.packaging?.artworkRequirement ?? "",
      specialRequirement: review.packaging?.specialRequirement ?? "",
      apiAvailability: review.supply?.apiAvailability,
      excipientAvailability: review.supply?.excipientAvailability,
      packagingMaterialAvailability: review.supply?.packagingMaterialAvailability,
      supplierAvailability: review.supply?.supplierAvailability,
      leadTime: review.supply?.leadTime ?? "",
    },
  });

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>{review.departmentName}</span>
          <StatusBadge value={review.status} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await submitDepartmentReview(review.id, values, user);
              toast.success(`${review.departmentName} review submitted`);
            } catch (error) {
              toast.error(toUserMessage(error));
            }
          })}
        >
          <p className="text-xs text-muted-foreground">
            Reviewer: {review.reviewerName ?? "Unassigned"}. This is a business workflow, not production planning, QC execution, or legal advice.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Review status" htmlFor={`${review.id}-status`}>
              <Select id={`${review.id}-status`} {...form.register("status")}>
                {DEPARTMENT_REVIEW_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Decision" htmlFor={`${review.id}-decision`}>
              <Select id={`${review.id}-decision`} {...form.register("decision")}>
                {FEASIBILITY_DECISION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </FormField>
          </div>

          {review.departmentId === "PRODUCTION" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Manufacturing line" htmlFor="manufacturingLine"><Input id="manufacturingLine" {...form.register("manufacturingLine")} /></FormField>
              <FormField label="Available capacity" htmlFor="availableCapacity"><Input id="availableCapacity" {...form.register("availableCapacity")} /></FormField>
              <FormField label="Required capacity" htmlFor="requiredCapacity"><Input id="requiredCapacity" {...form.register("requiredCapacity")} /></FormField>
              <FormField label="Batch size" htmlFor="batchSize"><Input id="batchSize" {...form.register("batchSize")} /></FormField>
              <FormField label="Estimated batches" htmlFor="estimatedBatches">
                <Input id="estimatedBatches" type="number" min={0} {...form.register("estimatedBatches", { setValueAs: (value) => (value === "" ? undefined : Number(value)) })} />
              </FormField>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("processAvailable")} /> Process available</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("equipmentAvailable")} /> Equipment available</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("technologyAvailable")} /> Technology available</label>
            </div>
          ) : null}

          {review.departmentId === "QA" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Quality requirements" htmlFor="qualityRequirements"><Textarea id="qualityRequirements" {...form.register("qualityRequirements")} /></FormField>
              <FormField label="Specification availability" htmlFor="specificationAvailability"><Input id="specificationAvailability" {...form.register("specificationAvailability")} /></FormField>
              <FormField label="Quality system requirements" htmlFor="qualitySystemRequirements"><Textarea id="qualitySystemRequirements" {...form.register("qualitySystemRequirements")} /></FormField>
              <FormField label="Documentation requirements" htmlFor="documentationRequirements"><Textarea id="documentationRequirements" {...form.register("documentationRequirements")} /></FormField>
              <FormField label="Special quality requirements" htmlFor="specialRequirements"><Textarea id="specialRequirements" {...form.register("specialRequirements")} /></FormField>
            </div>
          ) : null}

          {review.departmentId === "QC" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Testing requirement" htmlFor="testingRequirement"><Textarea id="testingRequirement" {...form.register("testingRequirement")} /></FormField>
              <FormField label="Instrument availability" htmlFor="instrumentAvailability"><Input id="instrumentAvailability" {...form.register("instrumentAvailability")} /></FormField>
              <FormField label="Reference standard availability" htmlFor="referenceStandardAvailability"><Input id="referenceStandardAvailability" {...form.register("referenceStandardAvailability")} /></FormField>
              <FormField label="Sample requirement" htmlFor="sampleRequirement"><Input id="sampleRequirement" {...form.register("sampleRequirement")} /></FormField>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("methodAvailable")} /> Testing method available</label>
            </div>
          ) : null}

          {review.departmentId === "REGULATORY" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Target market" htmlFor="targetMarket"><Input id="targetMarket" {...form.register("targetMarket")} /></FormField>
              <FormField label="Regulatory path" htmlFor="regulatoryPath"><Input id="regulatoryPath" {...form.register("regulatoryPath")} /></FormField>
              <FormField label="Registration requirement" htmlFor="registrationRequirement"><Textarea id="registrationRequirement" {...form.register("registrationRequirement")} /></FormField>
              <FormField label="Customer registration requirement" htmlFor="customerRegistrationRequirement"><Textarea id="customerRegistrationRequirement" {...form.register("customerRegistrationRequirement")} /></FormField>
              <FormField label="Product documentation requirement" htmlFor="documentationRequirement"><Textarea id="documentationRequirement" {...form.register("documentationRequirement")} /></FormField>
              <FormField label="License requirement" htmlFor="licenseRequirement"><Textarea id="licenseRequirement" {...form.register("licenseRequirement")} /></FormField>
              <p className="sm:col-span-2 text-xs text-muted-foreground">Capture only. This screen does not provide regulatory or legal advice.</p>
            </div>
          ) : null}

          {review.departmentId === "PACKAGING" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Packaging type" htmlFor="packagingType"><Input id="packagingType" {...form.register("packagingType")} /></FormField>
              <FormField label="Pack size" htmlFor="packSize"><Input id="packSize" {...form.register("packSize")} /></FormField>
              <FormField label="Material availability" htmlFor="materialAvailability"><Input id="materialAvailability" {...form.register("materialAvailability")} /></FormField>
              <FormField label="Artwork requirement" htmlFor="artworkRequirement"><Input id="artworkRequirement" {...form.register("artworkRequirement")} /></FormField>
              <FormField label="Special packaging requirement" htmlFor="specialRequirement"><Textarea id="specialRequirement" {...form.register("specialRequirement")} /></FormField>
            </div>
          ) : null}

          {review.departmentId === "SUPPLY_CHAIN" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="API availability" htmlFor="apiAvailability">
                <Select id="apiAvailability" {...form.register("apiAvailability")}>
                  <option value="">Select</option>
                  {SUPPLY_AVAILABILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              </FormField>
              <FormField label="Excipient availability" htmlFor="excipientAvailability">
                <Select id="excipientAvailability" {...form.register("excipientAvailability")}>
                  <option value="">Select</option>
                  {SUPPLY_AVAILABILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              </FormField>
              <FormField label="Packaging material availability" htmlFor="packagingMaterialAvailability">
                <Select id="packagingMaterialAvailability" {...form.register("packagingMaterialAvailability")}>
                  <option value="">Select</option>
                  {SUPPLY_AVAILABILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              </FormField>
              <FormField label="Supplier availability" htmlFor="supplierAvailability">
                <Select id="supplierAvailability" {...form.register("supplierAvailability")}>
                  <option value="">Select</option>
                  {SUPPLY_AVAILABILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              </FormField>
              <FormField label="Lead time" htmlFor="leadTime"><Input id="leadTime" {...form.register("leadTime")} /></FormField>
              <p className="sm:col-span-2 text-xs text-muted-foreground">Procurement and purchase orders are a later phase.</p>
            </div>
          ) : null}

          <FormField label="Remarks" htmlFor={`${review.id}-remarks`}>
            <Textarea id={`${review.id}-remarks`} rows={3} {...form.register("remarks")} />
          </FormField>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Submit department review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
