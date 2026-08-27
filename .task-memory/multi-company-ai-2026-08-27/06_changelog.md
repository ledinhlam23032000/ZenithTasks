# Changelog — Multi-company + AI phân cấp

| Thời điểm | Sự kiện | Evidence |
|---|---|---|
| 2026-08-27 13:15 GMT+7 | Owner yêu cầu xây phần mềm quản lý nhiều công ty con vận hành trơn tru. | Conversation |
| 2026-08-27 13:16 GMT+7 | Owner bổ sung kiến trúc bắt buộc: mỗi company có AI con theo quyền; một AI Tổng kiểm soát company và AI con. | Conversation |
| 2026-08-27 13:18 GMT+7 | Đọc skills long-task-memory và zenith-long-execution; kiểm tra canonical path. Workbook bắt buộc chưa tìm thấy trong sandbox. | `02_state.md`, tool output |
| 2026-08-27 13:19 GMT+7 | Reset checkout audit về `origin/master` `ab86fdc`; đọc VERSION, BAN-GIAO, ROADMAP và kế hoạch Workspace V4 60 task. | `04_sources.md` |
| 2026-08-27 13:20 GMT+7 | Khởi tạo brief/plan/state/decisions/open questions/sources cho chương trình multi-company. | Thư mục này |
| 2026-08-27 15:05 GMT+7 | Merge PR #60 `feat: add guarded AI agent hierarchy foundation`: registry `ZAiAgent`, lifecycle, UI và schema additive chưa migration. | PR #60, commit `8d1bcdc`, `checks/ai-release-summary.txt` |
| 2026-08-27 15:20 GMT+7 | Merge PR #61 `test: add two-company tenant isolation fixture`: fixture non-PII/pure contract cho A/B, DRAFT/ARCHIVED, memberships/presets, visibility/export/direct URL/write gates. | PR #61, commit `fde2e6a`, `checks/mc12-full-summary.txt` |
| 2026-08-27 15:28 GMT+7 | Merge PR #62 `test: define fail-closed AI agent policy`: CHILD/GLOBAL status, scope, membership/capability, explicit target, allowlist. | PR #62, commit `6b14846`, `checks/ai-policy-summary.txt` |
| 2026-08-27 15:42 GMT+7 | Merge PR #63 `feat: enforce AI agent runtime scope`: agentId vào conversation/approval/metadata; runtime ACTIVE agent resolver; project workspace auth không nới Internal AI. | PR #63, commit `0e25f8e`, `checks/ai-runtime-release-summary.txt` |
| 2026-08-27 16:00 GMT+7 | Merge PR #64 `feat: add scoped project AI read tools`: overview/customers/tasks project-local, query khóa projectId và boundary regression. | PR #64, commit `2456982`, `checks/mc07-ai-read-full-summary.txt` |
| 2026-08-27 16:05 GMT+7 | Còn thiếu authenticated DB-backed two-company walkthrough, project-local mutation tools, message/job orchestration, additive migration/backup/deploy proof; không đánh dấu chương trình hoàn tất. | `05_open_questions.md`, `01_plan.md` |
