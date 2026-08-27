# Kế hoạch audit và hoàn thiện

| Phase | Mục tiêu | Đầu ra bắt buộc | Trạng thái |
|---|---|---|---|
| 1 | Khôi phục trạng thái và phạm vi | Đối chiếu nhiệm vụ tham chiếu, checkout local/origin, AGENTS, nguồn canonical | done |
| 2 | Kiểm kê mã nguồn và acceptance | Ma trận 60 task/đặc tả so với route, model, action, UI, test | done |
| 3 | Chạy kiểm thử | Prisma validate/generate, TypeScript, Vitest, Next build và kiểm tra tĩnh bổ sung | done trên origin/master |
| 4 | Lập danh sách gap | Báo cáo gap theo Critical/High/Medium, có file/line/evidence | done |
| 5 | Sửa an toàn | Branch riêng, mỗi thay đổi có test và không chạm clinic DB | done |
| 6 | Hồi quy và bàn giao | Chạy lại gates, cập nhật state/changelog/report, xác định blocker runtime/deploy | done_with_blockers |

## Nguyên tắc phụ thuộc

Không triển khai payroll payout/accounting, AI write adapter hoặc migration production khi chưa có owner approval, backup, rollback và runtime evidence. Các phần có thể sửa an toàn trước là lỗi UX/claim sai, layout config thực sự chưa áp dụng, thiếu test boundary và các action project-local có thể hoàn thiện bằng dữ liệu synthetic.

## Trạng thái task audit

- `AUDIT-01`: khôi phục trạng thái, phát hiện local checkout chậm origin 63 commit; đã ghi brief.
- `AUDIT-02`: quality gate origin/master đạt 5/5; 83 test files và 422 tests pass.
- `AUDIT-03`: đối chiếu project routes, V2 registry và AI agent; đang hoàn thiện ma trận gap.
- `AUDIT-04`: report gap đã lưu tại `checks/gap-register-2026-08-27.md`.
- `FIX-01`: active layout resolver/validation, merged in PR #53.
- `FIX-02`: AI fail-closed workspace boundary, merged in PR #53.
- `FIX-03`: production guard cho demo seed, merged in PR #54.
- `FINAL-01`: regression/CI/handoff hoàn tất; còn blocker runtime/owner.
