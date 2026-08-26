# Payroll governance sandbox evidence — 2026-08-26

## Scope

Sandbox-only change. No clinic database, credential, browser session, or Windows updater was used.

## Implemented

- Added project-scoped Admin action to move `ZWorkspacePayrollRun` from `DRAFT` to `PREVIEW` only with explicit `PREVIEW` confirmation.
- Added project-scoped Admin approval from `PREVIEW` to `APPROVED` only with explicit `APPROVE` confirmation, non-empty line snapshot, non-negative monetary fields, and audit entry.
- UI exposes the two-step preview/approval flow on the project payroll page and explicitly states that finalize/chi trả are not available.
- No legacy PayrollEntry, Payment, CaseRecord, or Internal data is queried.

## Verification

- `node_modules/.bin/tsc --noEmit` — pass.
- `node_modules/.bin/vitest run src/lib/ai-governance.test.ts` — 11/11 pass.
- `node_modules/.bin/next build` — pass; `/du-an/[projectId]/luong` compiled.

## Status

P03-T06 and P05-T03 are now `review` because schema/mechanism foundations exist. P05-T04 remains `review`: DRAFT → PREVIEW → APPROVED exists, but real commission calculation, finalize/void workflow, sensitive role policy, runtime authenticated walkthrough, and isolated DB tests remain open. This evidence does not justify marking the task done.
