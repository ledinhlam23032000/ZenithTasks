# Workspace navigation sandbox evidence — 2026-08-26

Refactored AppShell project navigation into a pure helper with explicit active-project resolution. The helper treats `__GLOBAL__` as a non-project sentinel, scopes `/tro-ly?p=projectId` to the project workspace, exposes only available project-local modules, and keeps the global project-management link Admin-only.

Regression tests assert that project navigation contains local Customer/Sales/AI routes but does not contain legacy Internal `/khach-hang`, `/lich-hen`, `/luong` or `/thu-chi` routes. Manager navigation does not contain `/du-an` global management.

| Check | Result |
|---|---:|
| Workspace navigation tests | 3/3 |
| Mechanism rule tests | 3/3 |
| Payroll policy/calculation tests | 5/5 |
| AI governance tests | 11/11 |
| Targeted total | 22/22 |
| TypeScript | pass |
| Next production build | pass |

No browser or database runtime was used. P06 runtime/mobile smoke remains open; this is not authenticated walkthrough evidence.
