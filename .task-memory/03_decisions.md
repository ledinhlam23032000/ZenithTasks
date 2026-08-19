# Decisions — ZenithTasks AI Deep Upgrade

## D1 — Không gọi đây là fine-tuning nếu chưa có dataset

Vòng này ưu tiên nâng behavior layer: policy chung, memory, planner, tool registry, verification và final writer. Fine-tune chỉ đáng làm sau khi có tập hội thoại đã gắn nhãn, benchmark đại diện và cơ chế rollback model.

## D2 — Giữ DeepSeek làm lõi

DeepSeek tiếp tục làm model planner/writer. Adapter phải hỗ trợ context dài theo giới hạn thực tế, retry/timeout, structured output tương thích và fallback rõ ràng. Không đưa framework agent lớn vào nếu nó phá approval/audit hiện có.

## D3 — Dùng bounded agent loop

Planner không được chạy vòng lặp vô hạn. Mỗi lượt chỉ được chọn action thuộc whitelist; read actions có thể chạy một bước hoặc chuỗi bước có giới hạn; write actions luôn dừng ở preview/approval; verify chỉ đọc trạng thái server sau tool.

## D4 — Memory có phân tầng

Tách recent turns, conversation summary, durable user preferences/constraints và verified tool facts. Nội dung file/feedback là untrusted reference. Summary phải được cập nhật có kiểm soát, không tự biến dữ liệu chưa kiểm chứng thành sự thật.

## D5 — Conversation deletion là thao tác dữ liệu riêng

Xóa conversation chỉ xóa AssistantConversation, AssistantMessage và metadata/approval liên quan theo schema; không xóa Customer, Payment, Payroll, Plan hoặc dữ liệu nghiệp vụ. UI phải cho xóa từ danh sách, xác nhận rõ và báo trạng thái.
