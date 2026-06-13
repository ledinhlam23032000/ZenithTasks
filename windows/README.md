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
