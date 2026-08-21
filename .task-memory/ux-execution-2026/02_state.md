# Project State

- Updated: 2026-08-21 GMT+7
- Goal: Hoàn thiện 35 task UX đã duyệt, loại trừ Task 11, kiểm thử từng mốc và phát hành qua PR.
- Current phase: Phase 5 đã hoàn tất; PR #40 chứa toàn bộ UX task đã code, chờ CI/merge theo quy trình.
- Overall status: active

## Completed since last checkpoint

Đã hoàn thiện toàn bộ task 1–10, 12–36 ngoại trừ Task 11 trên nhánh `feat/ux-execution-1-10`. Phase 5 bổ sung PaymentRequest source buttons/link hai chiều, action thay thế ngoài SLA, CTV data-quality/reconcile ID có audit, telemetry local-only, ma trận QA và feature flags rollout. Task 11 vẫn tạm dừng theo quyết định vật tư thủ công.

## Verified facts

Quality gate cuối phase 5: `pnpm exec tsc --noEmit` PASS; `pnpm test` PASS 65 files / 360 tests; `pnpm build` PASS; `git diff --check` PASS. Targeted tests phase 5 PASS. Task 25 dùng `StaffRoleHistory.changedAt` làm effective date và đã có test. Task 11 vẫn bị hủy: không tự động áp BOM vật tư; nhân sự tự chọn và tự trừ theo ca thực tế.

## Active assumptions

Các task còn lại triển khai tuần tự theo dependency graph trong `NHIEM_VU_UX_MASTER_2026.md`. Không tự merge vào `master`; chỉ tạo PR và chờ CI/owner approval.

## Open blockers/questions

PR #40 đã được cập nhật sau phase 5 và cần CI xác nhận commit mới. Không còn task UX được duyệt nào khác ngoài Task 11; production deployment/migration vẫn cần backup và chạy trên máy vận hành riêng.

## Next 3 actions

1. Commit và push phase 5, cập nhật body PR #40 và chờ CI.
2. Cập nhật VERSION/CHANGELOG nếu owner muốn phát hành bản mới sau merge.
3. Sau merge, fetch master và chạy smoke test có backup trên máy vận hành; không tuyên bố production đã triển khai trước khi có bằng chứng.

## Files to read first

- `NHIEM_VU_UX_MASTER_2026.md`
- `.task-memory/ux-execution-2026/01_plan.md`
- `.task-memory/ux-execution-2026/02_state.md`
- `.task-memory/ux-execution-2026/checks/phase-1-2-quality-gate.md`
- `.task-memory/ux-execution-2026/checks/phase-3-quality-gate.md`
- `.task-memory/ux-execution-2026/checks/phase-4-quality-gate.md`
- `.task-memory/ux-execution-2026/checks/phase-5-quality-gate.md`
- `UX_QA_MATRIX_2026.md`
- `web/src/app/(app)/ho-so/[id]/page.tsx`
- `web/src/app/(app)/nhan-su/page.tsx`
- `web/src/components/layout/app-shell.tsx`

## Quality risks

Production build đã từng fail do server/client boundary; regression hiện đã pass sau sửa. Cần review source-link actions với dữ liệu production và smoke test các role thật; telemetry chỉ local-only, không đưa PII/Prisma vào Client Component.
