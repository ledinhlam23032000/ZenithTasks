# Performance audit

## Evidence

- Public login and booking pages returned successfully from the local runtime.
- No production-like benchmark was run because the local dataset is small and no browser performance harness is installed in the repository.
- The package has Vitest but no Playwright/Cypress dependency or E2E performance scenario.
- No claim is made here about Core Web Vitals or 10k/100k-customer behavior.

## Risks to investigate

1. Customer detail pages load cases, services, photos, care messages, appointments, and follow-ups together; test with long histories and paginate where appropriate.
2. Reports and analytics should be profiled with indexes and date-window limits before multi-year use.
3. Media is written under `public/uploads`; production storage, backup, cleanup, and image transformation need a documented strategy.
4. In-memory rate limits are not reliable across replicas.
5. Browser E2E should record page transition time and server-action latency for the reception and doctor critical paths.

## Required benchmark matrix

Run isolated seeded datasets at 1k, 10k, and 100k customers, with treatment/payment/care history. Measure p50/p95 route time, query count, payload size, memory, and concurrent mutation behavior. Do not use the live patient dataset for load tests.

