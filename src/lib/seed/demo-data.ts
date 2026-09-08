import type { Activity, AppNotification } from "@/types/activity";
import type { AuditLogEntry } from "@/types/audit";
import type {
  Batch,
  Contact,
  Customer,
  Dispatch,
  Enquiry,
  Feasibility,
  Lead,
  ManufacturingOrder,
  Opportunity,
  Product,
  ProductRequirement,
  PurchaseOrder,
  Quotation,
  UserProfile,
} from "@/types/entities";
import type { Invoice, Payment } from "@/types/finance";
import type { Complaint, ComplaintEvent, ControlledDocument } from "@/types/quality";

export interface DemoDatabase {
  users: UserProfile[];
  customers: Customer[];
  contacts: Contact[];
  leads: Lead[];
  enquiries: Enquiry[];
  opportunities: Opportunity[];
  products: Product[];
  productRequirements: ProductRequirement[];
  feasibility: Feasibility[];
  quotations: Quotation[];
  purchaseOrders: PurchaseOrder[];
  manufacturingOrders: ManufacturingOrder[];
  batches: Batch[];
  dispatches: Dispatch[];
  invoices: Invoice[];
  payments: Payment[];
  complaints: Complaint[];
  complaintEvents: ComplaintEvent[];
  documents: ControlledDocument[];
  activities: Activity[];
  notifications: AppNotification[];
  auditLogs: AuditLogEntry[];
}

const stamp = {
  createdAt: "2026-04-12T09:00:00.000Z",
  updatedAt: "2026-08-20T11:30:00.000Z",
  createdBy: "usr_admin",
  updatedBy: "usr_admin",
  status: "active",
} as const;

export const DEMO_PASSWORDS: Record<string, string> = {
  "tina.r@example.net": "Demo@12345",
  "kevin.m@example.com": "Demo@12345",
  "maria.s@example.com": "Demo@12345",
  "walt.e@example.net": "Demo@12345",
  "emma.t@example.net": "Demo@12345",
  "alice.j@example.com": "Demo@12345",
  "karen.d@example.net": "Demo@12345",
};

export function createDemoDatabase(): DemoDatabase {
  const users: UserProfile[] = [
    { id: "usr_admin", email: "tina.r@example.net", displayName: "Ananya Rao", role: "super_admin", department: "Administration", employeeId: "EMP-001", isActive: true, ...stamp },
    { id: "usr_sales", email: "kevin.m@example.com", displayName: "Rohit Menon", role: "sales_manager", department: "Sales", employeeId: "EMP-014", isActive: true, ...stamp },
    { id: "usr_bd", email: "maria.s@example.com", displayName: "Meera Iyer", role: "business_development", department: "Business Development", employeeId: "EMP-021", isActive: true, ...stamp },
    { id: "usr_qa", email: "walt.e@example.net", displayName: "Kavita Shah", role: "quality_assurance", department: "Quality Assurance", employeeId: "EMP-033", isActive: true, ...stamp },
    { id: "usr_fin", email: "emma.t@example.net", displayName: "Arjun Desai", role: "finance", department: "Finance", employeeId: "EMP-041", isActive: true, ...stamp },
    { id: "usr_prod", email: "alice.j@example.com", displayName: "Sanjay Kulkarni", role: "production", department: "Production", employeeId: "EMP-052", isActive: true, ...stamp },
    { id: "usr_view", email: "karen.d@example.net", displayName: "Neha Kapoor", role: "viewer", department: "Management", employeeId: "EMP-060", isActive: true, ...stamp },
  ];

  const customers: Customer[] = [
    {
      id: "cust_helix",
      legalName: "Helix Therapeutics Private Limited",
      tradeName: "Helix Tx",
      customerCode: "HEL-104",
      type: "marketer",
      lifecycleStatus: "active",
      gstin: "27AABCH1234M1Z5",
      drugLicenseNo: "MH-20B-88211",
      billingAddress: "401, Senapati Bapat Marg, Lower Parel, Mumbai 400013",
      shippingAddress: "Warehouse 12, Bhiwandi Logistics Park, Thane 421302",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      creditLimitMinor: 25_000_000_00,
      currency: "INR",
      ownerUserId: "usr_sales",
      notes: "Priority marketer. Prefers Alu-Alu packs and 24-month shelf life.",
      ...stamp,
    },
    {
      id: "cust_aurora",
      legalName: "Aurora Lifesciences LLP",
      tradeName: "Aurora LS",
      customerCode: "AUR-078",
      type: "brand_owner",
      lifecycleStatus: "active",
      gstin: "29AADCA9988B1Z2",
      drugLicenseNo: "KA-21B-44109",
      billingAddress: "12, Prestige Tech Park, Outer Ring Road, Bengaluru 560103",
      shippingAddress: "12, Prestige Tech Park, Outer Ring Road, Bengaluru 560103",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      creditLimitMinor: 12_000_000_00,
      currency: "INR",
      ownerUserId: "usr_bd",
      ...stamp,
    },
    {
      id: "cust_nimbus",
      legalName: "Nimbus Pharma Export FZ-LLC",
      tradeName: "Nimbus Export",
      customerCode: "NIM-019",
      type: "export",
      lifecycleStatus: "prospect",
      billingAddress: "Dubai Science Park, Al Barsha South, Dubai",
      shippingAddress: "Jebel Ali Free Zone, Dubai",
      city: "Dubai",
      state: "Dubai",
      country: "UAE",
      creditLimitMinor: 8_000_000_00,
      currency: "USD",
      ownerUserId: "usr_sales",
      notes: "Export enquiry. CTD dossier and COPP required before first batch.",
      ...stamp,
    },
  ];

  const contacts: Contact[] = [
    { id: "con_helix_priya", customerId: "cust_helix", firstName: "Priya", lastName: "Nair", designation: "Head of Procurement", email: "olivia.t@example.org", phone: "+91 98200 11004", isPrimary: true, ...stamp },
    { id: "con_helix_vikram", customerId: "cust_helix", firstName: "Vikram", lastName: "Joshi", designation: "QA Manager", email: "frank.g@example.org", phone: "+91 98200 11008", isPrimary: false, ...stamp },
    { id: "con_aurora_leena", customerId: "cust_aurora", firstName: "Leena", lastName: "Reddy", designation: "Founder", email: "ivan.p@example.net", phone: "+91 98860 22110", isPrimary: true, ...stamp },
  ];

  const leads: Lead[] = [
    { id: "lead_helix", companyName: "Helix Therapeutics", contactName: "Priya Nair", email: "olivia.t@example.org", phone: "+91 98200 11004", source: "exhibition", stage: "converted", customerId: "cust_helix", ownerUserId: "usr_sales", estimatedValueMinor: 18_500_000_00, notes: "Met at CPHI India. Converted after feasibility on Telmisartan.", ...stamp },
    { id: "lead_nimbus", companyName: "Nimbus Pharma Export", contactName: "Omar Haddad", email: "olivia.t@example.org", phone: "+971 50 441 2290", source: "inbound", stage: "qualified", ownerUserId: "usr_sales", estimatedValueMinor: 6_400_000_00, notes: "Looking for WHO-GMP site for African tenders.", ...stamp },
    { id: "lead_vertex", companyName: "Vertex Nutraceuticals", contactName: "Asha Kulkarni", email: "iris.p@example.org", phone: "+91 98700 33421", source: "referral", stage: "nurture", ownerUserId: "usr_bd", estimatedValueMinor: 2_200_000_00, ...stamp },
  ];

  const enquiries: Enquiry[] = [
    { id: "enq_hel_telmi", enquiryNumber: "ENQ-2026-014", customerId: "cust_helix", contactId: "con_helix_priya", leadId: "lead_helix", subject: "Telmisartan 40 mg tablets, Alu-Alu 10s", dosageForm: "tablet", therapeuticCategory: "Cardiovascular", targetQuantity: 5_000_000, targetPriceMinor: 185, requiredDeliveryDate: "2026-11-15", stage: "won", ownerUserId: "usr_sales", ...stamp },
    { id: "enq_aur_azith", enquiryNumber: "ENQ-2026-031", customerId: "cust_aurora", contactId: "con_aurora_leena", subject: "Azithromycin 250 mg capsules", dosageForm: "capsule", therapeuticCategory: "Anti-infective", targetQuantity: 1_200_000, targetPriceMinor: 240, requiredDeliveryDate: "2026-10-30", stage: "quoted", ownerUserId: "usr_bd", ...stamp },
    { id: "enq_nim_amox", enquiryNumber: "ENQ-2026-044", customerId: "cust_nimbus", subject: "Amoxicillin 500 mg capsules — export pack", dosageForm: "capsule", therapeuticCategory: "Anti-infective", targetQuantity: 2_000_000, requiredDeliveryDate: "2027-01-20", stage: "feasibility", ownerUserId: "usr_sales", ...stamp },
  ];

  const opportunities: Opportunity[] = [
    { id: "opp_hel_telmi", name: "Helix — Telmisartan annual contract", customerId: "cust_helix", enquiryId: "enq_hel_telmi", stage: "closed_won", amountMinor: 18_500_000_00, currency: "INR", closeDate: "2026-06-18", ownerUserId: "usr_sales", probability: 100, ...stamp },
    { id: "opp_aur_azith", name: "Aurora — Azithromycin launch pack", customerId: "cust_aurora", enquiryId: "enq_aur_azith", stage: "proposal", amountMinor: 4_800_000_00, currency: "INR", closeDate: "2026-10-12", ownerUserId: "usr_bd", probability: 65, ...stamp },
  ];

  const products: Product[] = [
    { id: "prd_telmi40", productCode: "TAB-TEL-40", genericName: "Telmisartan", brandName: "Helix-Teli", dosageForm: "tablet", strength: "40 mg", packSize: "Alu-Alu 10s", composition: "Each uncoated tablet contains Telmisartan 40 mg", category: "Cardiovascular", lifecycle: "commercial", customerId: "cust_helix", ...stamp },
    { id: "prd_azith250", productCode: "CAP-AZI-250", genericName: "Azithromycin", brandName: "AziAur", dosageForm: "capsule", strength: "250 mg", packSize: "Blister 6s", composition: "Each hard gelatin capsule contains Azithromycin 250 mg", category: "Anti-infective", lifecycle: "development", customerId: "cust_aurora", ...stamp },
    { id: "prd_amox500", productCode: "CAP-AMX-500", genericName: "Amoxicillin", dosageForm: "capsule", strength: "500 mg", packSize: "HDPE 100s", composition: "Each capsule contains Amoxicillin trihydrate eq. to Amoxicillin 500 mg", category: "Anti-infective", lifecycle: "development", customerId: "cust_nimbus", ...stamp },
  ];

  const productRequirements: ProductRequirement[] = [
    { id: "req_telmi", enquiryId: "enq_hel_telmi", customerId: "cust_helix", productId: "prd_telmi40", genericName: "Telmisartan", strength: "40 mg", dosageForm: "tablet", packSize: "Alu-Alu 10s", composition: "Telmisartan 40 mg", artworkRequired: true, specificationNotes: "IH spec aligned to IP. Dissolution NLT 80% in 30 min.", regulatoryNotes: "FDC not applicable. Site variation already approved.", targetQuantity: 5_000_000, targetPriceMinor: 185, requiredDeliveryDate: "2026-11-15", ...stamp },
    { id: "req_azith", enquiryId: "enq_aur_azith", customerId: "cust_aurora", productId: "prd_azith250", genericName: "Azithromycin", strength: "250 mg", dosageForm: "capsule", packSize: "Blister 6s", composition: "Azithromycin 250 mg", artworkRequired: true, specificationNotes: "USP grade API preferred.", regulatoryNotes: "Brand artwork pending legal review.", targetQuantity: 1_200_000, targetPriceMinor: 240, requiredDeliveryDate: "2026-10-30", ...stamp },
  ];

  const feasibility: Feasibility[] = [
    { id: "fea_telmi", requirementId: "req_telmi", enquiryId: "enq_hel_telmi", customerId: "cust_helix", outcome: "feasible", technicalNotes: "Existing Telmisartan 40 mg tech transfer complete. Tooling available.", capacityNotes: "Compression slot available from week 38.", regulatoryNotes: "No additional BE required for this strength.", estimatedLeadTimeDays: 45, reviewedBy: "usr_bd", ...stamp },
    { id: "fea_azith", requirementId: "req_azith", enquiryId: "enq_aur_azith", customerId: "cust_aurora", outcome: "conditional", technicalNotes: "Need humidity-controlled encapsulation and change parts.", capacityNotes: "Shared line with other macrolides — campaign planning required.", regulatoryNotes: "Stability protocol to be agreed before commercial batch.", estimatedLeadTimeDays: 70, reviewedBy: "usr_bd", ...stamp },
  ];

  const quotations: Quotation[] = [
    { id: "quo_telmi", quotationNumber: "QT-2026-088", customerId: "cust_helix", enquiryId: "enq_hel_telmi", opportunityId: "opp_hel_telmi", validUntil: "2026-12-31", currency: "INR", subtotalMinor: 16_100_000_00, taxMinor: 2_898_000_00, totalMinor: 18_998_000_00, stage: "accepted", notes: "Includes packing and batch COA. Freight extra.", ...stamp },
    { id: "quo_azith", quotationNumber: "QT-2026-112", customerId: "cust_aurora", enquiryId: "enq_aur_azith", opportunityId: "opp_aur_azith", validUntil: "2026-09-30", currency: "INR", subtotalMinor: 4_080_000_00, taxMinor: 734_400_00, totalMinor: 4_814_400_00, stage: "sent", notes: "Validity 30 days. Tooling amortized over first 3 batches.", ...stamp },
  ];

  const purchaseOrders: PurchaseOrder[] = [
    { id: "po_hel_001", poNumber: "PO-HEL-2607-04", customerId: "cust_helix", quotationId: "quo_telmi", orderDate: "2026-07-04", requiredDate: "2026-11-15", currency: "INR", amountMinor: 9_499_000_00, stage: "in_production", customerPoRef: "HT/PO/2607/19", ...stamp },
    { id: "po_hel_002", poNumber: "PO-HEL-2608-11", customerId: "cust_helix", quotationId: "quo_telmi", orderDate: "2026-08-11", requiredDate: "2026-12-20", currency: "INR", amountMinor: 4_200_000_00, stage: "confirmed", customerPoRef: "HT/PO/2608/03", ...stamp },
  ];

  const manufacturingOrders: ManufacturingOrder[] = [
    { id: "mo_telmi_1", moNumber: "MO-2608-017", purchaseOrderId: "po_hel_001", customerId: "cust_helix", productId: "prd_telmi40", plannedQty: 2_500_000, completedQty: 1_200_000, stage: "in_process", plannedStart: "2026-08-18", plannedEnd: "2026-09-22", ...stamp },
    { id: "mo_telmi_2", moNumber: "MO-2609-004", purchaseOrderId: "po_hel_002", customerId: "cust_helix", productId: "prd_telmi40", plannedQty: 1_000_000, completedQty: 0, stage: "planned", plannedStart: "2026-10-01", plannedEnd: "2026-10-28", ...stamp },
  ];

  const batches: Batch[] = [
    { id: "bat_teli_082", batchNumber: "TL40-0826-A", manufacturingOrderId: "mo_telmi_1", productId: "prd_telmi40", customerId: "cust_helix", mfgDate: "2026-08-21", expiryDate: "2028-07-31", quantity: 600_000, stage: "released", ...stamp },
    { id: "bat_teli_083", batchNumber: "TL40-0826-B", manufacturingOrderId: "mo_telmi_1", productId: "prd_telmi40", customerId: "cust_helix", mfgDate: "2026-08-28", expiryDate: "2028-07-31", quantity: 600_000, stage: "tested", ...stamp },
  ];

  const dispatches: Dispatch[] = [
    { id: "dsp_001", dispatchNumber: "DSP-2608-09", manufacturingOrderId: "mo_telmi_1", batchId: "bat_teli_082", customerId: "cust_helix", dispatchDate: "2026-08-30", transporter: "Gati Pharma Cold Chain", lrNumber: "GT-882190", stage: "delivered", ...stamp },
  ];

  const invoices: Invoice[] = [
    { id: "inv_001", invoiceNumber: "INV-2608-021", customerId: "cust_helix", purchaseOrderId: "po_hel_001", invoiceDate: "2026-08-31", dueDate: "2026-09-30", currency: "INR", amountMinor: 3_200_000_00, taxMinor: 576_000_00, totalMinor: 3_776_000_00, paidMinor: 2_000_000_00, outstandingMinor: 1_776_000_00, invoiceStatus: "partially_paid", ...stamp },
    { id: "inv_002", invoiceNumber: "INV-2607-014", customerId: "cust_helix", purchaseOrderId: "po_hel_001", invoiceDate: "2026-07-15", dueDate: "2026-08-14", currency: "INR", amountMinor: 1_800_000_00, taxMinor: 324_000_00, totalMinor: 2_124_000_00, paidMinor: 0, outstandingMinor: 2_124_000_00, invoiceStatus: "overdue", ...stamp },
    { id: "inv_003", invoiceNumber: "INV-2608-030", customerId: "cust_aurora", invoiceDate: "2026-08-20", dueDate: "2026-10-19", currency: "INR", amountMinor: 750_000_00, taxMinor: 135_000_00, totalMinor: 885_000_00, paidMinor: 885_000_00, outstandingMinor: 0, invoiceStatus: "paid", ...stamp },
  ];

  const payments: Payment[] = [
    { id: "pay_001", paymentNumber: "RCPT-2609-004", customerId: "cust_helix", invoiceId: "inv_001", amountMinor: 2_000_000_00, paymentDate: "2026-09-02", method: "rtgs", referenceNumber: "SBINR220260902881", remarks: "Part payment against INV-2608-021", status: "active", createdAt: "2026-09-02T10:15:00.000Z", updatedAt: "2026-09-02T10:15:00.000Z", createdBy: "usr_fin", updatedBy: "usr_fin" },
    { id: "pay_002", paymentNumber: "RCPT-2608-019", customerId: "cust_aurora", invoiceId: "inv_003", amountMinor: 885_000_00, paymentDate: "2026-08-28", method: "neft", referenceNumber: "HDFC2608284412", status: "active", createdAt: "2026-08-28T16:40:00.000Z", updatedAt: "2026-08-28T16:40:00.000Z", createdBy: "usr_fin", updatedBy: "usr_fin" },
  ];

  const complaints: Complaint[] = [
    {
      id: "cmp_001",
      complaintNumber: "CMP-2608-003",
      customerId: "cust_helix",
      productId: "prd_telmi40",
      batchNumber: "TL40-0826-A",
      complaintDate: "2026-08-29",
      complaintType: "packaging",
      description: "Customer reported scuff marks on 14 cartons received at Bhiwandi. No product quality defect alleged. Requesting replacement cartons and CAPA on transit handling.",
      severity: "minor",
      receivedBy: "usr_qa",
      assignedDepartment: "Quality Assurance",
      investigationStatus: "investigation",
      capaReference: "CAPA-2608-11",
      ...stamp,
    },
  ];

  const complaintEvents: ComplaintEvent[] = [
    { id: "cme_001", complaintId: "cmp_001", toStatus: "new", note: "Complaint logged from Helix QA email.", actorUserId: "usr_qa", ...stamp, createdAt: "2026-08-29T08:10:00.000Z" },
    { id: "cme_002", complaintId: "cmp_001", fromStatus: "new", toStatus: "acknowledged", note: "Acknowledged within 24 hours. Batch retained samples pulled.", actorUserId: "usr_qa", ...stamp, createdAt: "2026-08-29T18:40:00.000Z" },
    { id: "cme_003", complaintId: "cmp_001", fromStatus: "acknowledged", toStatus: "investigation", note: "Warehouse photos reviewed. Carton supplier and transporter notified.", actorUserId: "usr_qa", ...stamp, createdAt: "2026-08-30T11:05:00.000Z" },
  ];

  const documents: ControlledDocument[] = [
    { id: "doc_coa_082", documentNumber: "DOC-COA-0826-A", name: "COA — Telmisartan 40 mg TL40-0826-A", documentType: "coa", version: 1, storagePath: "documents/batches/bat_teli_082/coa-v1.pdf", contentType: "application/pdf", sizeBytes: 248_110, uploadedBy: "usr_qa", uploadedAt: "2026-08-26T14:00:00.000Z", documentStatus: "current", relatedType: "batch", relatedId: "bat_teli_082", ...stamp },
    { id: "doc_spec_telmi", documentNumber: "DOC-SPEC-TEL-40", name: "Finished product specification — Telmisartan 40 mg", documentType: "specification", version: 3, storagePath: "documents/products/prd_telmi40/spec-v3.pdf", contentType: "application/pdf", sizeBytes: 512_004, uploadedBy: "usr_qa", uploadedAt: "2026-05-02T09:20:00.000Z", documentStatus: "current", relatedType: "product", relatedId: "prd_telmi40", ...stamp },
    { id: "doc_art_helix", documentNumber: "DOC-ART-HEL-TEL", name: "Approved artwork — Helix-Teli 10s carton", documentType: "artwork", version: 2, storagePath: "documents/customers/cust_helix/artwork-v2.pdf", contentType: "application/pdf", sizeBytes: 1_024_331, uploadedBy: "usr_bd", uploadedAt: "2026-06-11T12:00:00.000Z", expiryDate: "2027-06-11", documentStatus: "current", relatedType: "customer", relatedId: "cust_helix", ...stamp },
  ];

  const activities: Activity[] = [
    { id: "act_001", activityNumber: "ACT-2609-01", type: "follow_up", subject: "Collect overdue on INV-2607-014", description: "Helix finance committed a date after GST filing.", customerId: "cust_helix", assignedUserId: "usr_fin", dueAt: "2026-09-06T11:00:00.000Z", reminderAt: "2026-09-05T11:00:00.000Z", priority: "high", activityStatus: "overdue", ...stamp },
    { id: "act_002", activityNumber: "ACT-2609-02", type: "meeting", subject: "Aurora artwork and stability protocol", customerId: "cust_aurora", enquiryId: "enq_aur_azith", assignedUserId: "usr_bd", dueAt: "2026-09-08T15:30:00.000Z", priority: "medium", activityStatus: "pending", ...stamp },
    { id: "act_003", activityNumber: "ACT-2609-03", type: "call", subject: "Nimbus dossier checklist", customerId: "cust_nimbus", leadId: "lead_nimbus", assignedUserId: "usr_sales", dueAt: "2026-09-05T16:00:00.000Z", priority: "medium", activityStatus: "in_progress", ...stamp },
    { id: "act_004", activityNumber: "ACT-2608-19", type: "whatsapp_log", subject: "Helix dispatch LR shared", customerId: "cust_helix", orderId: "po_hel_001", assignedUserId: "usr_sales", completedAt: "2026-08-30T17:10:00.000Z", priority: "low", activityStatus: "completed", ...stamp },
    { id: "act_005", activityNumber: "ACT-2609-04", type: "task", subject: "Review carton CAPA draft", customerId: "cust_helix", assignedUserId: "usr_qa", dueAt: "2026-09-07T10:00:00.000Z", priority: "urgent", activityStatus: "pending", ...stamp },
  ];

  const notifications: AppNotification[] = [
    { id: "ntf_001", kind: "payment_overdue", title: "Invoice overdue — Helix", body: "INV-2607-014 is past due. Outstanding ₹21,24,000.", href: "/finance/invoices", recipientUserIds: ["usr_fin", "usr_sales"], audienceRoles: ["finance", "sales_manager"], readBy: [], relatedType: "invoice", relatedId: "inv_002", dueAt: "2026-08-14", ...stamp },
    { id: "ntf_002", kind: "follow_up_overdue", title: "Follow-up overdue", body: "Collect overdue on INV-2607-014 is past due.", href: "/crm/activities", recipientUserIds: ["usr_fin"], audienceRoles: ["finance"], readBy: [], relatedType: "activity", relatedId: "act_001", ...stamp },
    { id: "ntf_003", kind: "complaint_pending", title: "Complaint in investigation", body: "CMP-2608-003 (Helix packaging) is awaiting CAPA.", href: "/quality/complaints", recipientUserIds: ["usr_qa"], audienceRoles: ["quality_assurance"], readBy: [], relatedType: "complaint", relatedId: "cmp_001", ...stamp },
    { id: "ntf_004", kind: "quotation_expiry", title: "Quotation expiring", body: "QT-2026-112 for Aurora expires on 30 Sep 2026.", href: "/bd/quotations", recipientUserIds: ["usr_bd"], audienceRoles: ["business_development"], readBy: [], relatedType: "quotation", relatedId: "quo_azith", dueAt: "2026-09-30", ...stamp },
    { id: "ntf_005", kind: "order_delay", title: "Manufacturing behind plan", body: "MO-2608-017 has completed 1.2M of 2.5M tablets.", href: "/manufacturing/orders", recipientUserIds: ["usr_prod", "usr_sales"], audienceRoles: ["production", "sales_manager"], readBy: [], relatedType: "manufacturing_order", relatedId: "mo_telmi_1", ...stamp },
  ];

  const auditLogs: AuditLogEntry[] = [
    { id: "aud_001", userId: "usr_admin", userEmail: "tina.r@example.net", action: "create", module: "customers", recordId: "cust_helix", timestamp: "2026-04-12T09:00:00.000Z", oldValue: null, newValue: "Helix Therapeutics created" },
    { id: "aud_002", userId: "usr_fin", userEmail: "emma.t@example.net", action: "create", module: "payments", recordId: "pay_001", timestamp: "2026-09-02T10:15:00.000Z", oldValue: null, newValue: "RCPT-2609-004 recorded against INV-2608-021" },
    { id: "aud_003", userId: "usr_qa", userEmail: "walt.e@example.net", action: "status_change", module: "complaints", recordId: "cmp_001", timestamp: "2026-08-30T11:05:00.000Z", oldValue: "acknowledged", newValue: "investigation" },
  ];

  return {
    users,
    customers,
    contacts,
    leads,
    enquiries,
    opportunities,
    products,
    productRequirements,
    feasibility,
    quotations,
    purchaseOrders,
    manufacturingOrders,
    batches,
    dispatches,
    invoices,
    payments,
    complaints,
    complaintEvents,
    documents,
    activities,
    notifications,
    auditLogs,
  };
}
