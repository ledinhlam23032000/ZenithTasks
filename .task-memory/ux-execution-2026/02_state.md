# Project State

- Updated: 2026-08-21 GMT+7
- Goal: Hoàn thiện 35 task UX đã duyệt, loại trừ Task 11, kiểm thử từng mốc và phát hành qua PR.
- Current phase: Phase 4 đã hoàn tất; chờ CI/merge PR #40, Task 25 cần chốt effective date trước khi đóng.
- Overall status: active

## Completed since last checkpoint

Đã hoàn thiện nhóm task 1–9, 10, 13–15, 18–19, 21, 22, 29 và 31 trên nhánh `feat/ux-execution-1-10`. Đã tích hợp `formatAuditMeta` vào trang nhật ký và route export. Đã sửa lỗi production build do `globalSearch` bị kéo nhầm auth/Prisma/pg vào client bundle bằng server-action boundary; đồng thời thêm case workspace theo role, profile workspace Nhân sự, alias nghiệp vụ/breadcrumb, readiness badges, handoff checklist, preset quyền, CTV ID/filter/portal, mobile workload quick bar và dashboard role-aware.

## Verified facts

`pnpm exec tsc --noEmit`, full `pnpm test` và `pnpm build` đều pass ở phase 4; targeted tests pass 5 files / 12 tests. Task 25 vẫn mở vì effective date promotion cần flow/test riêng. Task 11 vẫn bị hủy theo quyết định nghiệp vụ: không tự động áp BOM vật tư; nhân sự tự chọn và tự trừ theo ca thực tế.

## Active assumptions

Các task còn lại triển khai tuần tự theo dependency graph trong `NHIEM_VU_UX_MASTER_2026.md`. Không tự merge vào `master`; chỉ tạo PR và chờ CI/owner approval.

## Open blockers/questions

PR #40 đã tạo từ `feat/ux-execution-1-10` và cần chạy CI lại sau commit phase 4. Task 25 cần bổ sung effective date promotion; Tasks 16–17, 20, 32, 34–36 còn chưa triển khai.

## Next 3 actions

1. Hoàn thiện effective date + test cho Task 25.
2. Triển khai Tasks 16–17, 20, 32 và 34 theo dependency.
3. Xây ma trận QA/feature flag Tasks 35–36, rồi chạy release gate cuối.

## Files to read first

- `NHIEM_VU_UX_MASTER_2026.md`
- `.task-memory/ux-execution-2026/01_plan.md`
- `.task-memory/ux-execution-2026/02_state.md`
- `.task-memory/ux-execution-2026/checks/phase-1-2-quality-gate.md`
- `.task-memory/ux-execution-2026/checks/phase-3-quality-gate.md`
- `.task-memory/ux-execution-2026/checks/phase-4-quality-gate.md`
- `web/src/app/(app)/ho-so/[id]/page.tsx`
- `web/src/app/(app)/nhan-su/page.tsx`
- `web/src/components/layout/app-shell.tsx`

## Quality risks

Production build đã từng fail do server/client boundary; regression hiện đã pass sau sửa. Cần thêm test cho formatter audit và tiếp tục kiểm tra không đưa PII/Prisma vào Client Component.
