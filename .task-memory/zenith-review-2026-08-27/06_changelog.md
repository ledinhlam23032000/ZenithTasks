# Changelog — Audit 2026-08-27

| Thời điểm | Thay đổi | Bằng chứng |
|---|---|---|
| 2026-08-27 12:35 GMT+7 | Khởi tạo checkout audit sạch từ `origin/master` `3bc85d1`; xác định Windows checkout `5d38fc0` chậm 63 commit và có untracked artifacts. | `00_brief.md`, `02_state.md` |
| 2026-08-27 12:36 GMT+7 | Chạy quality gate baseline: Prisma validate/generate, TypeScript, 83 test files/422 tests, Next build đều pass. | `audit-evidence/quality-gate-summary-v2.txt`, `audit-evidence/vitest-full-v2.log` |
| 2026-08-27 12:37 GMT+7 | Ghi gap register trước khi sửa, phân loại Critical/High/acceptance gaps. | `checks/gap-register-2026-08-27.md` |
| 2026-08-27 12:45 GMT+7 | Sửa active layout resolver: nạp LAYOUT ACTIVE, chuẩn hóa order, render navigation theo order, validate server-side và đồng bộ editor. | Commit `a1ca2d2`, PR #53, merge master `2fb3e95`; CI pass |
| 2026-08-27 12:50 GMT+7 | Sửa AI workspace boundary: PROJECT/GLOBAL không được rơi vào legacy Internal actions; Global chỉ aggregate; tránh query staff candidates ngoài Internal. | Commit trong PR #53; 6 test navigation + 3 test boundary mới |
| 2026-08-27 12:54 GMT+7 | Chặn seed demo ở production và thêm environment test. | PR #54, merge master `1bfb80f`; CI pass |
| 2026-08-27 12:55 GMT+7 | Regression cuối: TypeScript, targeted tests, full Vitest 85 files/429 tests và Next build đều pass. | `audit-evidence/demo-guard-summary.txt`, `audit-evidence/demo-guard-full-vitest.log` |
