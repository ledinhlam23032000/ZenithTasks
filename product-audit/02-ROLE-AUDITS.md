# Role audit board

This section records the 20 independent lenses requested in the Red Team brief. Source/runtime evidence is stronger than role-specific opinion. Since no role password was available and no password was guessed, UI findings for authenticated roles remain provisional until an isolated demo database is seeded.

| Agent | Primary concern | Current result |
|---|---|---|
| Hospital director / owner | operational speed, reports, unnecessary modules | High feature breadth; navigation and KPI density need task-based usability testing. Commercial decision is blocked by P1 integrity/privacy issues. |
| Clinic manager | permissions, consistency, staff oversight | RBAC is detailed, but object-level checks in child mutations need hardening. |
| Receptionist | fast intake while multitasking | Public form is compact; authenticated intake flow not yet executable without a test account. |
| Telesale / consultant | lead-to-treatment conversion and follow-up | Journey exists in source; timeline/SLA/attribution need browser testing and seeded data. |
| Doctor | clinical signal over administration | Clinical record is rich, but medical data is not separated tightly enough by role. |
| Nurse | bedside material and follow-up operations | Inventory usage is available, but BOM/rollback behavior is unsafe. |
| Customer care | inbox, assignment, SLA, handoff | Care modules exist; unread/SLA and multi-user handoff require role E2E tests. |
| Accounting / finance | payment, debt, voucher, payroll, close | Transactional code and tests are positive; debt-plan invariant and deletion/stock interactions need fixes. |
| Inventory manager | stock correctness and expiry | Negative stock and irreversible deletion path are release blockers. |
| Patient / customer | clarity, booking, privacy, mobile | Booking is understandable and mobile-fit; invalid submission loses input and the service catalog is too long/noisy. |
| UX researcher | hierarchy, cognitive load, error recovery | Clear public form; internal information architecture remains unmeasured due missing role access. |
| Accessibility specialist | keyboard, focus, labels, contrast, screen reader | Public labels/native controls are a good start; no axe/keyboard/screen-reader run was completed. |
| Security Red Team | auth, IDOR, uploads, actions, webhooks | P1 findings: media authorization, cross-case child mutations, and upload association. |
| Privacy / health-data reviewer | minimization, photos, portal, staff access | P1 findings: shareholder clinical exposure and broad media access. |
| QA destruction agent | duplicates, refresh, concurrency, invalid values | Unit tests cover many invariants; no browser concurrency or double-submit suite exists. |
| New employee | discoverability and onboarding | Not testable without an authenticated seeded account; commercial onboarding evidence is missing. |
| Mobile/tablet field tester | touch, tables, modal, overflow | Public booking passed the 390px overflow check; internal/tablet flows remain untested. |
| Performance engineer | N+1, pagination, scale | No benchmark or large dataset run; production readiness is unproven. |
| Data-integrity auditor | invariants and relation ownership | Stock rollback and parent-child validation are clear P1 gaps. |
| Commercial product reviewer | tenanting, setup, support, recovery | Current app is more demonstrably an Hồng Phúc internal system than an installable multi-clinic product. |

## Board conflicts

### Clinical completeness versus speed

- Doctor/Nurse want allergies, history, contraindications, treatment history, and photos immediately visible.
- Privacy/Security want those fields scoped to the minimum clinical roles.
- Recommended decision: create a clinical summary capability, show a minimum alert to operational roles, and require explicit capability/audit for full details and photos.

### Operational convenience versus inventory correctness

- Operations want adding a service to be one click.
- Finance/Inventory require stock availability, idempotency, reversal, and auditability.
- Recommended decision: reserve/consume through one transaction, block or explicitly approve shortages, and reverse consumption on service/case removal.

### Commercial configurability versus current branding

- Internal owner benefits from Hồng Phúc-specific defaults.
- Commercial reviewer requires tenant configuration and no clinic-specific assumptions.
- Recommended decision: separate tenant configuration from seed data before selling to another facility.

