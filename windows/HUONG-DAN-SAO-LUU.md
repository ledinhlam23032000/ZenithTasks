# Hướng dẫn Sao lưu & Phục hồi dữ liệu (máy chủ tại trung tâm)

Dữ liệu phòng khám (khách hàng, hồ sơ, thanh toán, lương, ảnh…) nằm trong Docker
trên máy chủ. **Phải sao lưu định kỳ** — ổ cứng hỏng mà chưa sao lưu là mất hết.

## Cài sao lưu TỰ ĐỘNG (làm 1 lần)
1. Bấm đúp **`Cai-Sao-Luu-Tu-Dong.bat`** (bấm **Yes** khi Windows hỏi quyền Admin).
2. Nhập thư mục lưu — nên chọn **ổ trống nhiều của anh**, ví dụ: `E:\ZenithBackup`.
3. Xong. Hệ thống tự sao lưu **mỗi ngày lúc 1h sáng**, và giữ lại **30 bản gần nhất**.

> Mỗi bản là 1 file nén `zenith-YYYY-MM-DD_HHMM.zip` gồm: toàn bộ CSDL (`db.sql`) + thư mục ảnh (`uploads`).

## Sao lưu NGAY lập tức (khi cần)
Bấm đúp **`Sao-Luu.bat`** → tạo ngay 1 bản sao lưu vào thư mục đã chọn.

## 💡 Khuyên thêm
- Thỉnh thoảng **chép vài file `.zip`** sao lưu ra **ổ cứng rời / USB / Google Drive** để phòng cháy, mất trộm, hỏng máy.
- Kiểm tra thư mục sao lưu mỗi tuần xem có file mới theo ngày không.

## Phục hồi dữ liệu (khi cần — nên gọi kỹ thuật hỗ trợ)
> ⚠️ Phục hồi sẽ **ghi đè** dữ liệu hiện tại. Chỉ làm khi chắc chắn. Nếu không rành, gọi BS. Lê Đình Lam / kỹ thuật.

Mở PowerShell tại thư mục đã giải nén bản sao lưu (có `db.sql` và `uploads`):
```powershell
$C = "$env:USERPROFILE\ZenithTasks\docker-compose.yml"
# 1) Nạp lại cơ sở dữ liệu
Get-Content db.sql | docker compose -f $C exec -T db psql -U zenith -d zenith_clinic
# 2) Đưa ảnh trở lại
docker compose -f $C cp uploads app:/app/public/uploads
```
