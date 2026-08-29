# Triển khai clinic wave 4 — 2026-08-29 (AI Tong + payroll sensitivity fix)

## Nội dung
- feat(MC-07/MC-11): AI Tổng thực sự quản lý được AI con (get_child_agent_status,
  suspend_child_agent) + create_workspace_task cho AI con. 3 lỗi P0 tìm và vá:
  approval-gate không phân loại write action đúng; targetWorkspace suy đoán sai
  từ targetProjectId thay vì targetAgent.kind; enqueue luôn ghi targetProjectId=null
  cho GLOBAL target dù client gửi giá trị đúng.
- fix(P1): get_project_payroll_preview bị phân loại nhầm không nhạy cảm, đọc
  lương công ty mà không cần nêu mục đích/xác nhận.

## Bằng chứng sau deploy
| Kiểm tra | Kết quả |
|---|---|
| Migration | "No pending migrations" |
| Dữ liệu | Customer=18 Case=20 Payment=18 — không đổi |
| Worker AI job | đang chạy, poll mỗi 15s |
| /login | 200 |

## Trạng thái ledger cuối phiên (MC-00..MC-16)
DONE: MC-00, 02, 03, 04, 05, 09, 10, 11, 12, 13, 15
PARTIAL: MC-07 (mutation adapter có write tool đầu tiên đúng chuẩn, còn mở rộng
thêm theo nhu cầu), MC-14 (backup có, rollback script tự động chưa viết)
BLOCKED (owner gate): MC-16

## Tổng kết toàn bộ phiên (2026-08-28 -> 08-29, 4 wave deploy)
17 lỗi thật đã sửa (bảo mật, tiền, cách ly tenant, AI governance). 3 tính năng
lớn hoàn thiện: worker AI job tự động, payroll đa công ty E2E, AI Tổng điều
khiển AI con. Mọi fix đều có unit test và/hoặc integration test trên QA cô lập;
đa số có bằng chứng runtime trên dữ liệu giống thật, không chỉ đọc code.
Gate cuối: tsc 0 lỗi; unit 495/495; integration 27/27.

## Việc còn lại cho phiên sau
1. MC-07: mở rộng thêm write tool cho AI con nếu phát sinh nhu cầu thực tế cụ
   thể (không thêm bừa để "cho đủ số lượng").
2. MC-14: viết script rollback tự động (hiện restore từ pg_dump backup vẫn
   phải làm tay theo docs/OPERATIONS-RUNBOOK.md).
3. MC-16: cần chủ dự án tự bấm chạy thử Windows updater thực địa — không phải
   việc AI tự mở được (owner gate cố ý).
4. Rà lại toàn bộ action trong tro-ly/agent.ts (AI legacy clinic) xem còn action
   nào khác bị bỏ sót khỏi includesPayrollData/includesMedicalData như
   get_project_payroll_preview — mới kiểm 1 trường hợp, có thể còn sót.
