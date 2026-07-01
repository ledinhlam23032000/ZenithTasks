# Cài Zenith Clinic trên Windows

Chỉ cần **một file**: `Chay-Zenith.bat` → bấm đúp để chạy.

File này tự: xin quyền Admin → cài Git/Docker Desktop nếu thiếu → tải mã nguồn →
`docker compose up` → mở http://localhost:3000 (đăng nhập **admin / 123456**).

Dữ liệu lưu ngay trên máy này (Docker volume); máy khác cùng mạng vào bằng
`http://<IP-máy-này>:3000`.

> File `.bat` nhúng sẵn một script PowerShell (mã hoá base64 trong tham số
> `-EncodedCommand`). Bản đọc được của script đó là `Zenith-Setup.ps1` trong
> thư mục này, để tiện kiểm tra hoặc chỉnh sửa.

**Yêu cầu:** Windows 10/11, có Internet, quyền Admin.
Các cách triển khai khác (Vercel, thủ công): xem `../web/DEPLOY.md`.

## Tự động cập nhật phiên bản mới (không cần bấm tay)
Mặc định, cập nhật phải bấm tay (`Chay-Zenith.bat` hoặc `Sua-Loi.bat`). Muốn máy **tự kiểm tra +
cập nhật mỗi đêm**: chạy `Cai-Tu-Dong-Cap-Nhat.bat` **một lần** — máy sẽ tự hẹn lịch (Windows Task
Scheduler) kiểm tra GitHub lúc 02:00 sáng mỗi ngày, có bản mới thì tự tải về + dựng lại; không có gì
mới thì bỏ qua; nếu cập nhật lỗi thì giữ nguyên bản đang chạy (không làm gián đoạn phòng khám). Xem
nhật ký tại `%USERPROFILE%\zenith-tu-dong-cap-nhat.log`. Muốn tắt: mở "Task Scheduler" → tìm
`ZenithTuDongCapNhat` → Disable/Delete.
