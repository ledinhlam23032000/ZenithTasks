# Triển khai clinic wave 3 — 2026-08-29 (đợt cuối, worker + MC-15)

## Nội dung
- feat(MC-11): worker tự động chạy AI job + UI phê duyệt PENDING_APPROVAL
- fix(P2/MC-09): agent tự cập nhật heartbeat
- test(MC-15): bằng chứng runtime vòng đời PayrollRun đa công ty

## Bằng chứng sau deploy
| Kiểm tra | Kết quả |
|---|---|
| Migration | "No pending migrations" |
| Dữ liệu | Customer=18 Case=20 Payment=18 — không đổi |
| Worker AI job | `.runtime/ai-job-worker.log` xác nhận đã khởi động và đang poll mỗi 15s |
| Smoke ADMIN | /dashboard /he-thong/ai-tong /du-an đều 200 |

## Trạng thái ledger cuối cùng (MC-00..MC-16)
DONE: MC-00, 02, 03, 09, 10, 11, 12, 13, 15
PARTIAL: MC-04, 05, 07, 14 (usage/cost tracking, list/detail completeness edge
cases — không chặn vận hành cơ bản)
BLOCKED (owner gate, không tự mở): MC-16 (Windows updater test thực địa)

## Tổng kết 3 wave deploy (2026-08-28 -> 08-29)
12 lỗi thật đã sửa, 2 tính năng lớn hoàn thiện (worker + payroll đa công ty
E2E). Mọi thay đổi đều có unit test và/hoặc integration test trên QA cô lập;
9/12 lỗi có bằng chứng runtime trên dữ liệu giống thật, không chỉ đọc code.
Gate cuối: tsc 0 lỗi; unit 494/494; integration 25/25.
