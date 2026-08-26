# Global project console sandbox evidence — 2026-08-26

The `/du-an` console uses cursor pagination with a page size of 50, bounded code/name search, and per-project counts for members, units, mechanisms, tasks, project-local customers and project-local sales. Admin queries all projects; Manager queries only active memberships. Query construction now uses `v2-global-console-policy.ts`, which is unit-tested and fail-closed for non-Admin access to the global console.

| Check | Result |
|---|---:|
| Global console policy tests | 2/2 |
| AI governance tests | 12/12 |
| Config proposal policy tests | 2/2 |
| Workspace navigation tests | 3/3 |
| Mechanism rule tests | 3/3 |
| Payroll policy/calculation tests | 5/5 |
| Targeted total | 27/27 |
| TypeScript | pass |
| Next production build | pass |

No database, clinic runtime or browser session was used. P07-T04/T05 remain `review` because authenticated role denial, synthetic 1000-project scale and live aggregate verification are still open.
