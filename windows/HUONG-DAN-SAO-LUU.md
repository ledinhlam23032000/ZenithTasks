# Hướng dẫn Sao lưu & Phục hồi dữ liệu (máy chủ tại trung tâm)

Dữ liệu phòng khám (khách hàng, hồ sơ, thanh toán, lương, ảnh…) nằm trong Docker
trên máy chủ. **Phải sao lưu định kỳ** — ổ cứng hỏng mà chưa sao lưu là mất hết.

## Cài sao lưu TỰ ĐỘNG (làm 1 lần)
1. Bấm đúp **`Cai-Sao-Luu-Tu-Dong.bat`** (bấm **Yes** khi Windows hỏi quyền Admin).
2. Nhập thư mục lưu — nên chọn **ổ trống nhiều của anh**, ví dụ: `E:\ZenithBackup`.
3. (Tuỳ chọn) Nhập **thư mục Google Drive** để lưu thêm bản dự phòng ngoài (xem mục dưới).
4. Xong. Hệ thống tự sao lưu **mỗi ngày lúc 1h sáng**, giữ **30 bản gần nhất** ở cả 2 nơi.

> Mỗi bản là 1 file nén `zenith-YYYY-MM-DD_HHMM.zip` gồm: toàn bộ CSDL (`db.sql`) + thư mục ảnh (`uploads`).

## ☁️ Sao lưu ra Google Drive (chống cháy/mất/hỏng máy) — RẤT NÊN
Cách dễ nhất, không cần kỹ thuật:
1. Cài **"Google Drive for desktop"** (tải tại google.com/drive/download) → đăng nhập Gmail của trung tâm.
2. Sau khi cài, máy sẽ có một **ổ Google Drive** (thường là `G:`). Tạo thư mục, ví dụ `G:\My Drive\ZenithBackup`.
3. Chạy lại **`Cai-Sao-Luu-Tu-Dong.bat`**, tới bước "NOI LUU NGOAI" thì dán đường dẫn đó (`G:\My Drive\ZenithBackup`).
→ Từ đó mỗi bản sao lưu **tự được đẩy lên Google Drive**. Máy hỏng vẫn lấy lại được dữ liệu từ Drive.

## Sao lưu NGAY lập tức (khi cần)
Bấm đúp **`Sao-Luu.bat`** → tạo ngay 1 bản (vào cả thư mục chính lẫn Google Drive nếu đã cấu hình).

## 💡 Khuyên thêm
- Mỗi tuần mở thư mục sao lưu (và Google Drive) xem có file mới theo ngày không.
- Giữ ít nhất 2 nơi: 1 ổ trong máy + 1 trên Google Drive (hoặc USB/ổ rời).

## Phục hồi dữ liệu (khi cần — nên gọi kỹ thuật hỗ trợ)
> ⚠️ Phục hồi sẽ **ghi đè** dữ liệu hiện tại. Chỉ làm khi chắc chắn. Nếu không rành, gọi BS. Lê Đình Lam / kỹ thuật.

Mở PowerShell tại thư mục đã giải nén bản sao lưu (có `db.sql` và `uploads`):
```powershell
$C = "$env:USERPROFILE\ZenithTasks\docker-compose.yml"
# 1) Nạp lại cơ sở dữ liệu
Get-Content db.sql | docker compose -f $C exec -T db psql -U zenith -d zenith_clinic
# 2) Đưa ảnh trở lại
docker compose -f $C cp uploads app:/app/private/uploads
```
