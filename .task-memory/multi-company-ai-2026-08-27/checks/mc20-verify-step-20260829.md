# MC-20 — Bước Verify riêng biệt trong AI job pipeline — 2026-08-29

## Vấn đề
Owner yêu cầu chuỗi Plan→Preview→Approve→Execute→**Verify**→Audit cho mọi hành động AI. Kiểm tra
`v2-ai-job-engine.ts` (`executeAiJobRunner`) trước đây: `dispatchJobTool` không throw = coi là thành
công, ghi thẳng `status:"SUCCEEDED"` + audit — không có bước nào đọc lại DB để xác nhận trạng thái thật
khớp với điều tool vừa tuyên bố đã làm.

## Đã thêm
`verifyJobExecution(action, resultMeta)` (export, `v2-ai-job-engine.ts`) — chạy SAU dispatch thành công,
TRƯỚC khi ghi `SUCCEEDED`/audit:
- 4 action ghi dữ liệu thật (`create_customer_profile`, `create_workspace_task`, `suspend_child_agent`,
  `resume_child_agent`): đọc LẠI đúng bản ghi vừa tạo/sửa trong DB, so khớp với resultMeta — không tin
  một chiều.
- Mọi action khác (đọc dữ liệu, `generate_commission_draft` — chỉ trả draft không ghi DB): no-op có ghi
  chú rõ ràng ("không có state để xác minh lại") — vẫn CHẠY bước Verify, không bỏ qua âm thầm.
- Nếu verify thất bại: job chuyển `FAILED` (KHÔNG `SUCCEEDED`), `lastError` bắt đầu bằng `VERIFY_FAILED:`,
  audit action mới `V2_AI_JOB_VERIFY_FAILED`. Không tự động retry (state đã ghi có thể không idempotent).
- Nếu verify thành công: kết quả gộp vào `resultMeta.__verify` (không cần migration DB, tận dụng field
  JSON `resultMeta` đã có sẵn) + audit `V2_AI_JOB_SUCCEEDED` giờ có thêm `meta.verify`.

## Bằng chứng (QA thật) — có negative control
File mới `v2-ai-job-verify.itest.ts`, 4/4 PASS:
1. **Negative control**: gọi `verifyJobExecution` với `resultMeta` "nói dối" (báo agent đã SUSPENDED
   trong khi DB thật vẫn ACTIVE) — verify PHẢI bắt được (`ok:false`), chứng minh đây là kiểm tra thật, không
   phải bước trang trí luôn trả `true`.
2. Positive: agent thật sự SUSPENDED trong DB → verify trả `ok:true`.
3. Action đọc dữ liệu → verify no-op nhưng có ghi chú, không bị bỏ qua.
4. Gọi qua `dispatchJobTool` thật rồi verify kết quả thật → `ok:true`.

Chạy lại TOÀN BỘ 14 file itest cũ (MC-15, MC-17, MC-18, MC-19...) sau khi thêm bước Verify — không có
test nào vỡ (35/35 -> 39/39 sau khi thêm 4 test mới), xác nhận thêm `__verify` vào `resultMeta` không phá
vỡ hành vi/assertion nào đang có.

## Gate
`tsc` 0 lỗi; unit **495/495**; integration **39/39** (15 file).

## Ledger
MC-20: TODO -> **DONE**.
