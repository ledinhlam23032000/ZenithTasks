# Project State

- **Updated:** 2026-08-28 12:00 GMT+7
- **Goal:** Xây dựng nền tảng quản lý nhiều công ty con với tài khoản/nhân viên/dữ liệu riêng, AI con theo company và AI Tổng cấp hệ thống.
- **Current phase:** MC-13.1 / MC-10 follow-up — QA credential contract, export isolation, client write-denial và Global AI observability.
- **Overall status:** active

## Completed since last checkpoint

PR #85 đã đưa QA fixture sang username cố định theo chức danh: `admin`, `adminduana`, `adminduana2`, `sales`, `taichinh`, `bacsi`, `viewer`, `revoked`. Seed vẫn idempotent, có migration mapping từ username `qa.*` cũ, yêu cầu `QA_DEMO_PASSWORD` là secret QA mạnh tối thiểu 20 ký tự có chữ hoa/chữ thường/số, và giữ `mustChangePassword=true`. QA local worktree có credential map không chứa plaintext password.

PR #86 đã thêm QA-only client write-denial harness, có guard `QA_CONFIRM=YES`, database URL mang dấu hiệu QA/test/staging và quyền ADMIN. PR #87 đã thêm Global AI observability dashboard read-only cho Admin, hiển thị counts, child/global scope, heartbeat health, allowlist và audit lifecycle tối thiểu; không hiển thị prompt/raw tenant data và không có mutation control.

## Verified facts

QA Docker độc lập `zenithqa` đang dùng DB volume/port riêng (`25432`) và app port `13000`; clinic checkout không bị sửa. Sau seed mới, kết quả là `ok=true`, `qaOnly=true`, 8 users, 4 projects, 7 memberships, 5 agents, 8 customers và 8 tasks. Read-only verifier trả `ok=true`, với 2 company ACTIVE, sentinel DRAFT/ARCHIVED, 2 child ACTIVE, 1 Global ACTIVE aggregate-only và mọi user active + mustChangePassword.

Authenticated GET/export walkthrough dùng username mới trả `ok=true`. Customer/task export của A và B chỉ trả dữ liệu project tương ứng; foreign project, viewer không đủ capability và DRAFT/ARCHIVED export đều bị deny. Đây là bằng chứng runtime trên QA, không phải production proof.

Code quality của credential wave và Global AI observability đã pass TypeScript, syntax check và Vitest 90 files/447 tests; PR #85, #86, #87 đều có CI push/pull_request xanh và đã merge. Build QA đã nhận diện route `/qa/write-denial` và route `/he-thong/ai-tong` trên source tương ứng.

## Active assumptions and safety decisions

Tài khoản QA được đặt username theo chức danh để các phiên/AI sau có thể nhận diện ổn định. Mật khẩu không dùng chuỗi tuần tự `123456789` hoặc `1234567899`; secret ổn định chỉ nằm trong `.env` của `C:\Users\PC\ZenithTasks-QA`, không đưa vào Git, chat, ledger hoặc evidence. Không dùng QA secret ở clinic/production.

Company mới vẫn DRAFT, chỉ ACTIVE nhận operational writes; ARCHIVED giữ dữ liệu/audit và chỉ archive/restore, không hard-delete. AI con chỉ được project-local read allowlist; AI Tổng chỉ aggregate/health/audit summary và không vượt RBAC, approval, audit hoặc isolation. Không triển khai migration, backup/rollback, payout thật, clinic updater hay production deploy trong wave này.

## Open blockers/questions

Browser connector đã nhiều lần timeout 504; một lần request dùng Server Action ID cũ sau recreate app và bị `Failed to find Server Action`. Sau khi refresh/relogin, browser tiếp tục mất kết nối trước khi submit được QA-only harness. Direct synthetic multipart POST cũng từng trả 500/Connection closed; vì vậy authenticated DRAFT/ARCHIVED mutation denial chưa được coi là proven. QA-only page đã được versioned để khi browser reconnect có thể submit bằng client thật.

MC-04/MC-05 vẫn PARTIAL về completeness list/detail/aggregate ngoài các case đã có. MC-07 còn thiếu mutation adapter qua preview → approval → audit. MC-09 còn thiếu child heartbeat/usage đầy đủ. MC-10 nay có observability dashboard nhưng vẫn thiếu end-to-end dispatcher proof và usage model. MC-11 message/job explicit target, timeout, retry, idempotency chưa triển khai. Payroll/accounting local, canonical workbook, clinic migration/deploy và owner approvals vẫn blocked/not started.

## Next 3 actions

1. Khi My Browser reconnect, mở `/qa/write-denial`, dùng session `admin` QA và submit bốn form customer/task trên DRAFT/ARCHIVED; kiểm tra error marker và DB counts bất biến, sau đó restore `mustChangePassword=true` nếu có toggle tạm.
2. Nếu browser vẫn unavailable, giữ MC-13.1 write-denial ở BLOCKED/PARTIAL, không nới guard; tiếp tục MC-11 bằng contract thuần code/tests cho explicit target, trace, timeout/retry/idempotency.
3. Sau mỗi wave cập nhật `07_task_ledger.md`, `06_changelog.md`, checkpoint này; chỉ mở owner gate cho migration/backup/clinic khi có approval và rollback evidence.

## Files to read first

- `.task-memory/multi-company-ai-2026-08-27/01_plan.md`
- `.task-memory/multi-company-ai-2026-08-27/03_decisions.md`
- `.task-memory/multi-company-ai-2026-08-27/05_open_questions.md`
- `.task-memory/multi-company-ai-2026-08-27/07_task_ledger.md`
- `.task-memory/multi-company-ai-2026-08-27/checks/mc13-1-credential-wave-20260828.md`
- `web/scripts/qa/README.md`
- `web/src/app/qa/write-denial/page.tsx`
- `web/src/app/(app)/he-thong/ai-tong/page.tsx`

## Quality risks

Không commit `.env`, `docker-compose.qa.yml`, credential map local hoặc runtime password. Không chạm clinic checkout, clinic DB, clinic containers, hard-delete, `db push`, `migrate reset` hoặc payout thật. Không đánh dấu MC-13/MC-11 DONE khi browser mutation evidence hoặc message/job evidence chưa có.
