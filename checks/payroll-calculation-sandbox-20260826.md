# Payroll calculation preview sandbox evidence — 2026-08-26

## Implemented

- Added a pure, whitelisted calculator for project-local payroll commission preview.
- Supported rule contract is explicit: `basis` is `SALE_PAID` or `INCOME_LEDGER`, `rateBps` is an integer from 0 to 10000, and allocation is `EQUAL_ACTIVE_MEMBERS`.
- `SALE_PAID` reads only non-cancelled `ZWorkspaceSale` rows in the run period; `INCOME_LEDGER` reads only `ZWorkspaceLedgerEntry` rows with `INCOME` and `POSTED` status in the same project/period.
- Commission is split deterministically across the immutable PayrollLine user snapshot, with integer remainder handling. Line snapshots retain calculation metadata; audit stores aggregate basis/rate/total, not sensitive row values.
- The action requires Admin plus explicit `CALCULATE`, only operates on a project-local `DRAFT` run, and does not finalize, pay, or query legacy tables.

## Verification

- Pure calculator tests: 3/3 pass.
- AI governance regression: 11/11 pass.
- Combined targeted Vitest: 14/14 pass.
- Direct TypeScript: pass.
- Next production build: pass.
- One initial TypeScript failure from Prisma JSON typing was corrected before the final pass; no database or clinic runtime was touched.

## Limits

This is a calculation preview only. Payroll module remains unavailable in the registry. `PREVIEW -> APPROVED` exists separately with explicit confirmation; finalize/void, two-person sensitive payroll policy, runtime authenticated walkthrough, isolated DB integration tests, and actual payout remain open. Do not mark P05-T04 done or deploy this batch to clinic until the release candidate has the required migration/runtime evidence.
