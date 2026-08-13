# Security and privacy audit

## Good controls observed

- JWT session is httpOnly with same-site behavior and production secure flag.
- Unauthenticated `/dashboard` redirects to login; unauthenticated `/media/*` and `/uploads/*` returned 401.
- Phone full reveal is capability-gated and audit-logged.
- Filename validation and HMAC media tokens exist.
- Headers include CSP, HSTS, `X-Frame-Options`, `nosniff`, referrer policy, and permissions policy.

## High-priority findings

### Media route has session-level, not record-level, authorization

`web/src/app/media/[file]/route.ts` accepts any valid session after the session check and then serves a file by filename. It does not verify that the current user can access the case/customer owning that file. The `/uploads/*` proxy gate is likewise a session gate. A leaked/guessed filename can therefore cross clinical boundaries once an attacker has any account.

### Child server actions allow mismatched parent IDs

`removeCaseService`, `updateCaseService`, `removeMaterial`, `updateMaterialUsage`, `deletePhoto`, `deleteCaseDocument`, and follow-up mutations accept a child ID while locking only a separately supplied case ID. The action should verify the actual relation before any mutation. This is a horizontal authorization/data-integrity risk.

### Shareholder/customer view boundary is too broad

`SHAREHOLDER` appears in the customer module permission set, while `khach-hang/[id]/page.tsx` renders `MedicalAlert`, case details, treatment photos, care messages, and financial totals without a clinical-data capability check. If shareholders are intended to be view-only investors, they still need a minimized management view, not the full health record.

### Non-clinical roles can edit sensitive health fields

`khach-hang/actions.ts` permits ADMIN, MANAGER, RECEPTION, and TELESALE to update `allergies`, `medicalHistory`, and `contraindications`. At minimum this needs a separate clinical capability, change audit, and a product decision about which non-clinical roles may write each field.

### Photo association is trusted from two form fields

`uploadPhoto` accepts `caseId` and `customerId` independently and creates the photo with both values without first proving that the case belongs to the customer. This can mis-associate sensitive images and should be rejected at the server boundary.

## Hardening and operational gaps

- Rate limiting is in-memory; restart or multiple replicas reset the counters.
- CSP allows `unsafe-inline` and `unsafe-eval`, which weakens XSS defense-in-depth.
- `X-Powered-By: Next.js` is exposed; low severity but easy to remove.
- The runtime container environment includes integration secrets, and an untracked `PHONE_ENC_KEY-20260629-122122.txt` exists in the source checkout. Values were not read or reproduced. Move secrets to managed runtime configuration and ensure key material cannot be committed or accidentally packaged.
- Portal bearer links expose sensitive content without account login; use short expiry, explicit revocation, access logging, and record-scoped media tokens.

