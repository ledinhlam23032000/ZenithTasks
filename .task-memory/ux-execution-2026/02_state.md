# Project State

- Updated: 2026-08-21 GMT+7
- Goal: Hoàn thiện 35 task UX đã duyệt, loại trừ Task 11, kiểm thử từng mốc và phát hành qua PR.
- Current phase: Phase 3 đã hoàn tất; chờ CI/merge PR #40, chuẩn bị mở nhóm dependency tiếp theo.
- Overall status: active

## Completed since last checkpoint

Đã hoàn thiện nhóm task 1–9, 10, 13–15, 18–19, 21, 22, 29 và 31 trên nhánh `feat/ux-execution-1-10`. Đã tích hợp `formatAuditMeta` vào trang nhật ký và route export. Đã sửa lỗi production build do `globalSearch` bị kéo nhầm auth/Prisma/pg vào client bundle bằng server-action boundary; đồng thời thêm case workspace theo role, profile workspace Nhân sự và alias nghiệp vụ/breadcrumb.

## Verified facts

`pnpm exec tsc --noEmit`, full `pnpm test` (56 test files / 346 tests) và `pnpm build` đều pass ở phase 3; targeted tests cho case workspace/alias pass 6 tests. Task 11 vẫn bị hủy theo quyết định nghiệp vụ: không tự động áp BOM vật tư; nhân sự tự chọn và tự trừ theo ca thực tế.

## Active assumptions

Các task còn lại triển khai tuần tự theo dependency graph trong `NHIEM_VU_UX_MASTER_2026.md`. Không tự merge vào `master`; chỉ tạo PR và chờ CI/owner approval.

## Open blockers/questions

PR #40 đã tạo từ `feat/ux-execution-1-10` và đang chờ CI/merge. Task 12 vẫn chờ dependency presentation tiếp theo; các task liên quan quyền, tiền, CTV data quality và rollout cần regression test riêng.

## Next 3 actions

1. Theo dõi CI PR #40 và cập nhật trạng thái sau khi CI xanh.
2. Mở Task 12 cùng các task quyền/CTV đủ dependency trên branch tiếp theo.
3. Cập nhật ledger, evidence và PR body trước mỗi checkpoint.

## Files to read first

- `NHIEM_VU_UX_MASTER_2026.md`
- `.task-memory/ux-execution-2026/01_plan.md`
- `.task-memory/ux-execution-2026/02_state.md`
- `.task-memory/ux-execution-2026/checks/phase-1-2-quality-gate.md`
- `.task-memory/ux-execution-2026/checks/phase-3-quality-gate.md`
- `web/src/app/(app)/ho-so/[id]/page.tsx`
- `web/src/app/(app)/nhan-su/page.tsx`
- `web/src/components/layout/app-shell.tsx`

## Quality risks

Production build đã từng fail do server/client boundary; regression hiện đã pass sau sửa. Cần thêm test cho formatter audit và tiếp tục kiểm tra không đưa PII/Prisma vào Client Component.
