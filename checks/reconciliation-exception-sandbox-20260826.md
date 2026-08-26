# Reconciliation EXCEPTION sandbox evidence — 2026-08-26

Added an Admin-only project-local EXCEPTION action for unmatched payment reconciliations. The action requires typed `EXCEPTION`, a reason of at least ten characters, verifies the reconciliation ID and project ID together, stores the reason on the local reconciliation row, writes an audit entry and never changes the legacy Payment table. MATCHED remains a separate explicit action.

The Finance page now exposes both MATCH and EXCEPTION controls only for `UNMATCHED` rows; MATCHED/EXCEPTION rows are read-only.

| Check | Result |
|---|---:|
| Prisma validate/generate | pass |
| Targeted workspace/mechanism/payroll/AI tests | 22/22 |
| TypeScript | pass |
| Next production build | pass |

No database, clinic runtime or browser session was used. P05-T02 remains `review` because isolated DB execution and authenticated runtime reconciliation tests are still open.
