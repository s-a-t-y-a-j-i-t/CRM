import type { EntityId, IsoDateString, UserId } from "@/types/common";
import type { IngredientRole, PackagingType, PharmaDosageForm } from "@/constants/pharma";
import type {
  PharmacopoeiaStandard,
  ProductCategory,
  ProductMarketType,
  ProductStatus,
  RegulatoryStatus,
} from "@/constants/products";

export interface ProductCompositionLine {
  id: EntityId;
  ingredientName: string;
  activeIngredient: boolean;
  strength: string;
  unit: string;
  quantity?: string;
  role: IngredientRole;
  sortOrder: number;
}

export interface ProductSpecification {
  id: EntityId;
  productId: EntityId;
  specificationType: string;
  parameter: string;
  limit: string;
  unit?: string;
  testMethod?: string;
  remarks?: string;
  version: number;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  createdBy: UserId;
  updatedBy: UserId;
}

export interface ProductDocument {
  id: EntityId;
  productId: EntityId;
  documentType: "PRODUCT_SPECIFICATION" | "MASTER_FORMULA" | "TECHNICAL" | "PACKAGING_SPECIFICATION" | "REGULATORY" | "OTHER";
  fileName: string;
  storagePath?: string;
  version: string;
  uploadedBy: UserId;
  uploadedByName: string;
  uploadedAt: IsoDateString;
  status: "ACTIVE" | "ARCHIVED";
}

export interface ProductActivity {
  id: EntityId;
  productId: EntityId;
  type: "CALL" | "EMAIL" | "MEETING" | "NOTE" | "REVIEW" | "OTHER";
  subject: string;
  description?: string;
  activityDate: IsoDateString;
  createdAt: IsoDateString;
  createdBy: UserId;
  createdByName: string;
}

export interface CrmProduct {
  id: EntityId;
  productCode: string;
  productName: string;
  genericName: string;
  brandName?: string;
  productCategory: ProductCategory;
  productType: PharmaDosageForm;
  dosageForm: PharmaDosageForm;
  strength?: string;
  strengthUnit?: string;
  composition: ProductCompositionLine[];
  therapeuticCategory?: string;
  pharmacopoeiaStandard?: PharmacopoeiaStandard;
  manufacturingSite?: string;
  manufacturingUnit?: string;
  packagingType?: PackagingType;
  standardPackSize?: string;
  marketType: ProductMarketType;
  status: ProductStatus;
  regulatoryStatus?: RegulatoryStatus;
  description?: string;
  notes?: string;
  searchIndex: string;
  isDemoData: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  createdBy: UserId;
  updatedBy: UserId;
}
