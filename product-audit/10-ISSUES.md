# Issue register

Machine-readable source: `issues.json`.

## P1 release blockers

### ZT-001 — BOM can create negative stock

- Agent: Inventory Manager, Finance, Data Integrity
- Roles: ADMIN, MANAGER, DOCTOR, CONSULTANT, RECEPTION
- Module: clinical case / inventory
- Type: DATA / WORKFLOW
- Evidence: `web/src/app/(app)/ho-so/actions.ts:222-250` creates usage, decrements stock, and records OUT without rejecting `bomNeeds` shortages. Current DB has no negative stock, but the unsafe path is present.
- Reproduction: In an isolated DB, configure a BOM needing more than available stock; add the service to a case.
- Expected: block, reserve, or require an explicit shortage decision; never silently corrupt stock.
- Actual: stock is decremented by the full need.
- Impact: material availability, cost, and operational truth diverge.
- Fix: transactionally validate availability/shortage, add an invariant test, and define approved negative-stock policy.
- Effort: M; Confidence: High.

### ZT-002 — Removing service/case does not reverse BOM consumption

- Agent: Inventory Manager, Data Integrity
- Roles: clinical writers, ADMIN
- Module: case / inventory
- Type: DATA / WORKFLOW
- Evidence: `ho-so/actions.ts:253-265` deletes the service without reversing its usage; `deleteCase` removes case data without restoring consumed stock.
- Reproduction: Add BOM-backed service, verify OUT movement, delete service or case, inspect stock/ledger.
- Expected: exact compensating IN movement or a documented immutable cancellation flow.
- Actual: service/child rows disappear while stock remains consumed.
- Impact: permanent stock and COGS drift.
- Fix: model consumption source and reverse transactionally; prohibit hard delete after consumption unless policy supports it.
- Effort: L; Confidence: High.

### ZT-003 — Child server actions do not verify parent ownership

- Agent: Security Red Team, Manager, Data Integrity
- Roles: any role with the capability
- Module: case server actions
- Type: SECURITY / DATA
- Evidence: `ho-so/actions.ts:253-260,272-295,478-539,620-625,654-659,713-728` uses a separate caller-provided `caseId` for lock/recalc and a child `id` for mutation without a combined parent predicate.
- Reproduction: In an isolated role test, submit a valid child ID from case A with case B as the hidden `caseId`; observe whether the child from A is changed/deleted.
- Expected: reject mismatched parent IDs.
- Actual: source path allows the mutation query to target by child ID alone.
- Impact: horizontal case tampering and cross-patient record corruption.
- Fix: load child with `where: { id, caseId }` and authorize the actual parent before mutation; add direct server-action regression tests.
- Effort: M; Confidence: High.

### ZT-004 — Authenticated media access is not record-scoped

- Agent: Security Red Team, Privacy
- Roles: any authenticated role
- Module: media/uploads
- Type: SECURITY / PRIVACY
- Evidence: `web/src/app/media/[file]/route.ts:39-48` accepts any session before serving a filename; no case/customer authorization is checked.
- Reproduction: With two isolated users and a known filename from another case, request `/media/<filename>` with the second session.
- Expected: deny unless the user is authorized for that case/customer.
- Actual: any valid session passes the session gate.
- Impact: clinical photos/documents can cross role or patient boundaries.
- Fix: store owner metadata, authorize by case/customer capability, deny raw `/uploads` access, and use short-lived record-scoped tokens.
- Effort: L; Confidence: High.

### ZT-005 — Shareholder view renders clinical/customer details too broadly

- Agent: Privacy / Health-data, Security, Commercial
- Roles: SHAREHOLDER and other non-clinical viewers
- Module: customer detail
- Type: PRIVACY / SECURITY
- Evidence: `permissions.ts` includes SHAREHOLDER in customer access; `khach-hang/[id]/page.tsx:180-183,246-309` renders medical alert, cases, treatment photos, and care history without a clinical-data capability boundary.
- Reproduction: Use an isolated SHAREHOLDER account to open a populated customer detail page.
- Expected: minimized management view or explicit scoped capability.
- Actual: source renders health and treatment information for the module viewer.
- Impact: unnecessary health-data exposure and loss of least privilege.
- Fix: split customer summary, clinical detail, photos, financial, and care capabilities; default SHAREHOLDER to aggregate/minimized data.
- Effort: M; Confidence: High.

### ZT-006 — Reception/TELESALE can edit sensitive medical fields

- Agent: Privacy / Health-data, Doctor, Security
- Roles: ADMIN, MANAGER, RECEPTION, TELESALE
- Module: customer edit
- Type: PRIVACY / WORKFLOW
- Evidence: `khach-hang/actions.ts:31-45,55-64,101-110`; `ROLES` permits these roles and the update writes allergies, medicalHistory, and contraindications.
- Reproduction: Use an isolated RECEPTION or TELESALE account to submit those fields through the customer update action.
- Expected: separate clinical-write capability and auditable restricted update.
- Actual: role list permits the write path.
- Impact: accidental or unauthorized alteration of safety-critical context.
- Fix: split schema/actions by sensitivity, add field-level audit, and require clinical role for clinical fields.
- Effort: M; Confidence: High.

### ZT-007 — Photo upload trusts unrelated case and customer IDs

- Agent: Security Red Team, Clinical, Privacy
- Roles: clinical writers
- Module: treatment photos
- Type: SECURITY / DATA / PRIVACY
- Evidence: `ho-so/actions.ts` uploadPhoto path accepts `caseId` and `customerId` separately and creates both without verifying the case/customer relation.
- Reproduction: In an isolated DB, submit a valid case ID with a different customer ID and inspect the created photo relation.
- Expected: reject mismatched ownership.
- Actual: server trusts the form fields.
- Impact: misfiled patient image and broken clinical record integrity.
- Fix: derive customer from case server-side and ignore client-supplied customerId.
- Effort: S; Confidence: High.

## P2/P3 findings

| ID | Finding | Type | Evidence |
|---|---|---|---|
| ZT-008 | Public booking clears name/phone after invalid phone error | UX | Browser reproduction on `/dat-lich`; screenshot `screenshots/04-public-booking-mobile.png` is the baseline view. |
| ZT-009 | Public service selector is long and contains inconsistent labels | UX / PRODUCT-GAP | Browser DOM inspection of the public booking list. |
| ZT-010 | ESLint release gate fails | MAINTAINABILITY | Runtime lint: 11 errors, 1 warning. |
| ZT-011 | No Playwright/Cypress E2E suite | QA / WORKFLOW | `web/package.json` has Vitest but no browser E2E dependency. |
| ZT-012 | NPS has no database uniqueness protection | DATA | `NpsResponse` has indexes but no unique-per-customer/time-window constraint; action relies on in-memory rate limit. |
| ZT-013 | In-memory rate limits reset on restart/multi-instance | SECURITY / RELIABILITY | `dat-lich/actions.ts:27` and portal actions use `bump()` in process memory. |
| ZT-014 | Debt plan checks case existence, not debt balance | DATA / WORKFLOW | `cong-no/actions.ts` reads `debtAmount` but does not enforce a positive-debt rule. |
| ZT-015 | Untracked key file exists in checkout and is not ignored | SECURITY / OPERATIONS | `git status` shows `PHONE_ENC_KEY-20260629-122122.txt`; value was not read. |
| ZT-016 | CSP/X-Powered-By hardening remains incomplete | SECURITY | Runtime headers allow unsafe inline/eval and expose `X-Powered-By: Next.js`. |
| ZT-017 | Native date/time locale may conflict with Vietnamese copy | UX / ACCESSIBILITY | Observed in the en-US browser locale; recheck with supported locale matrix. |

