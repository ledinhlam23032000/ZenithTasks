# Kiểm chứng r7 — AI đồng nghiệp số

Ngày kiểm tra: 2026-08-18.

## Mã nguồn và CI

- Commit code Agent/UI: `c7ffa76` — CI success.
- Commit Docker Compose truyền model Agent: `ee9c7b0` — CI success.
- Không có migration mới trong đợt này.

## Production Windows

- Repo Windows đã fast-forward lên `ee9c7b0`.
- Container app đã được recreate; database vẫn healthy.
- Prisma báo 49 migrations found và database schema is up to date.
- `/login` trả HTTP 200.
- `AI_MODEL` production vẫn là `deepseek-chat`.
- `AI_AGENT_MODEL` đã được khai báo trong `.env` là model reasoning riêng và đã được truyền vào container qua Docker Compose; không ghi API key vào biên bản.

## UI smoke test

- Trang `/tro-ly` mở được bằng phiên ADMIN.
- Header mới hiển thị trạng thái “Sẵn sàng”, mô tả “Đồng nghiệp số: phân tích, chia bước, đối chiếu và báo cáo rõ ràng”.
- Nút “Cuộc trò chuyện mới” và nút xóa phiên với tooltip “Xóa cuộc trò chuyện” đã hiển thị.
- Các tin cũ vẫn hiển thị nội dung cũ vì đó là dữ liệu lịch sử đã lưu; cần tạo phiên mới để kiểm tra preview/steps theo code r7.
- Browser extension timeout khi thử click tạo phiên mới; chưa kết luận thao tác click đã chạy.

## Phạm vi đã sửa

- Parser chấm công ưu tiên câu mới nhất, không lấy nhầm nhân sự/ngày/giờ từ preview cũ.
- Hỗ trợ diễn đạt “sớm hơn 8h/muộn hơn 17h” bằng giờ biên 07:00/18:00 và hiển thị trong preview.
- Câu “đã làm chưa?” đối chiếu trạng thái approval thật; “làm đi” xác nhận approval PENDING bằng lời của ADMIN.
- Preview chấm công cũ trong cùng phiên bị đánh dấu thay thế khi có yêu cầu chấm công mới.
- Có timeline bước làm việc, xóa phiên, tool lập kế hoạch nhiệm vụ chính/phụ và model Agent riêng.
