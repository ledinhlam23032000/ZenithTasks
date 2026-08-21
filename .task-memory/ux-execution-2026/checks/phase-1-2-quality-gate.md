# Quality gate — UX phase search/reception/case/payment/inbox

- Date: 2026-08-21
- Branch: `feat/ux-execution-1-10`
- Scope: Tasks 1–9, 13–15, 18–19, 21, 31; Task 11 remains cancelled.

## Checks

- `pnpm exec tsc --noEmit`: PASS.
- `pnpm test`: PASS; 55 test files and 340 tests passed after dependency build approval. See `/tmp/ux-final-test.log` in the execution sandbox for the final run log.
- `pnpm build`: PASS after marking `web/src/lib/search-actions.ts` with the server-action boundary. The first build attempt exposed an actual client/server import boundary issue; it was fixed and the second production build compiled, typechecked, generated static pages, and finalized route optimization successfully. See `/tmp/ux-production-build2.log` for the run log.
- `git diff --check`: PASS.

## Notes

The build failure was not hidden: `command-palette.tsx` imported `globalSearch` without a server-action boundary, which pulled `next/headers`, Prisma and `pg` into the client bundle. Adding the module-level `use server` directive kept the search query permission-aware on the server and restored a clean production build.

The shared `formatAuditMeta` formatter is now used by both the audit page and audit export route. It formats amount/code/status/identity fields without exposing nested JSON payloads.
