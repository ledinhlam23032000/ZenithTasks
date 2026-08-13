# E2E and runtime results

## Automated checks in the running image

| Check | Result |
|---|---|
| TypeScript `npx tsc --noEmit` | PASS |
| Vitest `npx vitest run --reporter=dot` | PASS: 33 files, 233 tests |
| ESLint | FAIL: 11 errors, 1 warning |
| Repository build rerun | NOT RUN; current container is already a production runtime |
| Playwright/Cypress package | NOT PRESENT in `web/package.json` |

## Browser checks

| Check | Result |
|---|---|
| `/login` | 200; labeled login UI rendered |
| `/dat-lich` desktop | 200; form rendered |
| `/dat-lich` mobile 390px | 200; no horizontal overflow observed |
| Invalid phone | Error shown, but previously entered fields cleared |
| `/dashboard` without session | 307 to `/login?next=%2Fdashboard` |
| `/media/nonexistent.jpg` without session | 401 |
| `/uploads/nonexistent.jpg` without session | 401 |
| `/api/webhooks/zalo` GET | 200 public endpoint |
| `/api/integrations/zalo/connect` without session | 307 to `/login` |
| Customer portal | Rendered through a local bearer token; patient data withheld from report |

## ESLint failures

The failures include `Date.now()` during render and setState-in-effect patterns in the customer portal, care, plan, permission editor, portal-link, and route-progress components, plus one unused import warning. This is a release-quality signal: a green typecheck/unit suite does not compensate for a red lint gate.

## Missing regression suite

Implement an isolated Playwright suite with role accounts and seeded data for public booking, reception intake, clinical case, inventory reversal, debt/payment, portal, media authorization, and permission escalation. Do not seed or test against the live local patient dataset.

