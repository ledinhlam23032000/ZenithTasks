# AI config proposal governance sandbox evidence — 2026-08-26

Added `propose_workspace_config` to the Admin AI dispatcher capability set. The policy keeps it draft-only: Global scope still requires an explicit projectId for non-aggregate actions, a Manager without the capability is denied, and the policy returns `WARN / DRAFT_ONLY` rather than applying a configuration. APPLY remains a separate Admin server action requiring an APPROVED project-local proposal and typed confirmation.

| Check | Result |
|---|---:|
| AI governance tests | 12/12 |
| Config proposal policy tests | 2/2 |
| Workspace navigation tests | 3/3 |
| Mechanism rule tests | 3/3 |
| Payroll policy/calculation tests | 5/5 |
| Targeted total | 25/25 |
| TypeScript | pass |
| Next production build | pass |

No AI provider call, database, clinic runtime or browser session was used. P08-T01/T02/T03/T04 remain open in the plan until the real AI tool wiring, isolated DB and authenticated preview/approval/apply workflow are verified.
