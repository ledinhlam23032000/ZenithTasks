# Hướng dẫn đưa app lên máy chủ đám mây (VPS) + tên miền

App: **Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — BVĐK Hồng Phúc**
Tên miền: `trungtamphauthuattaohinhvathammybenhviendakhoahongphuc.xyz`

Sau khi làm xong, mọi thiết bị có mạng vào tên miền là dùng được; dữ liệu lưu tập trung trên VPS; có HTTPS (ổ khoá) tự động.

---

## Bước 1 — Thuê VPS
Mua 1 VPS Linux (gợi ý mua ở **Nhân Hòa** cho cùng chỗ với tên miền, hoặc AZDIGI/Vietnix/BizflyCloud…).
- **Hệ điều hành:** Ubuntu 24.04 (hoặc 22.04).
- **Cấu hình tối thiểu:** 2GB RAM (nên **4GB** cho mượt), 2 vCPU, 20–40GB ổ.
- Nhà cung cấp sẽ cho anh: **địa chỉ IP** của VPS + **mật khẩu root** (hoặc SSH).

> Chính cái **IP của VPS** này là thứ sẽ điền vào ZoneDNS ở Bước 2 — không phải đi dò ở đâu cả.

## Bước 2 — Trỏ tên miền về IP VPS (tại ZoneDNS)
Vào ZoneDNS → mở tên miền → **TẠO RECORD**, tạo 2 bản ghi:

| Tên record | Loại | Giá trị | TTL |
|---|---|---|---|
| (để trống hoặc `@`) | A | `IP-của-VPS` | 300 |
| `www` | A | `IP-của-VPS` | 300 |

(Hoặc dùng nút **"TẠO RECORD MẶC ĐỊNH THEO IP"** rồi điền IP của VPS.)
Đợi ~1–5 phút cho DNS cập nhật.

## Bước 3 — Cài app lên VPS (1 lệnh)
Đăng nhập VPS (qua cửa sổ "Console/SSH" của nhà cung cấp, hoặc phần mềm như PuTTY) với quyền **root**, rồi dán đúng 1 dòng:

```bash
curl -fsSL https://raw.githubusercontent.com/ledinhlam23032000/ZenithTasks/claude/lucid-cori-fg136w/deploy/cai-dat-vps.sh | bash
```

Lệnh này tự cài Docker, tải mã nguồn, dựng app + HTTPS. Lần đầu mất ~5–10 phút.

> **Nếu kho mã để chế độ riêng tư (private)** thì lệnh `curl` trên sẽ báo lỗi 404.
> Khi đó làm cách này (thay `TOKEN` bằng GitHub token chỉ‑đọc — tạo ở
> github.com → Settings → Developer settings → Personal access tokens → Fine‑grained):
> ```bash
> curl -fsSL https://get.docker.com | sh
> git clone -b claude/lucid-cori-fg136w https://TOKEN@github.com/ledinhlam23032000/ZenithTasks.git /opt/zenith
> cd /opt/zenith/deploy && docker compose up -d --build
> ```

## Bước 4 — Mở app
Vào: `https://trungtamphauthuattaohinhvathammybenhviendakhoahongphuc.xyz`
(Lần đầu chờ thêm 1–2 phút để Caddy lấy chứng chỉ HTTPS.)
Đăng nhập: **admin / 123456** → **đổi mật khẩu ngay**.

---

## Cập nhật phiên bản mới
Đăng nhập VPS, chạy lại đúng lệnh ở Bước 3 (tự kéo bản mới + dựng lại).

## Sao lưu dữ liệu (rất nên làm)
Dữ liệu nằm trong Docker volume `zenith_db`. Sao lưu nhanh:
```bash
docker exec -t $(docker ps -qf name=db) pg_dump -U zenith zenith_clinic > /opt/zenith-backup-$(date +%F).sql
```
(Nên hẹn lịch tự động hằng ngày + tải bản sao lưu ra nơi khác.)

## Khoá bí mật
App tự sinh `AUTH_SECRET` lưu trong volume. Muốn tự đặt khoá riêng: tạo file `deploy/.env`
(theo mẫu `.env.example` ở thư mục gốc) rồi chạy lại. Đổi `PHONE_ENC_KEY` khi đã có dữ liệu
SĐT sẽ cần mã hoá lại — hỏi kỹ thuật trước khi đổi.
