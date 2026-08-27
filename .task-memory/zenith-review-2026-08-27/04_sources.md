# Sources — Audit 2026-08-27

| Nguồn | Vai trò | Độ tin cậy | Ghi chú |
|---|---|---|---|
| `docs/WORKSPACE-V3-REAL-PROJECT.md` | Đặc tả sản phẩm và acceptance Workspace | Cao cho mục tiêu, không đủ cho runtime | Có yêu cầu tách Internal/Project, Global Admin AI, layout, payroll, isolation và deploy gates |
| Kế hoạch 60 task trong nhiệm vụ tham chiếu `qAjCYm4rq8n40cE5mdHs6x` | Backlog/acceptance lịch sử gần nhất | Cao cho truy vết, cần đối chiếu code | Nhiều trạng thái cũ đã lỗi thời so với origin/master |
| `web/src/lib/v2-workspace-navigation.ts` | Code navigation/layout resolver | Cao cho hành vi code | Đã cập nhật trong master `1bfb80f` qua PR #53 |
| `web/src/app/(app)/layout.tsx` | Server loader workspace options | Cao cho data flow code | Đọc LAYOUT ACTIVE nhưng chưa có DB runtime proof |
| `web/src/lib/v2-config-proposal-actions.ts` | Server validation/apply config | Cao cho behavior code | Đã validate full layout order; không tự cấp quyền |
| `web/src/app/(app)/tro-ly/agent.ts` | AI workspace resolution/dispatcher | Cao cho behavior code | Đã fail closed ngoài Internal; project-local adapters vẫn thiếu |
| `web/src/lib/v2-payroll-actions.ts`, `v2-payroll-governance-actions.ts` | Payroll calculation/governance | Cao cho behavior code | Không payout/accounting local |
| `web/prisma/schema.prisma` và migrations `20260826*` | Data model/migration intent | Cao cho schema | Chưa chứng minh đã deploy trên clinic DB |
| `audit-evidence/demo-guard-full-vitest.log` | Regression evidence | Cao cho run local | 85 files/429 tests pass |
| CI của PR #53 và #54 | Independent build/test check | Cao cho CI | Both successful |
| Checkout Windows `C:\Users\PC\ZenithTasks` | Release state | Cao cho local git state | HEAD cũ, behind 63, untracked artifacts; chưa đụng vào |
