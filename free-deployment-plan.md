# Phương án triển khai miễn phí không cần thẻ

## Phương án được chọn

Dùng chính máy Windows đang có sẵn làm origin, chạy ứng dụng bằng Docker Desktop và giữ Cloudflare Tunnel hiện tại làm đường public. Đây là phương án ít thay đổi nhất vì máy đã có `cloudflared.exe`, service Windows `Cloudflared` đang ở trạng thái Running/Auto, Docker Desktop đã cài, và DNS zone đang có bản ghi type `Tunnel` cho domain production.

Phương án này không cần mua VPS mới, không cần chọn Zero Trust checkout, không cần nhập thẻ và không cần đổi DNS. Đổi lại, máy Windows phải bật, có mạng và Docker containers phải chạy thì website mới hoạt động. Nếu máy tắt hoặc ngủ, website sẽ gián đoạn.

## Các phương án không chọn

| Phương án | Vì sao không chọn ngay |
|---|---|
| Zero Trust Free checkout | Trang kích hoạt miễn phí vẫn yêu cầu phương thức thanh toán và cho phép tính phí khi vượt giới hạn; trái với yêu cầu không muốn rủi ro chính sách |
| Cloudflare Worker/Pages | Zone hiện báo `No Workers connected`; ứng dụng là Next.js server + PostgreSQL + Prisma, không phù hợp với việc chỉ đẩy static frontend |
| VPS mới | Cần biết nhà cung cấp/IP/SSH, có thể phát sinh chi phí; không cần thiết vì đã có origin Windows |
| Host free khác | Cần di chuyển database, secrets, tunnel/domain và có thể gặp giới hạn ngủ/giới hạn tài nguyên; chưa có lý do để thay hạ tầng đang tồn tại |

## Bằng chứng hạ tầng local

Trên `C:\Users\PC\ZenithTasks-runtime`, repository trỏ về `ledinhlam23032000/ZenithTasks`, file `.env` tồn tại và có các key name `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `AI_PROVIDER` (giá trị không được đọc ra). Docker Engine trả version `29.5.3`. Cloudflared service chạy tự động. Hiện `docker compose ps` không có container running, vì vậy origin có khả năng đang tắt hoặc chưa được khởi động sau lần cập nhật trước.

Runtime repo đang ở branch `claude/lucid-cori-fg136w`, không phải `master`, và working tree sạch. Cần tạo backup branch trước khi checkout `master`; không xóa volume PostgreSQL, uploads hoặc runtime secrets.

## Cách cập nhật an toàn

1. Tạo branch backup từ trạng thái runtime hiện tại.
2. Fetch `origin/master` và checkout master trong thư mục runtime, giữ nguyên `.env` và Docker volumes.
3. Bổ sung `AI_AGENT_MODEL=deepseek-reasoner` và `AI_WRITER_MODEL=deepseek-chat` nếu thiếu, không thay đổi `AI_API_KEY`.
4. Chạy `docker compose config` để kiểm tra cấu hình, sau đó `docker compose up -d --build`.
5. Kiểm tra container health, `http://localhost:3000`, rồi kiểm tra domain public qua Cloudflare Tunnel.
6. Nếu lỗi, quay lại branch backup hoặc dừng containers mới; không thay đổi DNS/tunnel token.

Voice sẽ tạm bỏ qua. Chỉ khi app chat chạy ổn định mới cân nhắc thêm whisper.cpp nội bộ; đó là lựa chọn miễn phí phần mềm nhưng vẫn tiêu thụ tài nguyên máy, không nên bật đồng thời trong lúc đang khôi phục origin.
