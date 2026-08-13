# Clinical workflow audit

## Scope and safety

The application handles treatment records, health fields, photos, documents, appointments, and payments. This audit evaluates workflow safety and data boundaries; it is not a clinical or legal certification.

## Scenario review

| Scenario | Result | Evidence / gap |
|---|---|---|
| A. New patient end-to-end | Partial | Public booking works; role-to-role continuation was not run without isolated role accounts. |
| B. Returning patient | Partial | Customer/case model supports it; duplicate/identity UX needs seeded E2E. |
| C. Multiple treatment cases | Partial | Customer page renders multiple cases; child action ownership is unsafe. |
| D. Debt patient | Partial | Debt and payment modules exist; debt-plan action checks case existence but not positive debt. |
| E. Reschedule/cancel | Partial | Portal reschedule request exists; repeated/cross-role behavior needs E2E. |
| F. Duplicate customer | Partial | Phone hash duplicate check exists for edits; complete intake behavior needs E2E. |
| G. Concurrent edits | Not run | No browser concurrency suite. Case lock exists in some flows but not sufficient for child ownership. |
| H. Double payment | Not run | Unit coverage exists around case math; browser/idempotency behavior remains unproven. |
| I. Direct unauthorized server action | Static finding | Server actions use capability checks, but child record ownership checks are incomplete. |
| J. Customer portal | Browser-tested | Portal content rendered; patient evidence withheld from report. |
| K. Omnichannel inbox | Not run | External integrations were not contacted. |
| L. Low/out-of-stock material | Static finding | BOM path can decrement below zero. |
| M. Refund/case deletion after payment | Gap/risk | Deletion and inventory reversal need explicit business policy and transactional implementation. |

## Clinical safety priorities

- Do not show full medical history, contraindications, or clinical photos to roles that only need reception/marketing information.
- Make the treatment case the authoritative parent for every service, usage, photo, document, and follow-up mutation.
- Add an immutable event trail for changes to allergies, contraindications, clinical history, service quantity, and treatment photos.
- Make inventory consumption idempotent and reversible before using the system as a source of operational truth.
- Separate “clinical alert” from “full clinical record” so the minimum safety signal can be available without broad disclosure.

