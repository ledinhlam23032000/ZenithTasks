# AI regression local — 2026-08-21

## Phạm vi

Đợt này tiếp tục workstream P7/P8 của Trợ lý AI/đồng nghiệp số bằng các kiểm tra deterministic tại sandbox. Không gọi model production, không đọc dữ liệu khách hàng, không dùng `DATABASE_URL` production và không thực hiện mutation/approval/delete. Mục tiêu là khóa các hành vi dễ hồi quy ở adapter AI và conversation context trước khi có smoke test read-only trên máy vận hành.

## Regression đã bổ sung

| Nhóm checklist | Case | Kiểm tra | Kết quả |
|---|---|---|---|
| F01 | Retry provider | Provider trả 429 một lần rồi thành công; adapter retry đúng giới hạn và trả JSON hợp lệ. | PASS |
| F02 | Output rỗng | Model trả `content` rỗng; hệ thống trả thông báo ổn định, không treo hoặc báo đã hoàn tất. | PASS |
| C06 | Structured output lỗi | Model trả JSON hỏng; hệ thống trả lỗi định dạng, không chạy action. | PASS |
| A05/F06 | Stale context | Lượt assistant chứa lỗi tạm thời bị loại khỏi prompt; lượt người dùng mới vẫn được giữ. | PASS |
| A05/F06 | Không còn lượt tin cậy | History chỉ còn lỗi cũ thì prompt dùng fallback trung thực, không tạo dữ kiện giả. | PASS |

Các test nền đã có tiếp tục bảo vệ cấu hình provider, DeepSeek `json_object`, fallback JSON trong prompt khi provider từ chối `response_format`, fallback reasoner sang chat, memory prompt và giới hạn 24.000 ký tự.

## Kết quả quality gate

| Kiểm tra | Kết quả |
|---|---|
| Targeted Vitest | 2 file, 19 test pass |
| Full Vitest | **53 file, 338 test pass** |
| TypeScript `tsc --noEmit --pretty false` | PASS |
| ESLint tệp test thay đổi | PASS |
| Next production build | PASS |
| Database/production side effect | Không có |

## Giới hạn còn mở

Các case cần phiên đăng nhập và AI runtime thật như A01, A02, B01, E01 và E06 chưa được chấm điểm live trong đợt này. Các case ghi/xóa D01–D06 tiếp tục bị giữ ở preview/mock theo policy; không chạy trên production. Vì vậy evidence này xác nhận **regression code local**, chưa phải chứng nhận production đạt release gate 90%.

Bước tiếp theo an toàn là triển khai master hiện tại lên máy Windows theo `Sua-Loi.bat`, mở một cuộc trò chuyện AI mới và chạy read-only A01, A02, B01, E01, E06; lưu prompt, output, action/steps, latency và side-effect check, không lưu secret hoặc dữ liệu nhạy cảm không cần thiết.
