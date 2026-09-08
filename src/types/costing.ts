import type { EntityId, IsoDateString, MoneyMinor, UserId } from "@/types/common";
import type { QuantityUnit } from "@/constants/pharma";
import type {
  AdjustmentType,
  CostingApprovalLevelId,
  CostingApprovalStatus,
  CostingCurrency,
  CostingDocumentType,
  CostingStatus,
  LaborCategory,
  MarginType,
  MaterialType,
  OverheadMode,
  OverheadType,
  PackagingLevel,
  PriceAdjustmentType,
  QualityActivity,
  UtilityType,
} from "@/constants/costing";

export interface CostingMaterialLine {
  id: EntityId;
  costingId: EntityId;
  materialType: MaterialType;
  materialId?: EntityId;
  materialName: string;
  quantityRequired: number;
  unit: string;
  unitCostMinor: MoneyMinor;
  wastagePercent: number;
  wastageQuantity: number;
  effectiveQuantity: number;
  totalCostMinor: MoneyMinor;
  supplierId?: string;
  remarks?: string;
  sortOrder: number;
}

export interface CostingPackagingLine {
  id: EntityId;
  costingId: EntityId;
  level: PackagingLevel;
  materialName: string;
  packagingType?: string;
  packSize?: string;
  quantityRequired: number;
  unit: string;
  unitCostMinor: MoneyMinor;
  wastagePercent: number;
  effectiveQuantity: number;
  totalCostMinor: MoneyMinor;
  remarks?: string;
  sortOrder: number;
}

export interface CostingLaborLine {
  id: EntityId;
  department: string;
  category: LaborCategory;
  hours: number;
  hourlyCostMinor: MoneyMinor;
  totalCostMinor: MoneyMinor;
}

export interface CostingMachineLine {
  id: EntityId;
  machine: string;
  machineHours: number;
  hourlyRateMinor: MoneyMinor;
  totalCostMinor: MoneyMinor;
}

export interface CostingUtilityLine {
  id: EntityId;
  utilityType: UtilityType;
  consumption: number;
  unit: string;
  rateMinor: MoneyMinor;
  totalCostMinor: MoneyMinor;
}

export interface CostingManufacturing {
  costingId: EntityId;
  manufacturingSite?: string;
  manufacturingUnit?: string;
  productionLine?: string;
  batchSize?: number;
  numberOfBatches?: number;
  setupCostMinor: MoneyMinor;
  changeoverCostMinor: MoneyMinor;
  processingCostMinor: MoneyMinor;
  cleaningCostMinor: MoneyMinor;
  labor: CostingLaborLine[];
  machines: CostingMachineLine[];
  utilities: CostingUtilityLine[];
}

export interface CostingQualityLine {
  id: EntityId;
  costingId: EntityId;
  activity: QualityActivity;
  quantity: number;
  unitCostMinor: MoneyMinor;
  totalCostMinor: MoneyMinor;
  remarks?: string;
}

export interface CostingActivityCostLine {
  id: EntityId;
  costingId: EntityId;
  activity: string;
  costMinor: MoneyMinor;
  remarks?: string;
}

export interface CostingOverheadLine {
  id: EntityId;
  costingId: EntityId;
  overheadType: OverheadType;
  mode: OverheadMode;
  percent?: number;
  amountMinor?: MoneyMinor;
  totalCostMinor: MoneyMinor;
  remarks?: string;
}

export interface CostingAdjustment {
  id: EntityId;
  costingId: EntityId;
  scope: "MATERIAL" | "PACKAGING" | "PRICE";
  adjustmentType: AdjustmentType | PriceAdjustmentType;
  amountMinor?: MoneyMinor;
  percentage?: number;
  reason: string;
  approvedBy?: UserId;
  approvedByName?: string;
  createdAt: IsoDateString;
  createdBy: UserId;
  createdByName: string;
}

export interface CostingVolumeTier {
  id: EntityId;
  costingId: EntityId;
  minimumQuantity: number;
  maximumQuantity?: number;
  unitPriceMinor: MoneyMinor;
  marginPercent?: number;
}

export interface CostingApprovalRecord {
  id: EntityId;
  costingId: EntityId;
  levelId: CostingApprovalLevelId;
  levelName: string;
  decision: "SUBMITTED" | "REVIEWED" | "APPROVED" | "REJECTED" | "REASSIGNED";
  remarks?: string;
  actorId: UserId;
  actorName: string;
  actorRole: string;
  createdAt: IsoDateString;
}

export interface CostingDocument {
  id: EntityId;
  costingId: EntityId;
  documentType: CostingDocumentType;
  fileName: string;
  storagePath?: string;
  version: string;
  uploadedBy: UserId;
  uploadedByName: string;
  uploadedAt: IsoDateString;
  status: "ACTIVE" | "ARCHIVED";
}

export interface CostingVersionSnapshot {
  id: EntityId;
  costingId: EntityId;
  version: number;
  costingNumber: string;
  changeReason: string;
  totals: CostingTotals;
  createdAt: IsoDateString;
  createdBy: UserId;
  createdByName: string;
}

export interface CostingTotals {
  materialCostMinor: MoneyMinor;
  apiCostMinor: MoneyMinor;
  excipientCostMinor: MoneyMinor;
  processMaterialCostMinor: MoneyMinor;
  packagingCostMinor: MoneyMinor;
  primaryPackagingCostMinor: MoneyMinor;
  secondaryPackagingCostMinor: MoneyMinor;
  tertiaryPackagingCostMinor: MoneyMinor;
  manufacturingCostMinor: MoneyMinor;
  qualityCostMinor: MoneyMinor;
  regulatoryCostMinor: MoneyMinor;
  documentationCostMinor: MoneyMinor;
  overheadCostMinor: MoneyMinor;
  materialAdjustmentMinor: MoneyMinor;
  totalCostMinor: MoneyMinor;
  marginAmountMinor: MoneyMinor;
  sellingPriceMinor: MoneyMinor;
  unitCostMinor: MoneyMinor;
  unitPriceMinor: MoneyMinor;
  priceAdjustmentMinor: MoneyMinor;
}

export interface CostingCommercial {
  market?: string;
  paymentTermsPlaceholder?: string;
  deliveryTermsPlaceholder?: string;
  specialRequirement?: string;
}

export interface CostingYield {
  expectedYieldPercent?: number;
  materialWastagePercent?: number;
  productionLossPercent?: number;
  packagingLossPercent?: number;
}

export interface CostSheet {
  id: EntityId;
  costingNumber: string;
  displayNumber: string;
  enquiryId: EntityId;
  enquiryNumber: string;
  customerId: EntityId;
  customerName: string;
  productId?: EntityId;
  productName: string;
  productRequirementId: EntityId;
  feasibilityId: EntityId;
  feasibilityNumber: string;
  version: number;
  familyId: EntityId;
  status: CostingStatus;
  approvalStatus: CostingApprovalStatus;
  currency: CostingCurrency;
  costingDate: string;
  validUntil?: string;
  preparedBy: UserId;
  preparedByName: string;
  assignedTo: UserId;
  assignedToName: string;
  approvedBy?: UserId;
  approvedByName?: string;
  approvedAt?: IsoDateString;
  baseQuantity: number;
  quantityUnit: QuantityUnit;
  batchSize?: number;
  numberOfBatches?: number;
  annualQuantity?: number;
  marginType: MarginType;
  marginValue: number;
  remarks?: string;
  overrideReason?: string;
  commercial: CostingCommercial;
  yield: CostingYield;
  totals: CostingTotals;
  searchIndex: string;
  isDemoData: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  createdBy: UserId;
  updatedBy: UserId;
}

export interface CostingKpis {
  total: number;
  draft: number;
  inProgress: number;
  approvalPending: number;
  approved: number;
  rejected: number;
  expired: number;
}

export interface QuotationReadyCosting {
  costingId: EntityId;
  customerId: EntityId;
  productId?: EntityId;
  enquiryId: EntityId;
  currency: CostingCurrency;
  quantity: number;
  quantityUnit: QuantityUnit;
  unitPriceMinor: MoneyMinor;
  sellingPriceMinor: MoneyMinor;
  validUntil?: string;
}
