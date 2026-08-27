# Project State

- **Updated:** 2026-08-27 14:25 GMT+7
- **Goal:** Xây dựng nền tảng quản lý nhiều công ty con với tài khoản/nhân viên/dữ liệu riêng, AI con theo công ty và AI Tổng cấp hệ thống.
- **Current phase:** Phase 2 — tenant/account/membership và AI hierarchy contract.
- **Overall status:** active

## Completed since last checkpoint

Đã ghi nhận yêu cầu mới về AI phân cấp: mỗi company có AI con riêng; AI Tổng kiểm soát tổng quan tất cả company và AI con. Đã đọc quy trình long-task-memory, zenith-long-execution, canonical paths và safety/done. Đã reset checkout audit về `origin/master` `ab86fdc`, đọc `VERSION.md`, `web/AGENTS.md`, `web/BAN-GIAO.md`, `ROADMAP.md` và kế hoạch Workspace V4 60 task. Workbook canonical theo đường dẫn quy định chưa tồn tại trong sandbox.

Đã khởi tạo bộ nhớ mới tại `.task-memory/multi-company-ai-2026-08-27/` với brief, plan, state, decisions, open questions, sources và inventory/ADR; mọi trạng thái quan trọng của chương trình mới phải ghi tại đây. MC-00 và MC-01 đã hoàn tất ở mức R0. MC-02 đã có code trên branch `agent/mc-02-tenant-lifecycle-20260827`: tạo company ở DRAFT, activate/archive/restore có Admin + audit, archived bị chặn vận hành, domain writes yêu cầu ACTIVE. Full gate MC-02 pass và đã merge PR #56 thành master `98c62c1`. MC-03 đã có code trên branch `agent/mc-03-company-accounts-20260827`: account company-local role `COLLABORATOR`, first-login password change, membership preset/capability, Project Admin member management, server-side active-only writes và navigation filtering. Full gate MC-03 pass và đã merge PR #57 thành master `6e2efa8`. Phase 2 contract đã hoàn tất ở mức code/CI; runtime isolation vẫn mở.

## Verified facts

Mã nguồn hiện đã có `ZProject`, project membership, project-local models/actions/UI nền tảng, AI workspace context `INTERNAL/PROJECT/GLOBAL`, selector Global/project và server boundary fail-closed vừa merge. MC-02 chặn company DRAFT/ARCHIVED khỏi action vận hành; MC-03 thêm account/membership/capability boundary và menu theo preset. Full quality gate local/CI pass cho hai wave. Kế hoạch V4 hiện phân loại phần lớn Workspace task là `review`, chưa đạt DB fixture isolation/authenticated walkthrough đầy đủ. Payroll project-local chưa có payout/accounting local. Xóa cứng company vẫn bị khóa; hiện mới có archive/restore code-level.

## Active assumptions

Mặc định công ty con là tenant logic trong cùng hệ thống PostgreSQL, mỗi record nghiệp vụ phải có projectId hoặc quan hệ không thể suy diễn chéo. Tài khoản người dùng là identity cấp hệ thống; membership mới quyết định quyền trong từng company. AI con là agent profile/config/tool allowlist theo project, không phải một tài khoản vượt RBAC. AI Tổng chỉ có Global aggregate/observability và điều phối có trace, không tự bypass approval.

## Decisions made

Ưu tiên soft-delete/archive/restore, không hard-delete mặc định. Không triển khai R3 (xóa, quyền, payroll, migration, production) nếu thiếu backup/rollback/audit/owner approval. Không gọi AI child “đã xong” nếu chưa có tool/data isolation test. Không dùng workbook cũ hoặc tên mã ngoài canonical làm backlog mới nếu chưa crosswalk.

## Open blockers/questions

Cần phục hồi workbook `ZENITH_PLAN_DUY_NHAT_2026.xlsx` hoặc owner xác nhận kế hoạch V4 trong repo là canonical tạm thời. Cần chốt company schema/lifecycle, membership invite/revoke, role/capability model, chính sách AI Tổng được xem dữ liệu nào, AI child có được tạo approval hay chỉ đề xuất, retention/cost/LLM provider, hard-delete hay chỉ archive. Cần owner gate cho migration, backup, clinic updater và authenticated walkthrough.

## Next 3 actions

1. Mở branch MC-04/MC-05 cho synthetic two-company isolation và context resolver integration.
2. Chạy test foreign URL, revoked membership, capability preset và aggregate/export boundary trên QA data không PII.
3. Chỉ sau isolation gate pass mới mở AI child profile/tool registry và AI Tổng control-plane; chưa chạy migration/clinic walkthrough.

## Files to read first

- `.task-memory/multi-company-ai-2026-08-27/01_plan.md`
- `.task-memory/multi-company-ai-2026-08-27/03_decisions.md`
- `.task-memory/multi-company-ai-2026-08-27/05_open_questions.md`
- `.task-memory/zenithtasks-ai-governance-2026/01_plan-workspace-v4-60-tasks.md`
- `web/prisma/schema.prisma`
- `web/src/lib/v2-access.ts`
- `web/src/lib/ai-governance.ts`

## Quality risks

Project build xanh không chứng minh tenant isolation, revoked membership, AI child/global scope, xóa/restore hay production migration. Không chạm checkout Windows clinic, không đọc secret, không reset DB/volume, không ghi/xóa dữ liệu thật trong phase thiết kế.
