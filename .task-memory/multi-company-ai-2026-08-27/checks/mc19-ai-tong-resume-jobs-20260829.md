# MC-19 — AI Tổng quản lý AI con nhiều hơn — 2026-08-29

## Đã thêm
- `resume_child_agent` (đối xứng `suspend_child_agent`): AI Tổng kích hoạt lại AI con đang SUSPENDED.
  Nằm trong `WRITE_ACTIONS` (irreversible) nên qua đúng approval gate — không tự resume thẳng.
- `get_child_agent_jobs`: AI Tổng xem 20 job gần nhất do CHÍNH agent con đó thực thi (`targetAgentId`
  trên `ZAiJob` = agent thực thi, không phải agent bị nhắc tới trong tham số) — trước đây chỉ biết
  status hiện tại (`get_child_agent_status`), không biết agent đã làm gì để phát hiện bất thường.
- Cả 2 thêm vào `toolAllowlist` mặc định khi tạo GLOBAL agent mới (`v2-ai-agent-actions.ts`).

## Lưu ý kỹ thuật quan trọng (tránh lặp lại nhầm lẫn)
`ZAiJob.targetAgentId` = agent **THỰC THI** job, KHÔNG phải agent bị tác động. Khi AI Tổng chạy
`resume_child_agent`, `targetAgentId` của job đó là chính GLOBAL agent (AI Tổng) — agent con chỉ là 1
tham số (`arguments.agentId`) bên trong. `get_child_agent_jobs` do đó trả lịch sử "agent này TỰ làm gì",
không phải "ai đã tác động lên agent này" — 2 khái niệm khác nhau, đã viết rõ trong code + test để
phiên sau không nhầm lại (test đầu tiên tôi viết đã sai chính điều này, sửa lại đúng trước khi commit).

## Bằng chứng (QA thật)
File mới `v2-child-agent-resume-jobs.itest.ts`, 3/3 PASS:
1. `get_child_agent_jobs` gọi được, trả đúng agent + mảng job đúng shape.
2. Chuỗi đầy đủ: agent con SUSPENDED -> enqueue resume -> PENDING_APPROVAL (agent vẫn SUSPENDED, không
   tự resume) -> approve -> worker chạy thật -> agent con **ACTIVE** trở lại.
3. Enqueue 1 job CHILD-scoped thật (`get_project_overview`) để agent con tự thực thi -> `get_child_agent_jobs`
   với đúng agentId đó thấy đúng job vừa chạy (SUCCEEDED).

## Gate
`tsc` 0 lỗi; unit **495/495**; integration **35/35** (14 file, +1 so với MC-18).

## Phát hiện quan trọng KHÔNG thuộc phạm vi MC-19 (ghi lại, chưa xử lý)
Rà lại toàn bộ `app/` không thấy trang/component nào gọi `enqueueAiJobAction` — **hiện KHÔNG có giao diện
người dùng nào để thực sự tạo/chạy 1 AI job** (bao gồm mọi tool vừa xây ở MC-17/18/19). Toàn bộ tầng V2 AI
Job (AI Tổng, AI con, hàng đợi, approval) chỉ được chứng minh đúng ở tầng server/dữ liệu qua itest — CHƯA
ai dùng được qua trình duyệt. Đây có thể là gap lớn nhất trong toàn bộ nỗ lực multi-company AI, lớn hơn cả
việc thiếu tool cụ thể — đã ghi vào ledger MC-24 (chưa làm, cần chủ dự án xác nhận phạm vi trước khi xây,
vì đây là 1 UI/tính năng lớn — tương đương xây `/tro-ly` bản V2 — không phải fix nhỏ).

## Ledger
MC-19: TODO -> **DONE**.
