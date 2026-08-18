# Hướng dẫn triển khai — Zenith Clinic

Có 3 cách, chọn theo nhu cầu. Với máy vận hành của phòng khám, ưu tiên Docker và đọc thêm [`../docs/OPERATIONS-RUNBOOK.md`](../docs/OPERATIONS-RUNBOOK.md) trước khi cập nhật:

| Cách | Phù hợp khi | Kết quả |
|------|-------------|---------|
| **A. Docker** | Máy/VPS có Docker | 1 lệnh, đầy đủ (kể cả upload ảnh) — chạy ở `localhost:3000` |
| **B. Vercel + Neon** | Muốn **link công khai**, không cài gì trên máy | URL `https://...vercel.app` mở được trên điện thoại; không hỗ trợ upload clinical |
| **C. Thủ công** | Máy có sẵn Node 20+ và PostgreSQL | Chạy dev/tùy biến |

Không có tài khoản demo tự động trong production. Khi CSDL trống, cấu hình `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_PASSWORD` (ít nhất 12 ký tự) để tạo một tài khoản quản trị cá nhân; tài khoản bắt buộc đổi mật khẩu lần đầu.

---

## Cách A — Docker (1 lệnh) ⭐ đầy đủ tính năng

Cần [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) hoặc Docker Engine (Linux).

```bash
# tại thư mục gốc dự án (nơi có docker-compose.yml)
docker compose up --build
```

Lần đầu sẽ tự: dựng PostgreSQL → chạy migration → bootstrap tài khoản quản trị → khởi động web.
Khi thấy dòng `🚀 Khởi động Zenith Clinic`, mở **http://localhost:3000**.

- Dừng: `Ctrl + C` rồi `docker compose down` (giữ dữ liệu).
- **Chỉ môi trường QA mới được xoá sạch:** `docker compose down -v`. Không chạy lệnh này trên production vì sẽ xóa volume dữ liệu.
- Dữ liệu DB và ảnh upload được lưu trong Docker volume nên không mất khi tắt máy.

> ⚠️ Không bật `ALLOW_DEMO_SEED=true` trong production. `AUTH_SECRET` và `PHONE_ENC_KEY` phải được quản lý bằng secret manager hoặc `.env` ngoài Git.

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

### 3) Khởi tạo tài khoản và dữ liệu
Không chạy `db:seed` trên database production. Hãy tạo tài khoản riêng bằng cơ chế bootstrap của Docker hoặc chạy `pnpm run db:bootstrap-admin` với các biến môi trường bootstrap trong một phiên vận hành được kiểm soát.

> ⚠️ **Không dùng Vercel/serverless cho dữ liệu clinical cần lưu tệp.** Các upload ảnh hồ sơ (trước/sau/tái khám), giấy tờ hành chính và avatar sẽ bị từ chối rõ ràng trước khi ghi, vì filesystem local của Vercel là ephemeral; cấu hình `UPLOAD_DIR` sang `/tmp` hay đường dẫn khác cũng không làm dữ liệu bền vững. Dùng **Cách A (Docker)** với volume `zenith_uploads`, hoặc triển khai một adapter object storage bền vững (S3/Cloudinary tương đương) trước khi bật upload.

---

## Cách C — Chạy thủ công (Node 20+ & PostgreSQL)

```bash
cd web
cp .env.example .env          # điền DATABASE_URL, AUTH_SECRET, PHONE_ENC_KEY và bootstrap admin
pnpm install --frozen-lockfile
pnpm exec prisma migrate deploy # tạo bảng theo migration; không reset/db push
pnpm run db:bootstrap-admin     # chỉ khi CSDL chưa có tài khoản
pnpm dev                        # http://localhost:3000 (hoặc: pnpm build && pnpm start)
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
