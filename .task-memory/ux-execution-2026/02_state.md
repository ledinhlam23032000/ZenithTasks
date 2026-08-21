# Project State

- Updated: 2026-08-21 GMT+7
- Goal: Hoàn thiện 35 task UX đã duyệt, loại trừ Task 11, kiểm thử từng mốc và phát hành qua PR.
- Current phase: Chốt nhóm UX đầu tiên và chuẩn bị PR.
- Overall status: active

## Completed since last checkpoint

Đã hoàn thiện nhóm task 1–9, 13–15, 18–19, 21 và 31 trên nhánh `feat/ux-execution-1-10`. Đã tích hợp `formatAuditMeta` vào trang nhật ký và route export. Đã sửa lỗi production build do `globalSearch` bị kéo nhầm auth/Prisma/pg vào client bundle bằng server-action boundary.

## Verified facts

`pnpm exec tsc --noEmit`, full `pnpm test` và `pnpm build` đều pass sau sửa boundary. Task 11 vẫn bị hủy theo quyết định nghiệp vụ: không tự động áp BOM vật tư; nhân sự tự chọn và tự trừ theo ca thực tế.

## Active assumptions

Các task còn lại triển khai tuần tự theo dependency graph trong `NHIEM_VU_UX_MASTER_2026.md`. Không tự merge vào `master`; chỉ tạo PR và chờ CI/owner approval.

## Open blockers/questions

Chưa tạo commit/PR cho nhánh phase hiện tại. Các task 10, 22 và 29 là nhóm mở khóa tiếp theo; task 12 chờ task 10. Các task liên quan quyền, tiền, CTV data quality và rollout cần regression test riêng.

## Next 3 actions

1. Chạy `git diff --check`, cập nhật master/ledger và commit nhóm task đầu tiên.
2. Push `feat/ux-execution-1-10`, tạo PR và kiểm tra CI.
3. Sau checkpoint PR, triển khai Task 10, Task 22 và Task 29 theo thứ tự an toàn.

## Files to read first

- `NHIEM_VU_UX_MASTER_2026.md`
- `.task-memory/ux-execution-2026/01_plan.md`
- `.task-memory/ux-execution-2026/02_state.md`
- `.task-memory/ux-execution-2026/checks/phase-1-2-quality-gate.md`
- `web/src/app/(app)/ho-so/[id]/page.tsx`
- `web/src/app/(app)/nhan-su/page.tsx`
- `web/src/components/layout/app-shell.tsx`

## Quality risks

Production build đã từng fail do server/client boundary; regression hiện đã pass sau sửa. Cần thêm test cho formatter audit và tiếp tục kiểm tra không đưa PII/Prisma vào Client Component.
