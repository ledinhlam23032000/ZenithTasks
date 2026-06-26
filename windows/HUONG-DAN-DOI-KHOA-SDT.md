# Đổi khoá mã hoá số điện thoại (PHONE_ENC_KEY)

> ⚠️ Đây là thao tác kỹ thuật, **ảnh hưởng toàn bộ SĐT khách**. Nên làm khi vắng khách,
> **sao lưu trước** (chạy `Sao-Luu.bat`), và có người rành kỹ thuật hỗ trợ.

Vì sao đổi: khoá mặc định ban đầu mang tính "demo". Đổi sang khoá riêng giúp bảo mật cao hơn.

## Các bước (chạy trên MÁY CHỦ, trong thư mục `ZenithTasks`)

1. **Sao lưu trước** cho chắc: bấm `windows\Sao-Luu.bat`.

2. **Tạo khoá mới** (mở PowerShell, dán):
   ```powershell
   [Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Max 256}))
   ```
   Chép lại chuỗi in ra — đây là **KHOÁ MỚI**.

3. **Lấy khoá cũ đang dùng**:
   ```powershell
   docker compose exec app sh -lc "cat /app/.runtime/phone_key"
   ```
   (Nếu trống nghĩa là đang dùng khoá trong `.env` — lấy giá trị `PHONE_ENC_KEY` ở `.env`.)

4. **Mã hoá lại toàn bộ** (thay `<CŨ>` và `<MỚI>`):
   ```powershell
   docker compose exec -e OLD_PHONE_ENC_KEY="<CŨ>" -e NEW_PHONE_ENC_KEY="<MỚI>" app npx tsx prisma/rotate-phone-key.ts
   ```
   Đợi báo **"Hoàn tất: N thành công, 0 lỗi"**.

5. **Đặt khoá mới làm mặc định**: mở file `.env` (cạnh `docker-compose.yml`), thêm/sửa dòng:
   ```
   PHONE_ENC_KEY=<MỚI>
   ```
   Rồi khởi động lại: `Chay-Zenith.bat` (hoặc `docker compose up -d`).

6. **Kiểm tra**: vào một hồ sơ khách, bấm **"Hiện số"** — phải ra đúng số điện thoại.

> Nếu bước 4 báo có lỗi (> 0), **đừng** đổi `PHONE_ENC_KEY` ở bước 5; giữ nguyên khoá cũ và gọi kỹ thuật.
