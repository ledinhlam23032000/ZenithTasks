# MC-13.1 credential and QA runtime checkpoint

- Master checkpoint after PR #85: QA seed/verifier/auth walkthrough now use stable role-based usernames.
- QA usernames: `admin` Global Admin; `adminduana` Project Admin A; `adminduana2` Project Admin B; `sales`; `taichinh`; `bacsi`; `viewer`; `revoked` revoked-membership sentinel.
- QA seed result: `ok=true`, `qaOnly=true`, counts 8 users, 4 projects, 7 memberships, 5 agents, 8 customers, 8 tasks.
- QA verifier result: `ok=true`, `readOnly=true`, `qaOnly=true`; 2 ACTIVE projects plus DRAFT/ARCHIVED; 2 ACTIVE child agents; 1 ACTIVE Global aggregate-only agent; all users active and `mustChangePassword=true`.
- Authenticated GET/export walkthrough with role usernames: `ok=true`; A/B customer CSV exports allowed only in matching company; foreign/viewer/DRAFT/ARCHIVED export requests denied. Evidence remains in QA worktree and contains no password.
- QA password is a stable strong secret stored only in local QA `.env`; it is never written here or printed in logs/chat. Seed enforces at least 20 chars with upper/lower/digit.
- Direct synthetic POST server-action harness remains inconclusive: actual Next server action returned 500/Connection closed in the ad-hoc request path, so it is not treated as write-denial proof. Browser was refreshed after stale action ID diagnosis; real client form test is still pending.
- QA environment: Windows worktree `C:\Users\PC\ZenithTasks-QA`, compose project `zenithqa`, app port 13000, DB port 25432; clinic checkout untouched.
