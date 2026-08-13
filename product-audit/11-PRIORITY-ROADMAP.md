# Priority roadmap

## Phase 0 — data loss, security, money

1. Fix parent-child authorization in every case/customer mutation.
2. Make media and upload authorization record-scoped.
3. Separate clinical read/write capabilities from operational/customer views.
4. Add stock shortage policy, idempotency, exact reversal, and ledger tests.
5. Move key material out of the checkout/runtime image and rotate any exposed operational secrets.
6. Add isolated role accounts and direct server-action authorization tests.

Complexity: L across security/media/permissions; M-L for inventory model and tests.

## Phase 1 — broken workflows

1. Build the Playwright role-based critical path suite.
2. Test public booking → reception → case → payment → clinical → care.
3. Test debt, cancellation/reschedule, duplicate customer, double-submit, and concurrent edits.
4. Define retention and deletion policy for patient/case/media data.

Complexity: L.

## Phase 2 — high-impact UX

1. Preserve form state after validation errors.
2. Search/group the public service catalog.
3. Add role-specific home tasks and a patient timeline.
4. Add onboarding, empty states, stale-state feedback, and accessible pending/error announcements.

Complexity: M.

## Phase 3 — scale and observability

1. Benchmark 1k/10k/100k seeded datasets.
2. Profile customer detail, reports, analytics, and media handling.
3. Replace in-memory rate limits with shared storage.
4. Add metrics for failed actions, authorization denials, queue/integration health, and backup/restore drills.

Complexity: M-L.

## Phase 4 — commercialization

1. Extract tenant branding/configuration.
2. Document install, migration, backup/restore, support, diagnostics, and upgrade paths.
3. Verify tenant isolation and clinic-specific data boundaries.
4. Create safe demo seed and onboarding wizard.

Complexity: XL.

## Phase 5 — polish

1. Remove lint debt and hardening warnings.
2. Complete WCAG/keyboard/screen-reader coverage.
3. Standardize locale, wording, chart semantics, and responsive states.

Complexity: M.

