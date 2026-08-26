# Project config proposal sandbox evidence — 2026-08-26

Added additive `ZWorkspaceConfigProposal` with explicit `projectId`, `targetScope=PROJECT`, module/config key, risk level, capability, before/after JSON, rollback version link and creator/approver/applier timestamps. Added migration `20260826180000_workspace_config_proposals`; legacy clinic tables are untouched.

Admin-only actions now provide separate DRAFT creation, APPROVE, APPLY and REJECT stages. APPLY requires an APPROVED proposal, explicit PROJECT target and typed `APPLY`; it creates a new ACTIVE `ZWorkspaceConfigVersion`, supersedes the previous active version, updates only the project-local config, links rollback version and writes audit. L5 and invalid JSON/config are fail-closed. The dashboard shows the before/after proposal preview and never offers a one-step apply.

| Check | Result |
|---|---:|
| Prisma validate/generate | pass |
| Config proposal policy tests | 2/2 |
| Workspace/mechanism/payroll/AI targeted tests | 22/22 before proposal policy addition |
| Final targeted total | 24/24 |
| TypeScript | pass |
| Next production build | pass |

No AI provider call, database runtime, clinic data or browser session was used. P08-T03/T04 remain `not_started` in the plan until AI-originated proposal integration and authenticated/isolated approval/apply evidence are completed; this is a project-local governance foundation only.
