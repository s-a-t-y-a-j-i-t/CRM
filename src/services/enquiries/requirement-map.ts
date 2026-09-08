import { toMinorUnits } from "@/lib/money";
import type { CurrencyCode } from "@/types/common";
import type { ProductRequirementFormValues } from "@/schemas/enquiries";
import type { ProductRequirement } from "@/types/enquiries";
import type { AuthenticatedUser } from "@/types/rbac";
import type { EnquiryCurrency } from "@/constants/pharma";

function moneyCurrency(value: EnquiryCurrency): CurrencyCode {
  return value === "AED" || value === "OTHER" ? "USD" : value;
}

export function emptyRequirementForm(): ProductRequirementFormValues {
  return {
    productMasterId: "",
    isNewProductRequirement: true,
    productName: "",
    genericName: "",
    brandName: "",
    dosageForm: "TABLET",
    strength: "",
    composition: [{ id: "cmp_new", ingredient: "", strength: "", unit: "mg", quantityRatio: "", role: "API", sortOrder: 0 }],
    primaryType: "",
    secondaryType: "",
    tertiaryType: "",
    packSize: "",
    packagingNotes: "",
    quantityUnit: "TABLETS",
    currency: "INR",
    priceBasis: "",
    market: "",
    country: "India",
    marketType: "DOMESTIC",
    artworkStatus: "ARTWORK_REQUIRED",
    specificationStatus: "SPECIFICATION_REQUIRED",
    sampleRequired: false,
    sampleStatus: "NOT_REQUIRED",
    stabilityRequired: false,
    changeReason: "",
  };
}

export function requirementToForm(req: ProductRequirement): ProductRequirementFormValues {
  return {
    productMasterId: req.productMasterId ?? "",
    isNewProductRequirement: req.isNewProductRequirement,
    productName: req.productName,
    genericName: req.genericName ?? "",
    brandName: req.brandName ?? "",
    dosageForm: req.dosageForm,
    strength: req.strength ?? "",
    composition: req.composition.length
      ? req.composition
      : [{ id: "cmp_new", ingredient: "", strength: "", unit: "mg", role: "API", sortOrder: 0 }],
    primaryType: req.packaging.primaryType ?? "",
    secondaryType: req.packaging.secondaryType ?? "",
    tertiaryType: req.packaging.tertiaryType ?? "",
    packSize: req.packSize ?? req.packaging.packSize ?? "",
    unitsPerPack: req.packaging.unitsPerPack,
    packagingNotes: req.packaging.notes,
    requiredQuantity: req.requiredQuantity,
    quantityUnit: req.quantityUnit,
    annualQuantity: req.annualQuantity,
    batchQuantity: req.batchQuantity,
    moqRequirement: req.moqRequirement,
    targetPrice: req.targetPriceMinor ? req.targetPriceMinor / 100 : undefined,
    currency: req.currency,
    priceBasis: req.priceBasis ?? "",
    market: req.market ?? "",
    country: req.country ?? "",
    marketType: req.marketType ?? "",
    regulatoryRequirement: req.regulatoryRequirement,
    customerRegulatoryRequirement: req.customerRegulatoryRequirement,
    licenseRequirement: req.licenseRequirement,
    regulatoryNotes: req.regulatoryNotes,
    artworkStatus: req.artwork.status,
    artworkNotes: req.artwork.notes,
    specificationStatus: req.specification.status,
    specificationType: req.specification.specificationType ?? "",
    specificationNotes: req.specification.notes,
    sampleRequired: req.sample.required,
    sampleQuantity: req.sample.quantity,
    sampleType: req.sample.sampleType ?? "",
    sampleDeliveryDate: req.sample.deliveryDate ?? "",
    sampleStatus: req.sample.status,
    sampleNotes: req.sample.notes,
    stabilityRequired: req.stability.required,
    stabilityType: req.stability.stabilityType ?? "",
    storageCondition: req.stability.storageCondition ?? "",
    stabilityDuration: req.stability.duration ?? "",
    stabilityNotes: req.stability.notes,
    requiredDeliveryDate: req.delivery.requiredDeliveryDate ?? "",
    expectedLeadTime: req.delivery.expectedLeadTime ?? "",
    deliveryLocation: req.delivery.deliveryLocation ?? "",
    logisticsNotes: req.delivery.logisticsNotes,
    specialRequirements: req.specialRequirements,
    changeReason: "",
  };
}

export function formToRequirementPatch(
  values: ProductRequirementFormValues,
  enquiryId: string,
  _actor: AuthenticatedUser,
): Omit<ProductRequirement, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "versionNumber" | "isCurrent"> {
  return {
    enquiryId,
    productMasterId: values.productMasterId || undefined,
    isNewProductRequirement: values.isNewProductRequirement,
    productName: values.productName,
    genericName: values.genericName || undefined,
    brandName: values.brandName || undefined,
    dosageForm: values.dosageForm,
    strength: values.strength || undefined,
    composition: values.composition.map((line, index) => ({ ...line, sortOrder: index })),
    packaging: {
      primaryType: values.primaryType || undefined,
      secondaryType: values.secondaryType || undefined,
      tertiaryType: values.tertiaryType || undefined,
      packSize: values.packSize || undefined,
      unitsPerPack: values.unitsPerPack,
      notes: values.packagingNotes,
    },
    packSize: values.packSize || undefined,
    requiredQuantity: values.requiredQuantity,
    quantityUnit: values.quantityUnit,
    annualQuantity: values.annualQuantity,
    batchQuantity: values.batchQuantity,
    moqRequirement: values.moqRequirement,
    targetPriceMinor: values.targetPrice ? toMinorUnits(values.targetPrice, moneyCurrency(values.currency)) : undefined,
    currency: values.currency,
    priceBasis: values.priceBasis || undefined,
    market: values.market || undefined,
    country: values.country || undefined,
    marketType: values.marketType || undefined,
    regulatoryRequirement: values.regulatoryRequirement,
    customerRegulatoryRequirement: values.customerRegulatoryRequirement,
    licenseRequirement: values.licenseRequirement,
    regulatoryNotes: values.regulatoryNotes,
    artwork: { status: values.artworkStatus, notes: values.artworkNotes },
    specification: {
      status: values.specificationStatus,
      specificationType: values.specificationType || undefined,
      notes: values.specificationNotes,
    },
    sample: {
      required: values.sampleRequired,
      quantity: values.sampleQuantity,
      sampleType: values.sampleType || undefined,
      deliveryDate: values.sampleDeliveryDate || undefined,
      status: values.sampleStatus,
      notes: values.sampleNotes,
    },
    stability: {
      required: values.stabilityRequired,
      stabilityType: values.stabilityType || undefined,
      storageCondition: values.storageCondition || undefined,
      duration: values.stabilityDuration || undefined,
      notes: values.stabilityNotes,
    },
    delivery: {
      requiredDeliveryDate: values.requiredDeliveryDate || undefined,
      expectedLeadTime: values.expectedLeadTime || undefined,
      deliveryLocation: values.deliveryLocation || undefined,
      logisticsNotes: values.logisticsNotes,
    },
    specialRequirements: values.specialRequirements,
  };
}
