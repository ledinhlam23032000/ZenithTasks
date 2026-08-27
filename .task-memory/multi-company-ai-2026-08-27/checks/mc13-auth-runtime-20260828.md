# MC-13 authenticated QA runtime evidence — 2026-08-28

## Environment

- Environment: independent Windows QA worktree `C:\Users\PC\ZenithTasks-QA`.
- Compose project: `zenithqa`; app container `zenithqa_app`; DB container `zenithqa_db`.
- Clinic checkout was not modified.
- Source baseline used for final walkthrough: master after PR #75, commit `6bf05c8`.
- QA image was rebuilt/recreated and `/app/scripts/qa/auth-walkthrough.mjs` was verified inside the container.
- App startup reported 68 migrations found and no pending migrations. This is QA evidence only; it is not clinic migration evidence.

## Required sequence

1. Guarded idempotent seed: PASS (`mc12-qa-seed-evidence-v3.json` in QA worktree).
2. Read-only verifier: PASS (`mc12-qa-verifier-evidence-v3.json` in QA worktree).
3. Authenticated GET-only walkthrough after seed/verifier: PASS, exit code 0 (`mc13-auth-walkthrough-evidence-v8.json` in QA worktree).

## Verifier counts

| Metric | Count |
|---|---:|
| QA users | 7 |
| Projects | 4 |
| ACTIVE projects | 2 |
| Memberships | 6 |
| Customers | 8 |
| Tasks | 8 |
| Child agents | 4 |
| ACTIVE child agents | 2 |
| Global agents | 1 |
| ACTIVE global agents | 1 |

Verifier assertions passed for active QA users with forced first-login password change, A/B ACTIVE projects plus DRAFT/ARCHIVED sentinels, role presets/revoked membership, project ownership, one ACTIVE child per active company, and one ACTIVE aggregate-only Global AI.

## Walkthrough coverage

The versioned script signs short-lived synthetic sessions with the QA container secret and sends GET-only requests. It asserts that allowed pages contain route-specific content and that denied pages do not contain the requested tenant route content. Next.js `ForbiddenPage` may be rendered with HTTP 200; the checker therefore records body markers and redirect headers instead of requiring 3xx alone.

| Area | Result |
|---|---|
| Global project list A+B | PASS |
| Global Admin opens child-AI page for A | PASS |
| Project Admin A opens A workspace/customer | PASS; A route content and synthetic A customer marker present |
| Project Admin A attempts B workspace/customer | PASS denied; B route content absent and denial marker present |
| Project Admin B opens B workspace | PASS |
| Sales A opens A customers | PASS |
| Sales A attempts A finance | PASS denied; finance route content absent and denial marker present |
| Finance A opens A finance | PASS |
| Viewer B opens B workspace | PASS |
| Viewer B attempts B customers | PASS denied; customer route content absent and denial marker present |
| Revoked A attempts A workspace | PASS denied; workspace route content absent and denial marker present |
| Project Admin A attempts DRAFT workspace | PASS denied; workspace route content absent and denial marker present |
| Project Admin A attempts ARCHIVED workspace | PASS denied; workspace route content absent and denial marker present |

## Scope limits

This closes the current DB-backed authenticated route/isolation evidence slice for MC-12/MC-13. It does not prove export isolation, authenticated server-action write denial, child/global AI dispatcher end-to-end behavior, message/job orchestration, payroll/accounting settlement, clinic migration/backup/rollback/deployment, or production readiness. Hard-delete remains unavailable by design; company removal is archive/restore only.
