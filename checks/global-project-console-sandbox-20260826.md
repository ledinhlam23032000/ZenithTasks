# Global project console sandbox evidence — 2026-08-26

The `/du-an` console now performs a bounded `count` query using the exact same Admin-all-project or Manager-active-membership scope as the cursor-paginated list. The UI shows total matching projects and current-page count; it still loads at most 50 project rows plus per-project `_count` aggregates and does not load all domain records into memory.

| Check | Result |
|---|---:|
| Global console policy tests | 2/2 |
| Layout policy tests | 2/2 |
| AI governance tests | 12/12 |
| Config proposal policy tests | 2/2 |
| Workspace navigation tests | 3/3 |
| Mechanism rule tests | 3/3 |
| Payroll policy/calculation tests | 5/5 |
| Targeted total | 29/29 |
| TypeScript | pass |
| Next production build | pass |

No database, clinic runtime or browser session was used. P07-T04/T05 remain `review` because authenticated role denial, synthetic 1000-project scale and live aggregate verification are still open.
