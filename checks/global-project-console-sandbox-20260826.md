# Global project console sandbox evidence — 2026-08-26

The `/du-an` console now uses the unit-tested cursor pagination helper for its bounded 50-row page. A synthetic 1,001-row test walks pages without duplicate or missing IDs and asserts every page is at most 50 rows. The page uses the same scoped `count` query for total matching projects and per-project `_count` aggregates.

| Check | Result |
|---|---:|
| Synthetic cursor pagination (1,001 rows) | pass |
| Global console policy tests | 2/2 |
| Layout policy tests | 2/2 |
| AI governance tests | 12/12 |
| Config proposal policy tests | 2/2 |
| Workspace navigation tests | 3/3 |
| Mechanism rule tests | 3/3 |
| Payroll policy/calculation tests | 5/5 |
| Targeted total | 30/30 |
| TypeScript | pass |
| Next production build | pass |

No database, clinic runtime or browser session was used. P07-T04/T05 remain `review` because authenticated role denial, real PostgreSQL query-plan/scale verification and live aggregate verification are still open.
