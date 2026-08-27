# Ma trận rà soát mục tiêu đầu cuộc trò chuyện

**Ngày rà soát:** 2026-08-27 GMT+7  
**Baseline:** repository `master` trước checkpoint hiện tại là `e453d12`; nhánh làm việc hiện tại `agent/mem-01-checkpoint-20260827`.  
**Nguyên tắc:** `DONE` chỉ dùng khi có output, acceptance, check/evidence và reviewer/owner gate phù hợp. Build/unit test xanh không tự chứng minh runtime isolation hoặc production readiness.

## Kết luận ngắn

Mục tiêu sản phẩm đã được **triển khai theo từng lớp**, nhưng **chưa đạt trạng thái vận hành hoàn chỉnh**. Phần company lifecycle, company-local account/membership, server-side tenant boundary, AI child/global registry, agent policy/runtime resolver và ba project-local AI read tools đã có code và CI/local gate. Tuy nhiên, bằng chứng DB-backed authenticated giữa hai company chưa chạy; AI Tổng chưa có cơ chế điều phối child bằng message/job có trace/timeout/idempotency; payroll settlement, migration/backup/deploy và owner walkthrough chưa được phép đóng.

## Ma trận mục tiêu

| Mục tiêu người dùng | Trạng thái hiện tại | Đã triển khai được | Chưa đạt / không được tuyên bố | Evidence chính | Task tiếp theo |
|---|---|---|---|---|---|
| Cập nhật và test lại toàn bộ dự án | `PARTIAL` | Các wave MC-02..MC-12 đã có PR riêng; CI và các local gate đã pass theo wave. Có task ledger/checkpoint để theo dõi. | Chưa có một acceptance test runtime end-to-end cho toàn bộ mục tiêu; một số log cũ còn untracked và workbook canonical chưa có. | PR #56–#66; `07_task_ledger.md`; `01_plan.md` | Chạy MC-13 authenticated walkthrough trên DB QA cô lập |
| Có thể tạo nhiều công ty con/workspace | `PARTIAL → code-level đạt` | Tạo company mới ở `DRAFT`; có activate/archive/restore; chỉ company `ACTIVE` nhận domain writes; module flags/config theo company. | Chưa có DB runtime proof trên hai company; chưa có dependency preview cho hard delete. | `v2-project-actions.ts`; PR #56; `v2-project-lifecycle.test.ts` | Seed QA và chứng minh DRAFT/ARCHIVED writes bị chặn |
| Mỗi company có tài khoản/nhân viên riêng | `PARTIAL → code-level đạt` | Global `User` identity kết hợp `ZProjectMember`; Admin tạo account company-local, role global là `COLLABORATOR`, preset/capability theo company, buộc đổi mật khẩu lần đầu; revoke/reactivate giữ history. | Chưa có authenticated Admin/Manager/employee walkthrough; chưa chốt invite email, multi-company UX hoàn chỉnh và employee profile riêng ngoài membership. | `v2-member-actions.ts`; PR #57; `v2-project-capabilities.ts` | Dùng QA roles A/B và kiểm tra revoked membership |
| Dữ liệu company không chéo nhau | `PARTIAL` | Server-side `requireProjectAccess/Capability/Module`, direct URL guards, active-only write, projectId query pattern, pure two-company fixture. | Chưa có DB-backed list/detail/aggregate/export/direct foreign URL/revoked membership evidence. | PR #58/#61; `v2-access.ts`; `v2-tenant-qa-fixture.test.ts` | MC-12/MC-13 runtime evidence |
| Company có quyền/module riêng | `PARTIAL → code-level đạt` | Preset PROJECT_ADMIN/SALES/FINANCE/INVENTORY/VIEWER, capability/module filtering, config manage boundary, direct URL guard. | Chưa có authenticated walkthrough chứng minh UI + server action cùng deny theo từng role trong DB. | PR #57–#59; `v2-project-capabilities.test.ts` | Walkthrough roles Sales A, Finance A, Viewer B |
| Có thể xóa company tạo sai/không cần | `SAFE PARTIAL` | Có archive/soft lifecycle, giữ dữ liệu/audit, restore; hard delete không được cung cấp và không tự động hóa. | Chưa có hard delete; chưa có dependency preview/backup/rollback drill cho hard delete. Đây là chủ ý an toàn, không phải thiếu sót cần mở ngay. | PR #56; `v2-project-actions.ts`; D-05 | Owner quyết định riêng nếu muốn mở R3 hard-delete |
| AI con trong phạm vi company | `PARTIAL` | `ZAiAgent` CHILD có projectId/status/allowlist; create DRAFT, activate/suspend/archive; runtime resolve ACTIVE agent; conversation/approval lưu agentId; read tools overview/customers/tasks khóa projectId. | Chưa có DB-backed child AI walkthrough; chưa có health/heartbeat orchestration; chưa có project-local mutation/approval adapter; chưa chứng minh chống foreign/Internal bằng authenticated evidence. | PR #60/#62/#63/#64; `v2-ai-agent-policy.ts`; `v2-ai-agent-runtime.ts` | MC-13 child AI runtime test; sau đó MC-11 message/job |
| Có một AI Tổng kiểm soát company và AI con | `PARTIAL / control-plane only` | GLOBAL agent registry/lifecycle; Global selector; Global aggregate `get_workspace_overview`; ADMIN-only/explicit target policy; allowlist hẹp. | Chưa có child health/usage/audit summary đầy đủ; chưa có command/job tới child, trace source/result, timeout/retry/idempotency; không được gọi là “kiểm soát hoàn chỉnh”. | PR #60/#62/#63; `ai-governance.ts`; D-04 | MC-10/MC-11 bounded control plane |
| Phần mềm vận hành trơn tru | `NOT_READY_FOR_PRODUCTION` | Nền tảng code-level đã có nhiều guard và CI. | Thiếu runtime DB evidence, migration/backup/rollback proof, payroll local settlement, authenticated walkthrough, deploy/health proof. | `07_task_ledger.md`; `02_state.md` | Hoàn thành gates theo dependency, không deploy clinic lúc này |
| Có cơ chế tự kiểm tra nhiệm vụ khi context dài | `DONE (process)` | Task ledger MC-00..MC-16, checkpoint protocol, state/plan/changelog; status/dependency/evidence/blocker/next action. | Workbook canonical `ZENITH_PLAN_DUY_NHAT_2026.xlsx` vẫn chưa có; ledger MC là crosswalk tạm thời, không thay thế canonical E00–E09. | PR #66; `07_task_ledger.md`; `01_plan.md` | Phục hồi workbook hoặc owner xác nhận crosswalk |

## Quyết định an toàn đang có hiệu lực

> Company “xóa” hiện nghĩa là **archive/soft-delete + restore**, không phải xóa vĩnh viễn. Hard-delete chỉ được xem xét như task R3 riêng sau owner approval, dependency preview, backup, audit và rollback drill.

> AI hierarchy hiện là **control-plane + runtime fail-closed + project-local read subset**, chưa phải AI Tổng được phép tự do điều phối hoặc truy cập raw data tất cả company.

> Chưa thực hiện migration trên clinic DB, chưa reset/db push, chưa chạy payroll payment thật và chưa deploy updater Windows.

## Gate mở khóa kế tiếp

| Gate | Điều kiện tối thiểu | Hiện trạng |
|---|---|---|
| DB QA | Owner cung cấp PostgreSQL cô lập và `QA_DATABASE_URL` | `BLOCKED` — sandbox không có URL |
| Auth walkthrough | Có test account/session cho Global Admin, Project Admin A/B, Sales A, Finance A, Viewer B và revoked member | `NOT_STARTED` |
| Isolation runtime | Foreign URL, revoked membership, DRAFT/ARCHIVED writes, export/list/detail/aggregate và AI scope đều có artifact | `NOT_STARTED` |
| AI Tổng orchestration | Explicit target, child policy re-check, trace, timeout, retry/idempotency, no raw-data default | `NOT_STARTED` |
| Migration/deploy | Additive migration, backup, rollback, owner approval, clinic health check | `BLOCKED_OWNER_GATE` |

## Kết luận acceptance

Tại checkpoint này, chỉ nên đánh dấu **đã đạt code-level foundation và automated CI gates**. Không nên nói “mọi thứ đã hoàn tất”, “AI Tổng đã kiểm soát đầy đủ”, “đã test runtime hai company”, hoặc “company đã xóa vĩnh viễn được”.
