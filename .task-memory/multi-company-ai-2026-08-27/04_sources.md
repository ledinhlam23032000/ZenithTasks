# Sources — Multi-company + AI phân cấp

| Nguồn | Vai trò | Độ tin cậy / trạng thái |
|---|---|---|
| `VERSION.md` | Phiên bản, stack, release/migration context | Cao cho repo; phải đối chiếu SHA trực tiếp |
| `web/BAN-GIAO.md` | Kiến trúc, auth, RBAC, quy ước vận hành, schema summary | Cao cho nguyên tắc; code thắng mô tả cũ |
| `ROADMAP.md` | Năng lực sản phẩm hiện có và phần còn dở | Tham chiếu; cần code/evidence xác minh |
| `.task-memory/zenithtasks-ai-governance-2026/01_plan-workspace-v4-60-tasks.md` | Kế hoạch Workspace V4 60 task | Tham chiếu gần nhất; nhiều task đang review |
| `.task-memory/zenith-review-2026-08-27/artifacts/final-handoff.md` | Kết quả audit trước, PR #53/#54/#55 | Cao cho phần đã test/merge; không thay runtime proof |
| `web/prisma/schema.prisma` | Nguồn thực thi data model | Cao |
| `web/src/lib/permissions.ts` | Nguồn duy nhất của RBAC | Cao, không tạo policy song song |
| `web/src/lib/v2-access.ts` | Project access/membership server boundary | Cao, cần audit mở rộng |
| `web/src/lib/ai-governance.ts` và `ai-governance-adapter.ts` | AI principal/capability/risk | Cao, cần mở rộng child/global orchestration |
| `web/src/app/(app)/tro-ly/agent.ts` | AI dispatcher hiện tại | Cao cho behavior code; project-local adapters còn thiếu |
| GitHub `ledinhlam23032000/ZenithTasks` master `ab86fdc` | Baseline code khi khởi tạo kế hoạch | Cao; source-of-truth hiện hành |
| Workbook `ZENITH_PLAN_DUY_NHAT_2026.xlsx` theo canonical path | Backlog E00–E09 bắt buộc | Chưa tìm thấy trong sandbox; blocker canonical |
