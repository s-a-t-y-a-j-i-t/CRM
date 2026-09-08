# PATRI CMO

Enterprise CRM for a third-party pharmaceutical manufacturing company. The product follows the contract-manufacturing lifecycle rather than a generic sales pipeline.

This repository is currently at **Phase 8: pharmaceutical quotation management**.

Planned flow:

Lead → Initial Contact → Qualification → Product Interest → Requirement Collection → Enquiry → Feasibility → Costing → Quotation → Negotiation → Won / Lost → Purchase Order → Manufacturing → Batch → Dispatch → Invoice → Payment → Support → Complaint → Repeat Business

Phase 1 delivered the shell, design system, Firebase architecture, and dashboard. Phase 2 adds production-ready sign-in, employee profiles, roles, permissions, protected routes, and audit. Phase 3 adds pharmaceutical customer and contact management. Phase 4 adds the CMO lead pipeline. Phase 5 adds enquiry management, structured product requirements, requirement versioning, and Lead → Enquiry conversion. Phase 6 adds the Product Master catalogue and technical feasibility (department review, evaluation, decision). Phase 7 adds the costing and pricing engine. Phase 8 adds customer quotations from approved costing. Sales orders remain Phase 9.

This is not an accounting ERP and does not claim regulatory compliance.

## Technology stack

Next.js App Router, TypeScript, Tailwind CSS, shadcn-compatible UI, Lucide, React Hook Form, Zod, Zustand, Recharts, Firebase Auth/Firestore/Storage, Firebase Admin (server only), Vercel.

Do not change this stack.

## Architecture

```
src/
  app/                 (auth) login/reset, (app) workspace, api, unauthorized
  components/          ui, layout, shared, auth, rbac
  contexts/            AuthContext
  hooks/               useAuth, usePermission
  features/            dashboard, admin, CRM customer/contact, leads, enquiries
  lib/
    firebase/          client.ts, admin.ts (server only)
    auth/              requireAuth, route permissions, friendly Firebase errors
    rbac/              catalog, can, hasPermission helpers
  services/
    auth/              login, logout, password reset
    identity/          users, roles, employee IDs
    audit/             append-only auditLogService
  stores/              auth-store, identity-store, ui-store, crm-store, lead-store, enquiry-store, product-store, feasibility-store, costing-store, quotation-store
  proxy.ts             Session cookie gate (not the only auth layer)
```

Business writes: Zod → `assertCan` / `requirePermission` → service → `writeAuditLog`.

## Folder / module plan

| Phase | Scope |
| --- | --- |
| 1 | Foundation, layout, dashboard, services, rules |
| 2 | Authentication, users, RBAC management |
| 3 | Customers, contacts, notes, activity timeline, document foundation |
| 4 | Leads, pipeline, follow-ups, conversion foundation, lead analytics |
| 5 | Enquiries, product requirements, versioning, pipeline, enquiry analytics |
| 6 | Product master, composition, specifications, technical feasibility, department review, decision |
| 7 | Costing, material/packaging/manufacturing costs, margin vs markup, versions, approval, quotation integration point |
| 8 (current) | Quotations from approved costing, items, tax, terms, PDF, versioning, approval, send, sales-order integration point |
| Later | Sales orders, manufacturing, quality, finance, complaints, reports |

## Authentication architecture

Firebase Authentication owns credentials. Firestore never stores passwords.

| Concern | Implementation |
| --- | --- |
| Email/password login | `services/auth/auth.service.ts` |
| Auth state | `AuthContext` + `useAuth()` — do not call Firebase from pages |
| Session | `POST /api/auth/session` sets an httpOnly cookie. Production prefers Firebase session cookies; demo uses `demo:{userId}` |
| Remember session | Local vs session Firebase persistence + cookie `maxAge` |
| Password reset | `/forgot-password` → `sendPasswordResetEmail`. Success copy does not reveal whether the account exists |
| Disabled accounts | `status` INACTIVE/SUSPENDED (and Firebase `disabled`) blocks sign-in |
| Loading | `AuthLoading` until Zustand rehydration finishes — no protected-page flash |

`proxy.ts` allows only `/login` and `/forgot-password` without a session. Authenticated but unauthorized users are sent to `/unauthorized`.

Friendly error mapping lives in `src/lib/auth/firebase-errors.ts`. Raw Firebase codes are never shown.

### Demo logins (demo mode only)

Password: `Demo@12345`

| Email | Role |
| --- | --- |
| tina.r@example.net | Super Admin |
| kevin.m@example.com | Sales Manager |
| maria.s@example.com | Business Development |
| walt.e@example.net | Quality Assurance |
| emma.t@example.net | Finance |
| alice.j@example.com | Production |
| karen.d@example.net | Viewer |

Demo mode is on when `NEXT_PUBLIC_DEMO_MODE=true` or public Firebase config is incomplete.

Users created in the demo admin UI are identity profiles only. They cannot sign in until Firebase Auth is configured and an Auth user is provisioned.

## User architecture

Collection: `users` (document id = Firebase UID in production).

`IdentityProfile` holds business fields: employeeId, name, email, phone, department, designation, roleId/roleName, status (`ACTIVE` | `INACTIVE` | `SUSPENDED`), joiningDate, lastLoginAt, audit fields.

Firebase UID is not the visible employee id.

### Employee IDs

Format: `EMP-0001`.

- Demo: max existing sequence + 1 (`nextEmployeeId`)
- Production: Firestore transaction on `counters/employeeId` (`allocateEmployeeId`) so concurrent creates cannot collide

## Customer architecture

Phase 3 customers are pharmaceutical CMO accounts (`CrmCustomer` in `src/types/crm.ts`), not a generic address book.

| Concern | Implementation |
| --- | --- |
| Codes | `CUS-00001` via `counters/customerCode` (transaction). Never use Firebase UID as the visible code. |
| Search | `searchIndex` on code, names, email, phone, GSTIN, PAN, primary contact. List queries filter; they do not download the collection into the browser for production. Demo uses the same service contract over `crm-store`. |
| Filters / sort / page | Type, category, status, country, state, sales person, created date. Sort by name, code, status, created date. Page sizes 20 / 50 / 100. |
| Duplicates | `findDuplicateCustomers()` on company name, GSTIN, PAN, email, phone. Warns before create. |
| Contacts | Related records with one primary. Setting primary clears the previous primary and writes an audit row. |
| Notes / documents / activities | Notes are append-only. Documents store metadata (Storage path when Firebase is configured). Other CRM tabs are empty states until later phases. |
| Status | PROSPECT → ACTIVE → ON_HOLD → INACTIVE. BLOCKED requires commercial leadership. Prefer archive (`customers.delete`) over destructive delete. |
| KPI cards | Enquiry count is live from the enquiry store. Quotation / order / finance cards stay zero until those modules exist. |

Permissions: `customers.view|create|update|delete|change_status|export`, `contacts.*`, `customer_notes.create`, `customer_documents.upload`.

Server: `requirePermission` on `/api/crm/customers`, contacts, notes.

## Lead architecture

Phase 4 leads are third-party manufacturing prospects (`CrmLead` in `src/types/leads.ts`). They are not a generic CRM “deal” object. The operations dashboard still uses the Phase 1 `Lead` seed type; the lead workspace reads `lead-store` / `leads`.

### Lifecycle

`NEW` → `CONTACTED` → `QUALIFIED` → `REQUIREMENT_PENDING` → `ENQUIRY_CREATED` → `PROPOSAL` → `NEGOTIATION` → `WON` / `LOST`, plus `ON_HOLD`.

Transitions live only in `src/services/leads/lead-workflow.service.ts` (`canTransition`, `validateTransition`, `transitionLead`). Kanban, detail, and APIs call that service. `WON` is set by conversion, not by an arbitrary status change.

### Conversion flow

Lead → existing or new customer → existing or new contact → real enquiry (`convertedEnquiryId`) with a `ProductRequirement`. Reuses `createCustomer` / `createContact` / `createEnquiryFromLead`. Duplicate customers are blocked by the Phase 3 duplicate service. A lead cannot be converted twice. After conversion the lead status is `ENQUIRY_CREATED` and the enquiry source is `LEAD`.

### Assignment model

`assignedTo` / `assignedToName` / `assignedAt`. Sales users with `leads.view` see their own leads. `leads.view_all` (admin, management, sales manager, BD) sees the team. Enforced in `visibleLeads()` / `assertCanAccessLead()`, not in React.

### Permissions

`leads.view`, `leads.create`, `leads.update`, `leads.delete`, `leads.assign`, `leads.change_status`, `leads.convert`, `leads.export`, `leads.view_all`.

### Codes and search

`LEAD-00001` via `counters/leadCode` (transaction). Demo uses `nextLeadCode`. Search uses `searchIndex` (code, company, contact, email, phone, product). The service contract is ready for a later search engine without rewriting the UI.

### Firestore

Collections: `leads`, `lead_notes`, `lead_activities`, `lead_follow_ups`, `lead_documents`. Client writes cannot change `leadCode`, `createdAt`, or `createdBy`. Deletes are denied. Composite indexes: status/assignedTo/priority/leadSource + `createdAt`.

### Security

UI `Can` + `requirePermission` on `/api/crm/leads*` + Firestore rules. No `allow read, write: if true`. Lost leads require a reason. Reactivation keeps history.

### Workflow rules

| From | To |
| --- | --- |
| NEW | CONTACTED, ON_HOLD, LOST |
| CONTACTED | QUALIFIED, ON_HOLD, LOST |
| QUALIFIED | REQUIREMENT_PENDING, ON_HOLD, LOST |
| REQUIREMENT_PENDING | ENQUIRY_CREATED, ON_HOLD, LOST |
| ENQUIRY_CREATED | PROPOSAL, ON_HOLD, LOST |
| PROPOSAL | NEGOTIATION, WON*, LOST, ON_HOLD |
| NEGOTIATION | WON*, LOST, ON_HOLD |
| ON_HOLD | previous active status |
| LOST | QUALIFIED / CONTACTED / ON_HOLD (reactivate) |

\*WON is applied through `convertLead()` when no enquiry is created. Creating an enquiry sets `ENQUIRY_CREATED`.

## Enquiry architecture

Phase 5 enquiries are CMO product-requirement cases (`CrmEnquiry` in `src/types/enquiries.ts`), not a generic ticket. The operations dashboard still uses the Phase 1 `Enquiry` seed type; the enquiry workspace reads `enquiry-store` / `enquiries`.

Customer and contact IDs are the source of truth. `customerName` / `contactName` are cached display fields only.

### Lifecycle

`NEW` → `UNDER_REVIEW` → `REQUIREMENT_PENDING` → `TECHNICAL_REVIEW` → `FEASIBILITY_PENDING` → `FEASIBILITY_APPROVED` → `QUOTATION_PENDING` → `QUOTATION_CREATED` → `NEGOTIATION` → `WON` / `LOST`, plus `ON_HOLD` and `CANCELLED`.

Transitions live only in `src/services/enquiries/enquiry-workflow.service.ts`. Kanban, detail, and APIs call that service. Phase 6 wires `FEASIBILITY_PENDING` to a real **Start Feasibility** action when a product requirement exists, the user has `feasibility.create`, and no active assessment already exists.

### Product requirement vs product master

A **product master** is a known company catalogue item (`CrmProduct` at `/master/products`). A **product requirement** is what a specific customer is asking for (quantity, pack, artwork, sample, regulatory notes). Selecting a master stores `productId` / `productMasterId` on the requirement and prefills fields; it does not copy the whole catalogue record and does not auto-create a master.

Composition is structured lines (ingredient, strength, unit, ratio, role), not a single text blob. Packaging, quantity, target price, market/regulatory, artwork, specification, sample, stability (capture only), and delivery are stored on `ProductRequirement`.

### Requirement versioning

Updates create a new current version and snapshot the previous one (`requirement_versions`). History is not overwritten. Audit records old/new values and the change reason.

### Conversion flows

- **Lead → Enquiry:** `createEnquiryFromLead()` transfers relevant product fields, stores `leadId`, sets source `LEAD`, and moves the lead to `ENQUIRY_CREATED`.
- **Customer → Enquiry:** Customer detail “Create Enquiry” opens `/crm/enquiries/new?customerId=…` with the customer already selected. Contacts are limited to that customer.

### Assignment and access

`assignedTo` / `assignedToName`. Department is read from the employee profile, not duplicated on the enquiry. `enquiries.view` sees assigned records. `enquiries.view_all` sees the team. Enforced in `visibleEnquiries()` / `assertCanAccessEnquiry()`, not in React.

### Permissions

`enquiries.view|create|update|delete|assign|change_status|export|convert|view_all|technical_review`

`product_requirements.view|create|update|version`

`enquiry_documents.view|upload|delete`

`activities.create` covers enquiry activities and follow-ups.

### Codes and search

`ENQ-2026-00001` via `counters/enquiryNumber-{year}` (transaction). Year is dynamic. Demo uses `nextEnquiryNumber`. Search uses `searchIndex` (number, customer, contact, product, generic, brand). List queries paginate (20 / 50 / 100) and do not download the collection.

### Firestore

Collections: `enquiries`, `enquiry_notes`, `enquiry_activities`, `enquiry_follow_ups`, `enquiry_documents`, `product_requirements`, `requirement_versions`.

Client writes cannot change `enquiryNumber`, `createdAt`, or `createdBy`. Enquiry deletes are denied. Requirement deletes are denied so versions cannot be wiped from the client.

### Security

UI `Can` + `requirePermission` on `/api/crm/enquiries*` + Firestore rules. No `allow read, write: if true`. Files stay in Storage (`documents/enquiries/{id}/…`); Firestore stores metadata only. Download URLs are not published as unrestricted links.

### Workflow rules

| From | To |
| --- | --- |
| NEW | UNDER_REVIEW, REQUIREMENT_PENDING, ON_HOLD, CANCELLED, LOST |
| UNDER_REVIEW | REQUIREMENT_PENDING, TECHNICAL_REVIEW, ON_HOLD, LOST, CANCELLED |
| REQUIREMENT_PENDING | TECHNICAL_REVIEW, UNDER_REVIEW, ON_HOLD, LOST, CANCELLED |
| TECHNICAL_REVIEW | FEASIBILITY_PENDING, REQUIREMENT_PENDING, ON_HOLD, LOST, CANCELLED |
| FEASIBILITY_PENDING | FEASIBILITY_APPROVED, TECHNICAL_REVIEW, ON_HOLD, LOST |
| ON_HOLD | prior active commercial statuses |
| WON | — |
| LOST / CANCELLED | limited reopen |

## Product Master architecture

Product Master (`CrmProduct` in `src/types/products.ts`) is the manufacturing organisation’s standardised catalogue. It is **not** a customer product requirement.

| Concept | Meaning | Example |
| --- | --- | --- |
| Product Master | Known product the plant can discuss / manufacture | Paracetamol 500 mg Tablet (`PRD-00001`) |
| Customer Product Requirement | What a specific customer wants on an enquiry | ABC Pharma, 100,000 tablets/month, Alu-Alu |

Do not merge these records. Selecting a master on an enquiry stores `productMasterId` only and prefills labels. “New product requirement” does **not** auto-create a master.

### Codes, search, filters

`PRD-00001` via `counters/productCode` (transaction). Demo uses `nextProductCode`. Search uses `searchIndex` (code, name, generic, brand, dosage form, strength). List queries paginate 20 / 50 / 100 with cursor support. Filters: type, category, dosage form, status, therapeutic category, site, market.

### Composition and specifications

Composition is structured lines (`ingredientName`, `activeIngredient`, `strength`, `unit`, `quantity`, `role`: API / EXCIPIENT / COATING / FLAVOUR / PRESERVATIVE / OTHER). Specifications capture parameter / limit / unit / test method — not a LIMS.

### Routes

`/master/products`, `/master/products/new`, `/master/products/[id]`, `/master/products/[id]/edit`. Legacy `/business/products` and `/bd/products` redirect here.

## Feasibility architecture

Phase 6 ends at the **feasibility decision**. Eligible assessments (FEASIBLE / PARTIALLY_FEASIBLE) expose **Create Costing**. Quotation, procurement, and manufacturing planning remain later phases.

Workflow (single source of truth: `src/services/feasibility/feasibility-workflow.service.ts`):

Enquiry → Feasibility Initiated → Document Review → Technical Review → Department Review → Evaluation → Approval Pending → Feasible / Partially Feasible / Not Feasible

Also: Clarification Required, On Hold, Cancelled. Arbitrary transitions are rejected.

### Codes and uniqueness

`FEAS-2026-00001` via `counters/feasibilityNumber-{year}`. One **active** assessment per enquiry. If one exists, the UI opens it instead of creating another.

### Department review

Configurable departments in `src/constants/feasibility.ts` (Production, QA, QC, Regulatory, R&D / Technical, Supply Chain, Packaging). Each review has status, decision, remarks, and department-specific fields. Reviews are created with the assessment.

### Clarification

Internal questions (`OPEN` → `RESPONDED` → `RESOLVED` / `CANCELLED`). Sales clarifications use in-app notifications only — no automatic email.

### Evaluation and scoring

Configurable factors and weights in `EVALUATION_FACTORS`. Overall score is informational. **Score never auto-declares feasibility.** Authorized users submit the final decision.

### Decision

`FEASIBLE` / `PARTIALLY_FEASIBLE` / `NOT_FEASIBLE`. Not feasible requires a reason. Partial feasibility stores `conditions[]` (`OPEN` / `RESOLVED` / `WAIVED`). Overdue (`targetCompletionDate` in the past, non-final status) shows an OVERDUE badge and KPI — status is not auto-changed.

### Routes

`/crm/feasibility`, `/crm/feasibility/new`, `/crm/feasibility/[id]`, `/crm/feasibility/[id]/review`, `/crm/feasibility/[id]/edit`. Legacy `/business/feasibility` and `/bd/feasibility` redirect here.

### Permissions

`products.view|create|update|change_status|export`

`feasibility.view|create|update|assign|review|change_status|approve|final_decision|export`

`feasibility_documents.view|upload` (mapped as module `feasibility_documents` because permission keys are `module.action`)

### Firestore

`products`, `product_specifications`, `product_documents`, `product_activities`, `feasibilities`, `feasibility_reviews`, `feasibility_clarifications`, `feasibility_evaluations`, `feasibility_documents`.

Client writes cannot change `productCode` / `feasibilityNumber`, `createdAt`, or `createdBy`. Client deletes are denied. Counters remain Admin SDK only.

## Costing architecture

Phase 7 implements the pharmaceutical costing and pricing engine (`CostSheet` in `src/types/costing.ts`). It sits after feasibility and before quotation.

Customer → Lead → Enquiry → Product Requirement → Feasibility → **Costing** → Pricing Approval → Quotation (Phase 8)

Do not treat costing as a quotation. Approved sheets expose `getQuotationReadyCosting()` (`costingId`, customer, product, enquiry, currency, quantity, unit price, selling price, validUntil). The Quotation module is not built in this phase.

### Routes

`/crm/costing`, `/crm/costing/new`, `/crm/costing/[id]`, `/crm/costing/[id]/edit`, `/crm/costing/[id]/materials`, `/crm/costing/[id]/packaging`, `/crm/costing/[id]/manufacturing`, `/crm/costing/[id]/pricing`, `/crm/costing/[id]/approval`.

Create Costing is also available from an eligible feasibility workspace. Enquiry and customer profiles list related sheets.

### Codes

`COST-2026-00001` via `counters/costingNumber-{year}` (transaction). Display includes version: `COST-2026-00001-V1`. Demo uses `nextCostingNumber`. Numbers are never generated only in the browser for production.

### Workflow

Statuses: `DRAFT` → `IN_PROGRESS` → `COMPLETED` → `UNDER_REVIEW` → `APPROVAL_PENDING` → `APPROVED`, or `REJECTED` / `EXPIRED` / `CANCELLED`.

Transitions live only in `src/services/costing/costing-workflow.service.ts`. React components do not hardcode legal next statuses.

If `validUntil` is in the past and the sheet is not cancelled, the UI shows an **EXPIRED** badge and KPI. Approved business status is not silently rewritten.

Approved sheets cannot be casually edited. Significant change requires `createCostingVersion()` (`costing.version`).

### Eligibility

Costing normally starts from a feasible or partially feasible assessment (enquiry + current product requirement + feasibility IDs are copied, not the full source documents). Not-feasible / rejected work requires `costing.adjust` and an override reason.

### Cost calculation

Authoritative totals run in `src/services/costing/cost-calculation.service.ts` using integer minor units (`src/lib/money.ts`). JavaScript floating point is not used for stored financial totals.

| Block | Formula |
| --- | --- |
| Material / packaging line | `effectiveQty = required × (1 + wastage% / 100)`; `total = effectiveQty × unitCost` |
| Labor | `hours × hourlyCost` |
| Machine | `machineHours × hourlyRate` |
| Utility | `consumption × rate` |
| Quality | `quantity × unitCost` |
| Regulatory / documentation | user-entered activity cost |
| Overhead | configurable **percentage of subtotal** or **fixed amount** (not hardcoded in UI) |
| Total cost | sum of blocks + material/price adjustments (adjustments stored separately) |
| Percentage margin | `selling = cost / (1 − margin%)` — margin must be under 100% |
| Markup | `selling = cost × (1 + markup%)` |
| Fixed margin | `selling = cost + amount` |

Do not confuse margin with markup. Frontend may preview; the store `recalculate()` result is authoritative in demo, and `/api/crm/costing/[id]/calculate` is the production path.

Wastage / yield is centralized (`expectedYieldPercent`, material / production / packaging loss). Line wastage is not applied a second time at header level.

Unit economics: cost / selling / margin per unit and per batch. Annual cost, revenue, and gross margin only when annual quantity is present.

### Materials and packaging

Material types: API, excipient, process material, other. Packaging levels: primary, secondary, tertiary. Calculated totals cannot be typed over; authorized users add a **manual adjustment** (`INCREASE` / `DECREASE`) with reason, permission (`costing.adjust`), and audit.

### Manufacturing, quality, regulatory, documentation, overhead

Manufacturing captures site / unit / line, batch size, machine, labor, setup, changeover, processing, cleaning, and utilities. This is costing only — not production planning, LIMS, or automatic regulatory fee lookup.

### Pricing

Customer-specific commercial placeholders: market, payment terms, delivery terms, special requirement. Volume tiers (`minimumQuantity` / `maximumQuantity` / unit price / margin) reject overlapping ranges. Price adjustments (discount / premium / special) are permissioned, reasoned, and displayed separately from base cost.

### Versioning and comparison

Versions store `version`, actor, timestamp, change reason, and a snapshot. Comparison uses stored totals (material, packaging, manufacturing, quality, overhead, total, margin, selling price).

### Approval

`submitForApproval` / `approveCosting` / `rejectCosting` in `costing-approval.service.ts`. Rejection requires a reason. Approval history is append-only. Levels and selling-price thresholds live in `COSTING_APPROVAL_LEVELS` (Sales Manager, Commercial, Finance, Management). High discount uses `HIGH_DISCOUNT_PERCENT` — not a hardcoded org chart in React. On approve, the enquiry may move to `QUOTATION_PENDING` when the enquiry workflow allows it.

### Financial data security

`costing.view` sees list, header, selling price, and status. `costing.calculate` is required for internal breakdown (material, overhead, margin, supplier rates). Sales executive and viewer have view only. CSV export strips internal columns unless the actor has `costing.calculate`. Firestore line-item collections (`costing_materials`, packaging, manufacturing, adjustments, versions, tiers) are readable only by commercial / finance / management / admin roles. Server `requirePermission` remains authoritative. Never trust client-supplied role, approval status, `approvedBy`, or cost totals.

### Permissions

`costing.view|create|update|delete|calculate|adjust|submit|review|approve|reject|version|export`

`costing_documents.view|upload`

### Documents and notifications

Documents use existing Storage (`documents/costings/{id}/…`). Firestore stores metadata only. Notifications reuse the existing service: assigned, completed, approval requested / approved / rejected, version created, expiring.

### Firestore

`costings`, `costing_materials`, `costing_packaging`, `costing_manufacturing`, `costing_quality`, `costing_regulatory`, `costing_documentation`, `costing_overhead`, `costing_adjustments`, `costing_versions`, `costing_approvals`, `costing_tiers`, `costing_documents`.

Client writes cannot change `costingNumber`, `createdAt`, or `createdBy`. Client deletes are denied. Composite indexes: status / customerId / assignedTo / preparedBy / approvalStatus / currency / validUntil + `createdAt`.

### Services

`services/costing/costing.service.ts`, `cost-calculation.service.ts`, `costing-workflow.service.ts`, `costing-approval.service.ts`, `costing-material.service.ts`, `costing-packaging.service.ts`, `costing-pricing.service.ts`. `services/firestore/costing.service.ts` re-exports the same contract (no second implementation).

## Quotation architecture

Phase 8 implements pharmaceutical quotations (`CrmQuotation` in `src/types/quotations.ts`). The dashboard still uses the Phase 1 `Quotation` seed type in `entities.ts` — do not merge them.

Customer → Enquiry → Requirement → Feasibility → Approved Costing → **Quotation** → Approval → Sent → Negotiation → Accepted / Rejected → Sales Order (Phase 9)

Normal creation is from an approved costing (`getQuotationReadyCosting`). Unapproved costing requires `quotations.approve` and an override reason. Source IDs and a **price snapshot** are stored. Later costing, product, customer, or tax-configuration changes do not rewrite an issued quotation.

Do not treat quotation as a sales order. Accepted sheets expose `getSalesOrderReadyQuotation()` (`quotationId`, customer, items, accepted prices, commercial terms). The Sales Order module is not built in this phase.

### Routes

`/crm/quotations`, `/new`, `/[id]`, `/[id]/edit`, `/[id]/items`, `/[id]/terms`, `/[id]/preview`, `/[id]/versions`, `/[id]/approval`.

`/business/quotations` and `/bd/quotations` redirect here.

Create Quotation is available from an approved costing workspace. Enquiry and customer profiles list related quotations.

### Codes

`QUO-2026-00001` via `counters/quotationNumber-{year}`. Display includes version: `QUO-2026-00001-V2`. Demo uses `nextQuotationNumber`.

### Workflow

Statuses: `DRAFT` → `UNDER_REVIEW` → `APPROVAL_PENDING` → `APPROVED` → `SENT` → `VIEWED` / `NEGOTIATION` / `ACCEPTED` / `REJECTED`, plus `EXPIRED` / `CANCELLED`.

Transitions live only in `src/services/quotations/quotation-workflow.service.ts`. Sent quotations are not silently edited; commercial change creates a revision (V2) that re-enters approval.

If `validUntil` is in the past and the sheet is not cancelled or accepted, the UI shows an **EXPIRED** badge. Business status is not auto-rewritten.

### Pricing and tax

Authoritative totals run in `quotation-calculation.service.ts` using integer minor units.

- Line subtotal = quantity × unit price
- Discount = percentage of subtotal or fixed amount
- Taxable = subtotal − discount
- Tax = taxable × configured rate (CGST / SGST / IGST / OTHER — rates are not hardcoded)
- Line total = taxable + tax
- Quotation: subtotal, item + header discounts, additional charges, taxable, tax, grand total
- Amount in words is generated from the stored grand total (`amountInWords`)

Negative quantities, prices, discounts, taxes, or grand totals are rejected.

### PDF

`quotation-pdf.service.ts` generates an A4 customer PDF (not a UI screenshot). Preview is at `/crm/quotations/[id]/preview`.

Customer PDFs never include material cost, manufacturing cost, margin, supplier cost, internal notes, or internal approval remarks. Letterhead is configurable in `src/constants/company.ts`.

There is no outbound email provider. Send downloads the customer PDF and opens a mailto draft.

### Permissions

`quotations.view|create|update|delete|calculate|discount|submit|review|approve|reject|send|cancel|revise|export`

`quotation_documents.view|upload`

`quotation_pdf.view` (preview) and `quotation_pdf.export` (download) — permission keys are two-part, so these map the requested pdf.view / pdf.download actions.

### Firestore

`quotations`, `quotation_items`, `quotation_charges`, `quotation_versions`, `quotation_approvals`, `quotation_documents`, `quotation_activities`.

Client writes cannot change `quotationNumber`, `createdAt`, or `createdBy`. Client deletes are denied.

## Role and permission architecture

Roles live in `roles` (system catalog seeded from `ROLE_CATALOG`, plus custom roles).

Permissions use `module.action` (`customers.view`, `users.deactivate`, `quotations.approve`).

Grouped matrix: Dashboard, CRM, Business Development, Manufacturing, Quality, Finance, Communication, Reports, Administration.

Central helpers (`src/lib/rbac/guards.ts`):

- `hasPermission(user, permission)`
- `hasAnyPermission` / `hasAllPermissions`
- `hasRole`

UI: `<Can permission="customers.create">` and `usePermission()`. Hiding a button is not security.

System roles cannot be deleted; deactivate them instead.

## RBAC flow

1. Sign-in resolves the Firestore/demo profile.
2. Role → permission list (custom role document, else system catalog).
3. `AuthenticatedUser.permissions` is the runtime grant set.
4. Route guard maps path → permission (`src/lib/auth/route-permissions.ts`).
5. `/admin` is not automatically privileged. Examples:
   - `/admin/users` → `users.view`
   - `/admin/roles` → `roles.view`
   - `/admin/settings` → `settings.manage`
6. Mutations call `assertCan` on the client and `requirePermission` on the server.

## Server authorization

Never trust a role from the client, localStorage, or hidden UI.

```ts
await requireAuth();
await requirePermission("users.create");
await requireRole("super_admin");
```

Implemented in `src/lib/auth/require-auth.ts`. Session cookie is verified (Firebase session cookie / id token, or demo seed user). Profile status must be `ACTIVE`.

Sensitive APIs:

- `POST /api/admin/authorize`
- `POST /api/admin/users`
- `PATCH /api/admin/users/[id]`
- `POST /api/admin/roles`
- `PATCH /api/admin/roles/[id]`
- `PATCH /api/profile` (self-service; cannot change role, status, or employeeId)

## Custom claims

Claims store authorization context only:

```json
{ "role": "sales_manager" }
```

Do not put permission arrays in claims. Detailed grants stay on the role document. On role change: update Firestore, `setCustomUserClaims({ role })`, write an audit record. Target clients should refresh their ID token (`getIdToken(true)`).

## Security model

Three layers, all required for production:

1. **UI** — `Can`, sidebar filters, route guard
2. **Server** — `requireAuth` / `requirePermission` on Admin APIs
3. **Firestore** — default deny; no `allow read, write: if true`

Protected collections:

| Collection | Client access |
| --- | --- |
| `users` | Read self / admin / management. Self-update cannot change `roleId`, `status`, or `employeeId` |
| `roles` | Staff read, admin write, no delete |
| `permissions` | Staff read, no client write |
| `counters` | Admin SDK only |
| `audit_logs` | Privileged read, no client write |

Rules also accept `request.auth.token.role` so claims and the user document can agree.

### Demo vs production gap

In demo mode, identity data lives in `identity-store` (browser). Server authorize still uses the seeded session user and catalog permissions, which is enough to reject a Viewer calling `/api/admin/users`. Production uses Admin SDK + Firestore + claims.

## Audit

Login/logout write `LOGIN` / `LOGOUT` (no passwords). `lastLoginAt` is updated on successful sign-in.

Admin actions audited: user created/updated, role assigned/changed, activate/deactivate/suspend, permission changes. Fields: actor, action, target, timestamp, old/new values.

User activity timelines read the existing audit service / local audit log.

## Firestore collections

`users`, `roles`, `permissions`, `employees`, `counters`, `customers`, `contacts`, `customer_notes`, `customer_documents`, `customer_activities`, `leads`, `lead_notes`, `lead_activities`, `lead_follow_ups`, `lead_documents`, `enquiries`, `enquiry_notes`, `enquiry_activities`, `enquiry_follow_ups`, `enquiry_documents`, `requirement_versions`, `opportunities`, `activities`, `products`, `product_specifications`, `product_documents`, `product_activities`, `product_requirements`, `feasibility`, `feasibilities`, `feasibility_reviews`, `feasibility_clarifications`, `feasibility_evaluations`, `feasibility_documents`, `costings`, `costing_materials`, `costing_packaging`, `costing_manufacturing`, `costing_quality`, `costing_regulatory`, `costing_documentation`, `costing_overhead`, `costing_adjustments`, `costing_versions`, `costing_approvals`, `costing_tiers`, `costing_documents`, `quotations`, `quotation_items`, `quotation_charges`, `quotation_versions`, `quotation_approvals`, `quotation_documents`, `quotation_activities`, `negotiations`, `purchase_orders`, `manufacturing_orders`, `batches`, `dispatches`, `invoices`, `payments`, `complaints`, `documents`, `notifications`, `audit_logs`.

## Environment variables

See [`.env.example`](.env.example).

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Browser + server | Client SDK |
| `FIREBASE_ADMIN_*` | Server only | Admin SDK. Never `NEXT_PUBLIC_` |
| `SESSION_COOKIE_*` | Server | HttpOnly session cookie |
| `NEXT_PUBLIC_DEMO_MODE` | Browser | Force demo auth/data |
| `ALLOW_SEED` | Scripts | Required for seed / first Super Admin |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Scripts | First Super Admin |

Never commit `.env.local` or service-account JSON.

## Local development

On PowerShell, if `npm` is blocked, use `npm.cmd`:

```bash
npm.cmd install
copy .env.example .env.local
npm.cmd run dev
```

Open `/login`. In demo mode sign in with `tina.r@example.net` / `Demo@12345`.

## Admin setup / first Super Admin

Do this once, with Admin credentials on the machine only:

1. Enable Authentication → Email/Password and create Firestore.
2. Put Admin SDK values in `.env.local` (never `NEXT_PUBLIC_`).
3. Set `ALLOW_SEED=true`, `SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD`.
4. Run:

```bash
npm.cmd run create-super-admin
```

This creates the Auth user, writes `users/{uid}` as Super Admin with `EMP-0001`, sets claim `{ role: "super_admin" }`, and initializes `counters/employeeId`.

Alternatively, create the Auth user in the Firebase console, then write the same `users/{uid}` document and set the claim with Admin SDK. Do not grant Super Admin from a client app.

5. Deploy rules:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes,storage
```

6. Sign in at `/login`. Create remaining employees from `/admin/users`. They receive a password-reset email; they cannot set their own role.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run seed
npm run create-super-admin
```

## Development guidelines

- Keep database and auth logic in `services/`, not `page.tsx`
- Validate with Zod on client and server
- Paginate user lists; do not load the entire `users` collection
- UI permission checks must be paired with server/Firestore enforcement
- Do not modify audit logs from the client
