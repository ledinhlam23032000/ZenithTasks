# ZenithTasks AI Product Red Team

Audit scope: local runtime `http://localhost:3000`, source checkout `C:\Users\PC\ZenithTasks`, branch `claude/lucid-cori-fg136w`, commit `6a6dc88`, run on 2026-08-13.

This is an inspect-first audit. No application source, database business data, credentials, or running containers were modified. Browser evidence was collected from the public login, booking, and customer-portal surfaces. Portal evidence is not embedded here because it contained patient data.

## How to reproduce the safe checks

```powershell
Set-Location 'C:\Users\PC\ZenithTasks'
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker exec zenithtasks-app-1 sh -lc 'cd /app && npx tsc --noEmit'
docker exec zenithtasks-app-1 sh -lc 'cd /app && npx vitest run --reporter=dot'
docker exec zenithtasks-app-1 sh -lc 'cd /app && npx eslint .'
curl.exe -sS -D - -o NUL http://localhost:3000/dashboard
curl.exe -sS -D - -o NUL http://localhost:3000/media/nonexistent.jpg
curl.exe -sS -D - -o NUL http://localhost:3000/uploads/nonexistent.jpg
```

The runtime database was queried read-only. No role password was guessed, no direct server action was invoked with a real account, and no destructive workflow was executed against the live local dataset. Role-specific conclusions marked provisional require isolated test accounts and a seeded test database.

## Files

- `00-EXECUTIVE-SUMMARY.md`: verdict, score, and blockers.
- `01-PRODUCT-MAP.md`: modules, roles, routes, and main workflows.
- `02-ROLE-AUDITS.md`: the 20-persona review board.
- `03-UX-AUDIT.md`: browser and workflow UX findings.
- `04-CLINICAL-WORKFLOW-AUDIT.md`: clinical and operational workflow risks.
- `05-FINANCIAL-DATA-AUDIT.md`: money, debt, inventory, and invariant review.
- `06-SECURITY-PRIVACY-AUDIT.md`: authorization, health-data, and secret-handling review.
- `07-PERFORMANCE-AUDIT.md`: evidence, unknowns, and scale risks.
- `08-ACCESSIBILITY-AUDIT.md`: accessible markup and untested areas.
- `09-E2E-RESULTS.md`: tests and browser evidence.
- `10-ISSUES.md`: issue register with reproduction and remediation.
- `11-PRIORITY-ROADMAP.md`: release sequence.
- `12-COMMERCIAL-READINESS.md`: internal-use versus commercial product decision.
- `issues.json`: machine-readable issue register.
- `screenshots/`: login and public booking evidence; no patient portal screenshot is included.

