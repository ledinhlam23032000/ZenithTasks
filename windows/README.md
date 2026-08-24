# Cài Zenith Clinic trên Windows

> Lưu ý hiện hành: cơ sở dữ liệu thật không dùng tài khoản/mật khẩu demo. Khi CSDL trống, cấu hình `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_NAME` và `BOOTSTRAP_ADMIN_PASSWORD` (tối thiểu 12 ký tự) trong `.env`.

Chỉ cần **một file**: `Chay-Zenith.bat` → bấm đúp để chạy.

File này tự: xin quyền Admin → cài Git/Docker Desktop nếu thiếu → tải mã nguồn →
`docker compose up` → mở http://localhost:3000. Khi CSDL trống, dùng `BOOTSTRAP_ADMIN_*` trong `.env` để tạo tài khoản cá nhân; không dùng mật khẩu demo cho production.

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


## Cấu hình DeepSeek cho QA cô lập

Để thử AI trên bản chạy giống source thật nhưng không đụng database clinic, dùng `Cau-Hinh-AI-QA.bat`. File này kiểm tra Docker, xác nhận container hiện có đang trỏ tới database `zenith_v2_qa`, hỏi API key bằng ô nhập ẩn, rồi tạo lại **chỉ container QA** tại `http://127.0.0.1:3300/login` với V2 và Training Studio bật. API key không được ghi vào Git, không đưa vào client và không được dùng cho container app port 3000.

Sau khi test xong, bấm `Tat-AI-QA.bat`. File này xóa container QA và file `web/.env.qa.local`, nhưng giữ database QA để có thể đối chiếu; app clinic port 3000 không bị dừng. Nếu một API key đã từng xuất hiện trong tin nhắn, email, log hoặc ảnh chụp, hãy thu hồi key đó tại nhà cung cấp và tạo key QA mới.

`Cau-Hinh-AI-QA.bat` và `Tat-AI-QA.bat` là luồng kiểm thử, **không thay thế** `Sua-Loi.bat` hoặc `Chay-Zenith.bat`; không chạy chúng như quy trình cập nhật máy vận hành.
