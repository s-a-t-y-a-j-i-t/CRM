import type { EntityId, IsoDateString, UserId } from "@/types/common";
import type { EnquiryPriority } from "@/types/enquiries";
import type {
  ClarificationStatus,
  ConditionStatus,
  DepartmentReviewStatus,
  EvaluationFactorStatus,
  FeasibilityDecision,
  FeasibilityDepartmentId,
  FeasibilityStatus,
  NotFeasibleReason,
  SupplyAvailability,
} from "@/constants/feasibility";

export interface FeasibilityCondition {
  id: EntityId;
  condition: string;
  department: FeasibilityDepartmentId;
  owner: UserId;
  ownerName: string;
  dueDate?: string;
  status: ConditionStatus;
}

export interface ProductionReviewDetails {
  manufacturingLine?: string;
  availableCapacity?: string;
  requiredCapacity?: string;
  batchSize?: string;
  estimatedBatches?: number;
  processAvailable?: boolean;
  equipmentAvailable?: boolean;
  technologyAvailable?: boolean;
}

export interface QualityReviewDetails {
  qualityRequirements?: string;
  specificationAvailability?: string;
  qualitySystemRequirements?: string;
  documentationRequirements?: string;
  specialRequirements?: string;
}

export interface QcReviewDetails {
  testingRequirement?: string;
  methodAvailable?: boolean;
  instrumentAvailability?: string;
  referenceStandardAvailability?: string;
  sampleRequirement?: string;
}

export interface RegulatoryReviewDetails {
  targetMarket?: string;
  regulatoryPath?: string;
  registrationRequirement?: string;
  customerRegistrationRequirement?: string;
  documentationRequirement?: string;
  licenseRequirement?: string;
}

export interface PackagingReviewDetails {
  packagingType?: string;
  packSize?: string;
  materialAvailability?: string;
  artworkRequirement?: string;
  specialRequirement?: string;
}

export interface SupplyReviewDetails {
  apiAvailability?: SupplyAvailability;
  excipientAvailability?: SupplyAvailability;
  packagingMaterialAvailability?: SupplyAvailability;
  supplierAvailability?: SupplyAvailability;
  leadTime?: string;
}

export interface DepartmentReview {
  id: EntityId;
  feasibilityId: EntityId;
  departmentId: FeasibilityDepartmentId;
  departmentName: string;
  reviewerId?: UserId;
  reviewerName?: string;
  status: DepartmentReviewStatus;
  startedAt?: IsoDateString;
  completedAt?: IsoDateString;
  decision?: FeasibilityDecision;
  remarks?: string;
  production?: ProductionReviewDetails;
  qa?: QualityReviewDetails;
  qc?: QcReviewDetails;
  regulatory?: RegulatoryReviewDetails;
  packaging?: PackagingReviewDetails;
  supply?: SupplyReviewDetails;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface FeasibilityClarification {
  id: EntityId;
  feasibilityId: EntityId;
  departmentId: FeasibilityDepartmentId | "SALES";
  question: string;
  requestedBy: UserId;
  requestedByName: string;
  requestedAt: IsoDateString;
  response?: string;
  respondedBy?: UserId;
  respondedByName?: string;
  respondedAt?: IsoDateString;
  status: ClarificationStatus;
  audience: "INTERNAL" | "SALES";
}

export interface EvaluationFactor {
  id: string;
  name: string;
  status: EvaluationFactorStatus;
  remarks?: string;
  reviewerId?: UserId;
  reviewerName?: string;
  score?: number;
  weight: number;
}

export interface FeasibilityEvaluation {
  id: EntityId;
  feasibilityId: EntityId;
  factors: EvaluationFactor[];
  overallScore?: number;
  submitted: boolean;
  submittedAt?: IsoDateString;
  submittedBy?: UserId;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  createdBy: UserId;
  updatedBy: UserId;
}

export interface FeasibilityDocument {
  id: EntityId;
  feasibilityId: EntityId;
  documentType: "CUSTOMER_SPECIFICATION" | "PRODUCT_SPECIFICATION" | "ARTWORK" | "REGULATORY" | "TECHNICAL" | "SAMPLE" | "OTHER";
  fileName: string;
  storagePath?: string;
  version: string;
  uploadedBy: UserId;
  uploadedByName: string;
  uploadedAt: IsoDateString;
  status: "ACTIVE" | "ARCHIVED";
}

export interface FeasibilityAssessment {
  id: EntityId;
  feasibilityNumber: string;
  enquiryId: EntityId;
  enquiryNumber: string;
  customerId: EntityId;
  customerName: string;
  productId?: EntityId;
  productName: string;
  genericName?: string;
  productRequirementId: EntityId;
  dosageForm?: string;
  strength?: string;
  quantity?: number;
  annualQuantity?: number;
  packaging?: string;
  market?: string;
  assignedTo: UserId;
  assignedToName: string;
  assignedDepartment?: string;
  technicalReviewer?: UserId;
  technicalReviewerName?: string;
  priority: EnquiryPriority;
  status: FeasibilityStatus;
  initiatedAt: IsoDateString;
  targetCompletionDate?: string;
  overallDecision?: FeasibilityDecision;
  overallRemarks?: string;
  notFeasibleReason?: NotFeasibleReason;
  conditions: FeasibilityCondition[];
  overallScore?: number;
  searchIndex: string;
  isDemoData: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  createdBy: UserId;
  updatedBy: UserId;
}

export interface FeasibilityKpis {
  total: number;
  pendingReview: number;
  underEvaluation: number;
  clarificationRequired: number;
  approvalPending: number;
  feasible: number;
  partiallyFeasible: number;
  notFeasible: number;
  overdue: number;
}
