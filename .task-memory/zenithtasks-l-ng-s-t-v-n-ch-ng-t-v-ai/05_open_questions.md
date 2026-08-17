# Câu hỏi mở và điều kiện chặn

| ID | Câu hỏi/điều kiện | Owner | Ưu tiên | Trạng thái | Cách xử lý |
|---|---|---|---|---|---|
| Q-001 | PaymentRequest cần có UI tạo, duyệt, từ chối, in và liên kết với chi lương/CTV. | Agent | Cao | open | Xây trong P5; không chạy production trước khi flow rõ. |
| Q-002 | Nội dung sàng lọc/phiếu cam kết có cần BS thêm trường lâm sàng ngoài mẫu DOCX không? | BS Lam | Trung bình | open | Triển khai đúng mẫu trước, có ghi chú bổ sung. |
| Q-003 | Điều khoản không cạnh tranh và mức phạt có phù hợp quan hệ lao động thực tế không? | Luật sư/lao động | Cao | open | Rà soát trước khi dùng chính thức. |
| Q-004 | Loại file AI được phép và thời hạn lưu file bao lâu? | BS Lam/Admin | Trung bình | open | Mặc định DOCX/XLSX/PDF/ảnh/code giới hạn, dung lượng giới hạn, có expiresAt. |
| Q-005 | Giọng nói dùng trình duyệt hay dịch vụ riêng? | Agent | Trung bình | decided | Ưu tiên Web Speech API nếu hỗ trợ; luôn có ô gõ thay thế. |
| Q-006 | AI có sửa trực tiếp code working tree không? | BS Lam/Admin | Cao | decided | Chỉ tạo diff/plan và approval; không tự deploy hoặc commit. |
| Q-007 | Trước migration máy phòng khám đã backup và có cửa sổ dừng app chưa? | BS Lam/Admin | Cao | blocking | Chỉ chạy sau backup, `migrate status`, và xác nhận trước khi tác động DB. |
