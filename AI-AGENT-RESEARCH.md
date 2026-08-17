# Nghiên cứu nâng cấp Trợ lý AI — 2026-08-17

## Hiện trạng ZenithTasks

`tro-ly/actions.ts` chỉ gọi `generateMessage()` một lần với bối cảnh tổng hợp 30 ngày rồi trả về văn bản. AI không có quyền đọc DB trực tiếp, không có tool schema, không có vòng lặp tool call và yêu cầu thay đổi chỉ được ghi thành PlanTask cho lập trình.

`lib/ai.ts` chỉ hỗ trợ prompt -> text qua OpenAI-compatible hoặc Anthropic, dùng `max_tokens`, chưa hỗ trợ structured JSON/tool call. Đây là nguyên nhân chính khiến trợ lý trả lời chung chung.

Các thao tác hiện có đã có lớp an toàn nên có thể tái sử dụng làm công cụ whitelist, không cho AI tự viết Prisma:
- `luong/actions.ts`: lưu lương/hoa hồng/thưởng/điều chỉnh, ADMIN-only, khóa kỳ đã chốt, audit.
- `ke-toan/actions.ts`: chi lương/CTV, hoàn tác, khóa kỳ, transaction và audit.
- `ho-so/actions.ts`: thêm khoản thu, cập nhật hồ sơ, kiểm quyền, khóa, idempotency và audit.
- export lương: route có kiểm quyền và sinh Word/CSV/XLSX.

## Kết quả nghiên cứu bên ngoài

OpenAI mô tả tool/function calling là vòng lặp nhiều bước: gửi danh sách tools có schema, nhận tool call, ứng dụng tự thực thi code, gửi tool output về model, rồi nhận câu trả lời cuối hoặc tool call tiếp theo. Tool schema nên có tên/mô tả/tham số rõ, `additionalProperties: false`, và công cụ thực thi ở phía ứng dụng.

Anthropic mô tả tương tự: model trả về cấu trúc `tool_use`, ứng dụng thực thi công cụ và gửi `tool_result`; quyền thực thi nằm ở ứng dụng chứ không ở model.

## Kiến trúc sẽ triển khai

1. AI planner nhận yêu cầu cùng ngữ cảnh hiện tại và danh sách tool nhỏ theo domain.
2. Server kiểm tra schema bằng Zod, kiểm quyền người dùng, xác định mức rủi ro và không cho phép SQL/Prisma tùy ý.
3. Thao tác đọc có thể chạy ngay: xem công nợ, xem lương, tìm khách/hồ sơ, xem doanh thu, kiểm tra dữ liệu bất thường, chuẩn bị link xuất file.
4. Thao tác ghi dữ liệu phải trả về bản xem trước: đối tượng, tháng, số tiền, dữ liệu trước/sau, hậu quả và nút Xác nhận.
5. Chỉ sau khi ADMIN bấm xác nhận, server mới gọi tool mutation hiện có; mọi mutation tiếp tục dùng lớp quyền, transaction, khóa kỳ và audit hiện tại.
6. Các yêu cầu đổi cơ chế tính lương/đổi code không được AI tự sửa code production; AI tạo một đề xuất thay đổi có phạm vi, tác động, test cần thêm và chờ duyệt triển khai.

## Tool wave 1 dự kiến

Read-only: `get_business_summary`, `get_payroll_row`, `get_debt_summary`, `find_customer_or_case`, `check_financial_anomalies`, `prepare_payroll_export`.

Write-after-confirmation: `save_payroll_entry`, `save_bulk_payroll`, `record_payment`, `send_customer_message`, `create_follow_up`, `link_conversation_customer`.

High-risk, ADMIN confirmation bắt buộc: `pay_staff_salary`, `pay_all_salaries`, `undo_salary_payment`, `close_accounting_period`, `reopen_accounting_period`.

Code/rule change: `propose_system_change` chỉ tạo PlanTask có mô tả, không tự sửa file hoặc database schema.

## Nguyên tắc an toàn

Không expose secret cho model; không cho model trực tiếp truy cập DB; không thực thi tool chỉ vì model yêu cầu nếu server permission không cho phép; không tự động chi tiền, xóa dữ liệu, đóng kỳ hoặc thay đổi công thức; mọi thao tác nhạy cảm cần xác nhận rõ ràng của ADMIN; idempotency và audit phải giữ nguyên.

## Nguồn

- https://developers.openai.com/api/docs/guides/function-calling — OpenAI Function Calling
- https://developers.openai.com/api/docs/guides/structured-outputs — OpenAI Structured Outputs
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview — Anthropic Tool Use
- https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html — OWASP AI Agent Security Cheat Sheet
