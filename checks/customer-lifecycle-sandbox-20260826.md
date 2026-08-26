# Customer lifecycle sandbox evidence — 2026-08-26

## Implemented

Added additive project-local customer lifecycle migration `20260826170000_workspace_customer_consent_lifecycle`. `ZWorkspaceCustomer` now has consent status/timestamp/note and soft-delete metadata with a project index and nullable deleter relation. Legacy `Customer` and clinic consent tables remain unchanged.

Added scoped server actions for Customer edit, consent recording and archive. Each action calls `requireProjectAccess`, validates the customer ID with the active project, writes an audit event and revalidates only project-local routes. Archive changes `active=false` and retains the record/history; there is no hard delete.

Added `/du-an/[projectId]/khach-hang/[customerId]` with project-local detail, linked appointments, linked sales and filtered audit history. The list now links to detail. The detail form supports edit, consent and archive with explicit confirmation.

## Verification

Prisma validate/generate passed. Targeted Vitest passed 14/14. Direct TypeScript passed. Next production build passed and compiled the new detail route.

## Limits

This is sandbox evidence only. Runtime authenticated walkthrough, isolated SQL execution after migration and full Customer field/role regression remain open; P04-T02 is `review`, not `done`. No clinic database or browser session was touched.
