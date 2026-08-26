# Workspace core deploy evidence — 2026-08-26 GMT+7

## Verified on Windows clinic checkout

| Check | Result |
|---|---|
| Local HEAD | `0f07a8e5c3656914e93b577c3d267b98f96b3158` |
| `origin/master` | `0f07a8e5c3656914e93b577c3d267b98f96b3158` |
| Updater | `windows\\Sua-Loi.bat` reached `DA XONG` and returned to wrapper |
| App container | running |
| DB container | running / healthy |
| `/login` | HTTP 200 |
| Prisma migration status | `60 migrations found`; `Database schema is up to date!` |
| Source files | Customer route and `20260826110000_workspace_core_modules` present |

The first updater attempt was safely stopped at checkout because an untracked local migration path conflicted with incoming tracked files. The hardened updater was then fetched from origin; it preserved the conflicting untracked path outside the repository, completed the Docker build, recreated the app and finished health checks. Existing local QA state/worktrees were not deleted or staged. No clinic business records are included in this evidence.

## Scope limitation

This proves deployment/runtime availability of the Customer foundation and GLOBAL AI migration. It does **not** prove a complete project app: Customer edit/soft-delete/consent/history, Appointment actions/UI, Sales/Ledger, Finance and Payroll remain open tasks. Authenticated browser walkthrough is still pending owner login.
