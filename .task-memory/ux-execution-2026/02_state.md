# Project State

- Updated: 2026-08-21 GMT+7
- Goal: Hoàn thiện 35 task UX đã duyệt, loại trừ Task 11, kiểm thử từng mốc và phát hành qua PR.
- Current phase: Phase 6 tổng kiểm tra; PR #40 và #44 đã merge các phase đầu, PR #45 chứa phase 4–5 còn lại và CI đã xanh, chờ merge.
- Overall status: active

## Completed since last checkpoint

Đã hoàn thiện toàn bộ task 1–10, 12–36 ngoại trừ Task 11 trên nhánh `feat/ux-execution-1-10`. Phase 5 bổ sung PaymentRequest source buttons/link hai chiều, action thay thế ngoài SLA, CTV data-quality/reconcile ID có audit, telemetry local-only, ma trận QA và feature flags rollout. Task 11 vẫn tạm dừng theo quyết định vật tư thủ công.

## Verified facts

Quality gate cuối phase 5: `pnpm exec tsc --noEmit` PASS; `pnpm test` PASS 65 files / 360 tests; `pnpm build` PASS; `git diff --check` PASS. Targeted tests phase 5 PASS. Task 25 dùng `StaffRoleHistory.changedAt` làm effective date và đã có test. Task 11 vẫn bị hủy: không tự động áp BOM vật tư; nhân sự tự chọn và tự trừ theo ca thực tế.

## Active assumptions

Các task còn lại triển khai tuần tự theo dependency graph trong `NHIEM_VU_UX_MASTER_2026.md`. Không tự merge vào `master`; chỉ tạo PR và chờ CI/owner approval.

## Open blockers/questions

PR #40 và #44 đã merge vào `origin/master`. PR #45 đã tạo cho phần còn lại, CI push/pull_request đều xanh nhưng chưa merge. Sau khi PR45 merge mới được đánh dấu toàn bộ task còn lại là Đã merge. Production deployment/migration vẫn cần backup và chạy trên máy vận hành riêng.

## Next 3 actions

1. Chờ owner/GitHub merge PR #45; không tự merge.
2. Sau merge, fetch `origin/master`, chạy lại typecheck/test/build tối thiểu và cập nhật ledger thành Đã merge.
3. Trên máy vận hành: backup, migrate deploy nếu cần, rồi smoke test ADMIN/MANAGER/nhân sự/CTV và backup status.

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
