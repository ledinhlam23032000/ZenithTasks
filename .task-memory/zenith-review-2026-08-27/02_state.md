# Project State

- **Updated:** 2026-08-27 12:40 GMT+7
- **Goal:** Rà soát và hoàn thiện Workspace V4 của ZenithTasks bằng bằng chứng kiểm chứng.
- **Current phase:** Phase 5 — triển khai sửa chữa an toàn.
- **Overall status:** review

## Completed since last checkpoint

Đã đọc nhiệm vụ tham chiếu `qAjCYm4rq8n40cE5mdHs6x`, đặc tả Workspace V3 và kế hoạch 60 task. Đã xác định checkout Windows `C:\Users\PC\ZenithTasks` ở `5d38fc0`, chậm origin 63 commit, không có commit riêng và có untracked artifacts cần bảo toàn. Đã tạo checkout sạch origin/master ở `3bc85d1` và đọc `web/AGENTS.md`.

Đã cài dependency trong checkout audit sau khi pnpm yêu cầu phê duyệt build scripts; chỉ phê duyệt các gói liên quan Prisma/esbuild/resolver. Quality gate trên origin/master đạt: Prisma validate, Prisma generate, TypeScript, Vitest và Next production build đều exit 0. Vitest ghi nhận 83 test files và 422 tests pass.

## Verified facts

`V2_MODULES` đang đánh dấu organization, mechanism, simulation, tasks, customers, appointments, sales và finance là available; payroll vẫn `available: false`. Project routes hiện có dashboard, organization, mechanism, tasks, customers/detail, appointments, sales, finance, payroll và members. Có project-local action/UI cho Customer, Appointment, Sale, Ledger, Reconciliation, Mechanism và Payroll.

Global AI context đã được resolve cho ADMIN qua `p=__GLOBAL__`; có aggregate tool `get_workspace_overview`. Tuy nhiên planner vẫn ghi rõ tool nghiệp vụ clinic chưa có adapter project-local và agent có thể dùng các tool legacy ở Internal; đây là rủi ro scope cần test sâu.

Payroll project-local đã có create/calculate/preview/approve/second-approve/finalize/void và audit, nhưng không tự tạo payout hoặc ghi accounting/Internal payroll. Layout editor mới tạo proposal DRAFT, chưa đọc active layout, chưa apply layout vào navigation và chưa có rollback UI hoàn chỉnh. Config proposal `LAYOUT` được lưu version/audit nhưng action apply không cập nhật live layout.

Nguồn canonical workbook tại `/home/ubuntu/task-memory/zenith-upgrade-execution` không tồn tại trong sandbox; kế hoạch 60 task V4 tồn tại ở checkout Windows dưới `.task-memory/zenithtasks-ai-governance-2026/` nhưng không nằm trong origin checkout. Đây là thiếu hụt quản trị trạng thái, không được che bằng claim hoàn tất.

Đã sửa trên checkout audit: active layout được chuẩn hóa và truyền từ `ZWorkspaceConfigVersion` ACTIVE vào AppShell; project navigation sắp xếp theo layout đã áp dụng, còn lọc module available/enabled; server apply validate đủ order duy nhất; layout editor bắt đầu từ active order. Đã thêm AI workspace boundary: Internal giữ legacy actions, Global chỉ aggregate overview, Project chặn legacy read/write và không còn query staff candidates trước khi planner chạy. Đã thêm 9 assertion mới cho navigation/layout/AI boundary.

## Open blockers/questions

Chưa có authenticated Admin/Manager runtime walkthrough trong phiên này. Chưa có proof schema/migration đã chạy trên database clinic của owner. Chưa có payout/accounting integration project-local. Chưa có AI project-local business tools ngoài aggregate GLOBAL. Layout đã có đường đọc/apply ở code nhưng chưa có runtime DB evidence. Cần owner quyết định settlement payroll, deploy và authenticated walkthrough.

## Next 3 actions

1. Rà soát diff, tạo branch riêng và commit các sửa layout/AI boundary.
2. Chạy lại toàn bộ quality gate và lưu final evidence.
3. Chuẩn bị handoff cho owner: runtime walkthrough, backup, updater và quyết định payroll settlement.

## Files to read first

- `.task-memory/zenith-review-2026-08-27/00_brief.md`
- `.task-memory/zenith-review-2026-08-27/01_plan.md`
- `docs/WORKSPACE-V3-REAL-PROJECT.md`
- `web/src/app/(app)/tro-ly/agent.ts`
- `web/src/lib/v2-config-proposal-actions.ts`
- `web/src/components/v2-workspace-layout-editor.tsx`

## Quality risks

Quality gates xanh chỉ chứng minh compile/unit-level, không chứng minh isolation runtime, role walkthrough, migration trên clinic hoặc AI không rơi nhầm về Internal. Không được pull/reset checkout Windows vì có untracked QA/worktree. Không chạy `migrate dev`, `db push`, `migrate reset` hoặc test ghi/xóa trên production.
