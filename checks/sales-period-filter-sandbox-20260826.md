# Sales period filter sandbox evidence — 2026-08-26

Added URL-scoped `from`/`to` date filtering to the project-local Sales page. The query applies the period only to `ZWorkspaceSale.occurredAt` under the verified project ID, and the aggregate cards and transaction table use the same scoped result set. The page makes clear whether the aggregate is for the selected period or all local transactions and provides a reset link.

Verification passed with direct TypeScript, targeted Vitest 14/14 and Next production build. P04-T05 remains `review`: period filter and local aggregates now exist, but authenticated runtime walkthrough and broader dashboard regression are still open. No clinic database or browser session was used.
