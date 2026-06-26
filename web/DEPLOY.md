# Hướng dẫn triển khai — Zenith Clinic

Có 3 cách, chọn theo nhu cầu:

| Cách | Phù hợp khi | Kết quả |
|------|-------------|---------|
| **A. Docker** | Máy/VPS có Docker | 1 lệnh, đầy đủ (kể cả upload ảnh) — chạy ở `localhost:3000` |
| **B. Vercel + Neon** | Muốn **link công khai**, không cài gì trên máy | URL `https://...vercel.app` mở được trên điện thoại |
| **C. Thủ công** | Máy có sẵn Node 20+ và PostgreSQL | Chạy dev/tùy biến |

Tài khoản demo (mật khẩu `123456`): `admin`, `letan`, `tuvan1`, `bacsi1`, `cskh`, `quanly`, `telesale`.

---

## Cách A — Docker (1 lệnh) ⭐ đầy đủ tính năng

Cần [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) hoặc Docker Engine (Linux).

```bash
# tại thư mục gốc dự án (nơi có docker-compose.yml)
docker compose up --build
```

Lần đầu sẽ tự: dựng PostgreSQL → chạy migration → nạp dữ liệu mẫu → khởi động web.
Khi thấy dòng `🚀 Khởi động Zenith Clinic`, mở **http://localhost:3000**.

- Dừng: `Ctrl + C` rồi `docker compose down` (giữ dữ liệu).
- Xoá sạch để chạy lại từ đầu: `docker compose down -v`.
- Dữ liệu DB và ảnh upload được lưu trong Docker volume nên không mất khi tắt máy.

> ⚠️ Khoá `AUTH_SECRET` / `PHONE_ENC_KEY` trong `docker-compose.yml` chỉ để demo.
> Đổi sang khoá riêng trước khi dùng thật (xem mục “Sinh khoá bí mật” cuối trang).

---

## Cách B — Vercel + Neon (có link công khai, không cần cài gì)

### 1) Tạo cơ sở dữ liệu PostgreSQL miễn phí (Neon)
1. Vào https://neon.tech → đăng ký → **Create project**.
2. Copy **Connection string**, thêm `?sslmode=require` ở cuối, ví dụ:
   `postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require`

### 2) Đưa lên Vercel
1. Vào https://vercel.com → **Add New → Project** → chọn repo `ZenithTasks`.
2. **Root Directory:** chọn thư mục **`web`** (quan trọng).
3. Mục **Environment Variables**, thêm:

   | Tên | Giá trị |
   |-----|---------|
   | `DATABASE_URL` | chuỗi kết nối Neon ở bước 1 |
   | `AUTH_SECRET` | chuỗi ngẫu nhiên (xem mục cuối) |
   | `PHONE_ENC_KEY` | khoá 32 byte dạng base64 (xem mục cuối) |
   | `APP_NAME` | `Zenith Clinic` |

4. Bấm **Deploy**. (Build sẽ tự chạy `prisma migrate deploy` để tạo bảng.)

### 3) Nạp dữ liệu mẫu (chỉ làm 1 lần)
Vào **Settings → General → Build & Development Settings**, tạm sửa **Build Command** thành:
```
prisma migrate deploy && npm run db:seed && next build
```
Bấm **Redeploy** một lần → vào lại Build Command cũ (`prisma migrate deploy && next build`) để lần sau không nạp lại đè dữ liệu.

Xong! Mở URL Vercel, đăng nhập `admin / 123456`.

> ℹ️ Trên Vercel (serverless), việc **tải ảnh trước–sau sẽ không lưu được** do hệ thống tệp chỉ đọc — các phần khác hoạt động bình thường. Nếu cần upload ảnh, dùng **Cách A (Docker)** hoặc gắn dịch vụ lưu trữ ảnh (S3/Cloudinary).

---

## Cách C — Chạy thủ công (Node 20+ & PostgreSQL)

```bash
cd web
cp .env.example .env          # rồi điền DATABASE_URL, AUTH_SECRET, PHONE_ENC_KEY
npm install
npm run db:deploy             # tạo bảng theo migration
npm run db:seed               # nạp dữ liệu mẫu
npm run dev                   # http://localhost:3000   (hoặc: npm run build && npm start)
```

---

## Biến môi trường

| Tên | Bắt buộc | Mô tả |
|-----|:---:|-------|
| `DATABASE_URL` | ✅ | Chuỗi kết nối PostgreSQL |
| `AUTH_SECRET` | ✅ | Khoá ký phiên đăng nhập (JWT) |
| `PHONE_ENC_KEY` | ✅ | Khoá AES-256 (32 byte, base64) để mã hoá số điện thoại |
| `APP_NAME` | — | Tên hiển thị, mặc định “Zenith Clinic” |

### Sinh khoá bí mật (cho bản chạy thật)
```bash
# AUTH_SECRET (ngẫu nhiên)
openssl rand -base64 48

# PHONE_ENC_KEY (đúng 32 byte, base64) — BẮT BUỘC giữ cố định,
# đổi khoá này sẽ làm không giải mã được số điện thoại đã lưu.
openssl rand -base64 32
```

---

## Khắc phục sự cố

- **Trang trắng / lỗi DB:** kiểm tra `DATABASE_URL` đúng và DB đã chạy. Với Neon nhớ có `?sslmode=require`.
- **Sai/độ dài `PHONE_ENC_KEY`:** phải là base64 của đúng 32 byte (dùng lệnh `openssl` ở trên).
- **Docker cổng 3000 bận:** sửa `ports: ["3001:3000"]` trong `docker-compose.yml` rồi mở `localhost:3001`.
- **Quên/đổi mật khẩu:** đăng nhập `admin` → menu góc phải → *Đổi mật khẩu*; hoặc Nhân sự → *Mật khẩu* để đặt lại cho nhân viên.
