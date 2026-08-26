# Payroll two-person governance sandbox evidence — 2026-08-26

## Implemented

Migration `20260826160000_payroll_two_person_governance` adds project-local second approver, finalizer, voider, timestamps and void reason. It is additive and leaves all legacy clinic payroll/payment/case tables unchanged.

The server actions now require an Admin and explicit typed confirmation for second approval, finalize and void. Second approval is rejected when the actor is the first approver, finalize is rejected unless two distinct approvals exist, and void is restricted to an approved/finalized run with two-person approval plus a reason of at least ten characters. Every state change writes an audit record and retains the PayrollRun; no payout is created and no row is deleted.

The Payroll page masks gross, commission and net totals for non-Admin users. Governance actions remain Admin-only. PREVIEW now also requires a successful calculation snapshot, so the intended sequence cannot be skipped by a crafted form.

## Verification

- Prisma validate: pass.
- Prisma generate: pass.
- Targeted Vitest: 14/14 pass (11 AI governance + 3 payroll calculation).
- Direct TypeScript: pass.
- Next production build: pass.

## Status and limits

P05-T05 is now `review`, not `done`, because the sandbox has role-sensitive actions, masking and audit contracts but no authenticated QA/runtime walkthrough yet. P05-T04 remains `review`: finalize/void policy now exists in source, but isolated DB integration tests, real two-Admin walkthrough, payout/accounting integration, and production deployment evidence remain open. Payroll remains unavailable in the module registry until those gates pass.
