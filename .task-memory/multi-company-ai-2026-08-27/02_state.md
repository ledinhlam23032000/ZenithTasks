# Project State

- **Updated:** 2026-08-28 00:40 GMT+7
- **Goal:** Xây dựng nền tảng quản lý nhiều công ty con với tài khoản/nhân viên/dữ liệu riêng, AI con theo công ty và AI Tổng cấp hệ thống.
- **Current phase:** Phase 4 — checkpoint sau khi hoàn tất QA seed/verifier/authenticated route evidence; chuẩn bị mở MC-13.1.
- **Overall status:** active

## Completed since last checkpoint

Đã hoàn tất một wave authenticated QA độc lập cho tenant route isolation. QA image được rebuild/recreate; script versioned hiện diện trong `/app/scripts/qa/`; app báo 68 migrations và không có pending migration. Guarded seed, read-only verifier và authenticated GET-only walkthrough chạy theo đúng thứ tự và đều pass. PR #75 đã merge walkthrough checker; PR #76 đã merge tài liệu semantics ForbiddenPage.

## Verified facts

Mã nguồn và QA evidence hiện có: `ZProject`/membership/project-local models; server-side `requireProjectAccess/Capability/Module`; AI context/policy/runtime resolver; `ZAiAgent` CHILD/GLOBAL lifecycle; ba project-local read tools. QA verifier pass với 7 users, 4 projects (2 ACTIVE + DRAFT/ARCHIVED), 6 memberships, 8 customers, 8 tasks, 2 ACTIVE child agents và 1 ACTIVE Global agent aggregate-only. Auth walkthrough pass: local A/B, foreign URL, revoked member, DRAFT/ARCHIVED, Sales-vs-Finance và Viewer-vs-Customer. Đây là bằng chứng DB-backed authenticated route/body isolation trên QA, chưa phải production proof. Export/list-detail/aggregate completeness, authenticated server-action write denial, AI dispatcher/message-job, payroll settlement, migration/backup/deploy vẫn chưa đạt. Xóa cứng company vẫn bị khóa; chỉ archive/restore.

## Active assumptions

Mặc định công ty con là tenant logic trong cùng hệ thống PostgreSQL, mỗi record nghiệp vụ phải có `projectId` hoặc quan hệ không thể suy diễn chéo. Tài khoản người dùng là identity cấp hệ thống; membership mới quyết định quyền trong từng company. AI con là agent profile/config/tool allowlist theo project, không phải một tài khoản vượt RBAC. AI Tổng chỉ có Global aggregate/observability và điều phối có trace, không tự bypass approval.

## Decisions made

Ưu tiên soft-delete/archive/restore, không hard-delete mặc định. Không triển khai R3 (xóa, quyền, payroll, migration, production) nếu thiếu backup/rollback/audit/owner approval. Không gọi AI child “đã xong” nếu chưa có tool/data isolation test. Không dùng workbook cũ hoặc tên mã ngoài canonical làm backlog mới nếu chưa crosswalk.

## Open blockers/questions

Cần phục hồi workbook `ZENITH_PLAN_DUY_NHAT_2026.xlsx` hoặc owner xác nhận kế hoạch V4 trong repo là canonical tạm thời. Cần chốt invite email, multi-company UX hoàn chỉnh, chính sách AI Tổng raw-data, child mutation/approval, retention/cost/LLM provider, hard-delete hay chỉ archive. Cần owner gate cho migration, backup, clinic updater và production authenticated walkthrough.

## Next 3 actions

1. Giữ QA stack độc lập và evidence v3/v8; không đưa `.env`, compose override hoặc password vào Git/log.
2. Mở MC-13.1: bổ sung export isolation, list/detail/aggregate route checks và authenticated DRAFT/ARCHIVED server-action write denial có rollback-safe fixture.
3. Sau MC-13.1 mới thiết kế MC-11 AI Tổng message/job explicit target, timeout/retry/idempotency; giữ MC-14/15/16 blocked theo owner gate.

## Files to read first

- `.task-memory/multi-company-ai-2026-08-27/01_plan.md`
- `.task-memory/multi-company-ai-2026-08-27/03_decisions.md`
- `.task-memory/multi-company-ai-2026-08-27/05_open_questions.md`
- `.task-memory/multi-company-ai-2026-08-27/07_task_ledger.md`
- `.task-memory/multi-company-ai-2026-08-27/checks/mc13-auth-runtime-20260828.md`
- `web/scripts/qa/README.md`
- `web/src/lib/v2-access.ts`

## Quality risks

Không chạm checkout Windows clinic; QA dùng volume/port riêng. Không ghi secret vào evidence; seed là idempotent, verifier read-only, walkthrough GET-only. Chưa reset DB/volume, chưa migrate clinic, chưa payout thật, chưa hard-delete. Workbook `ZENITH_PLAN_DUY_NHAT_2026.xlsx` vẫn chưa có trong sandbox; kế hoạch Workspace V4/crosswalk MC là tham chiếu tạm thời, không thay thế canonical E00–E09.
