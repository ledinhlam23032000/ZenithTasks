# Executive summary

## Verdict

**NOT READY for commercial release.** The public booking surface is usable and the repository has a meaningful automated unit-test base, but the current runtime/source contains high-impact data-integrity and privacy boundary defects. These must be fixed and regression-tested before real patient data or a second clinic is onboarded.

## Evidence scope

- Runtime: `http://localhost:3000`.
- Source: `C:\Users\PC\ZenithTasks`, branch `claude/lucid-cori-fg136w`, commit `6a6dc88`.
- A separate checkout at `C:\Users\PC\Documents\New project\ZenithTasks` was found at another commit. It was not used as present-state evidence.
- Public browser checks: login, public booking desktop/mobile, invalid booking validation, and a local customer portal token. Patient-identifying portal evidence is intentionally not reproduced in this report.
- Runtime checks: typecheck passed; 233 Vitest tests passed; ESLint failed with 11 errors and 1 warning.
- No production deployment, external Zalo/Facebook account, or role credential was changed.

## Score

The requested 16 dimensions were scored 0–10 and normalized to 100. Unauthenticated role scores are provisional.

| Dimension | Score |
|---|---:|
| Product completeness | 7 |
| Admin UX | 5 |
| Reception UX | 5 |
| Telesale UX | 4 |
| Doctor UX | 4 |
| Nurse UX | 3 |
| Customer-care UX | 4 |
| Mobile UX | 6 |
| Accessibility | 5 |
| Security | 4 |
| Privacy | 2 |
| Reliability | 5 |
| Performance | 5 |
| Data integrity | 2 |
| Maintainability | 5 |
| Commercial readiness | 2 |
| **Total** | **42.5/100** |

## Issue count

- P0: 0 confirmed.
- P1: 7.
- P2: 8.
- P3: 2.

P1 does not mean the issue is harmless; it means the finding is a release-blocking workflow, privacy, authorization, or data-integrity risk that needs a fix before commercial release. P0 requires direct evidence of catastrophic loss or a system-wide outage, which this read-only audit did not establish.

## Top blockers

1. BOM consumption decrements stock without rejecting insufficient stock; negative inventory is possible.
2. Deleting a BOM-backed service or case does not restore inventory consumed by that service.
3. Several server actions lock a caller-supplied `caseId` but mutate a child record by `id` without verifying the child belongs to that case.
4. Any authenticated session that learns a media filename can pass the media route; record-level authorization is absent.
5. SHAREHOLDER is allowed into customer views while the page renders medical alerts, treatment history, treatment photos, care messages, and financial totals without a clinical-data boundary.
6. Reception and telesale roles can edit allergies, medical history, and contraindications.
7. Photo upload trusts separate `caseId` and `customerId` form fields and does not verify their relationship.
8. Public booking validation clears previously entered fields after an invalid phone error.
9. The release quality gate is red: ESLint fails even though typecheck and unit tests pass.
10. There is no repository E2E/browser test suite, so the critical multi-role workflows are not regression protected.

## What is working

- Public booking is visually coherent on mobile and had no horizontal overflow in the tested 390px viewport.
- Form labels and native controls are present on the public booking flow.
- Unauthenticated access to `/dashboard`, `/media/*`, and `/uploads/*` was blocked or redirected.
- Security headers include CSP, HSTS, frame protection, MIME sniffing protection, and a restrictive referrer policy.
- Phone storage uses encrypted/HMAC-oriented helpers; full phone reveal is capability-gated and audited.
- TypeScript and the existing 233 Vitest tests pass in the running image.

