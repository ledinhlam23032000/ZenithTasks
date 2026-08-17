# Hướng dẫn triển khai — Zenith Clinic

Có 3 cách, chọn theo nhu cầu:

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
- Xoá sạch để chạy lại từ đầu: `docker compose down -v`.
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
Không chạy `db:seed` trên database production. Hãy tạo tài khoản riêng bằng cơ chế bootstrap của Docker hoặc chạy `npm run db:bootstrap-admin` với các biến môi trường bootstrap trong một phiên vận hành được kiểm soát.

> ⚠️ **Không dùng Vercel/serverless cho dữ liệu clinical cần lưu tệp.** Các upload ảnh hồ sơ (trước/sau/tái khám), giấy tờ hành chính và avatar sẽ bị từ chối rõ ràng trước khi ghi, vì filesystem local của Vercel là ephemeral; cấu hình `UPLOAD_DIR` sang `/tmp` hay đường dẫn khác cũng không làm dữ liệu bền vững. Dùng **Cách A (Docker)** với volume `zenith_uploads`, hoặc triển khai một adapter object storage bền vững (S3/Cloudinary tương đương) trước khi bật upload.

---

## Cách C — Chạy thủ công (Node 20+ & PostgreSQL)

```bash
cd web
cp .env.example .env          # điền DATABASE_URL, AUTH_SECRET, PHONE_ENC_KEY và bootstrap admin
npm install
npm run db:deploy             # tạo bảng theo migration
npm run db:bootstrap-admin    # chỉ khi CSDL chưa có tài khoản
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

## Hộp thư Zalo OA + Facebook Fanpage

### 1. Chuẩn bị và biến môi trường

Hộp thư cần một domain HTTPS ổn định; `PUBLIC_APP_URL` phải là origin công khai, không có đường dẫn con. Sao chép `.env.example` thành `.env`, điền:

```dotenv
OMNICHANNEL_ENABLED=false
PUBLIC_APP_URL=https://crm.ten-mien-cua-ban.vn
ZALO_APP_ID=
ZALO_APP_SECRET=
ZALO_OA_SECRET=
META_APP_ID=
META_APP_SECRET=
META_PAGE_ID=
META_WEBHOOK_VERIFY_TOKEN=
META_GRAPH_VERSION=v24.0
```

Có thể để trống `CHANNEL_TOKEN_ENC_KEY` và `CHANNEL_MAINTENANCE_SECRET`: entrypoint sinh ngẫu nhiên một lần, lưu trong `zenith_secrets:/app/.runtime` với thư mục 0700/tệp 0600. Không đổi/mất `CHANNEL_TOKEN_ENC_KEY` sau khi đã kết nối vì token cũ sẽ không giải mã được. Không chụp màn hình, gửi chat, ghi log hoặc commit App Secret/secret thật.

### 2. Callback và webhook phải đăng ký

| Kênh | Callback OAuth | Webhook |
|---|---|---|
| Zalo OA | `${PUBLIC_APP_URL}/api/channels/zalo/callback` | `${PUBLIC_APP_URL}/api/channels/zalo/webhook` |
| Facebook | `${PUBLIC_APP_URL}/api/channels/meta/callback` | `${PUBLIC_APP_URL}/api/channels/meta/webhook` |

Meta webhook dùng giá trị `META_WEBHOOK_VERIFY_TOKEN`; subscribe các field `messages`, `messaging_postbacks`, `message_deliveries`, `message_reads`. App xin đúng các quyền `pages_show_list`, `pages_messaging`, `pages_manage_metadata`, `pages_read_engagement`; dùng Page thuộc đúng `META_PAGE_ID`. Zalo dùng OAuth OA v4 + PKCE và OA secret để xác minh webhook. Tên/quyền trên portal provider có thể thay đổi; khi nộp duyệt phải mô tả luồng nhân viên trả lời khách, URL chính sách riêng tư/xóa dữ liệu và cung cấp tài khoản test chuyên dụng — không dùng tài khoản cá nhân trong tài liệu hay Git.

### 3. Khởi động và cài bảo trì 12 giờ

```powershell
docker compose up -d --build
docker compose ps
powershell -NoProfile -ExecutionPolicy Bypass -File .\windows\Cai-Bao-Tri-Kenh.ps1
```

Script đọc `PUBLIC_APP_URL` từ môi trường hoặc `.env`, đọc secret từ môi trường/runtime volume rồi lưu bản host có ACL riêng. Task Scheduler chỉ chứa đường dẫn script/URL, không chứa secret; mỗi 12 giờ gọi `POST /api/internal/channels/maintenance` để refresh token, health check, tải attachment và dọn dữ liệu hết hạn. Kiểm tra an toàn trước khi cài: `powershell -File windows/Cai-Bao-Tri-Kenh.Tests.ps1`.

### 4. Kết nối bằng giao diện

Đăng nhập ZenithTasks bằng ADMIN → **Chăm sóc KH → Hộp thư mới → Cài đặt** → bấm **Kết nối Zalo OA**, đăng nhập/chọn OA → bấm **Kết nối Facebook**, đăng nhập/chọn Fanpage. Hệ thống chỉ nhận tin mới từ `connectedAt`, không nhập lịch sử. Nếu badge `Cần kết nối lại`, ADMIN mở Cài đặt và bấm kết nối lại; không sửa token trực tiếp trong DB.

### 5. Gate trước khi bật thật

Giữ `OMNICHANNEL_ENABLED=false` cho tới khi hoàn thành trên tài khoản test riêng của cả hai provider:

1. Callback OAuth quay về trang Cài đặt và health badge hợp lệ.
2. Webhook sai chữ ký bị 401; webhook đúng tạo đúng một tin khi gửi lặp cùng event.
3. Gửi một tin từ tài khoản test vào OA/Page, thấy tin mới trong ZenithTasks, trả lời text và một ảnh/PDF thành công.
4. CARE chỉ thấy hội thoại chưa giao/của mình; SHAREHOLDER không mở được inbox/attachment.
5. Không có token/App Secret trong HTML, log, `git grep` hoặc lịch sử Git.

Sau khi đạt, đổi `OMNICHANNEL_ENABLED=true` và chạy `docker compose up -d`. Nếu provider chưa duyệt hoặc test thật chưa đạt, không bật production.

### 6. Sao lưu, khôi phục và rollback

`windows/Sao-Luu.ps1` phải sao lưu DB, `zenith_uploads`, `zenith_secrets` và `zenith_inbox_attachments`. Khi khôi phục, phục hồi đồng bộ DB + hai volume secret/attachment; chỉ phục hồi DB mà mất khóa token sẽ buộc kết nối lại mọi kênh. Kiểm tra bản sao lưu bằng một lần restore thử trên máy tách biệt.

Rollback nhanh không mất dữ liệu: đặt `OMNICHANNEL_ENABLED=false`, chạy `docker compose up -d` và giữ nguyên migration/bảng/volume. Có thể ngắt từng kênh ở Cài đặt để dừng nhận tin; không xóa bảng hoặc volume. Khi quay lại phiên bản trước, vẫn giữ `zenith_secrets` và `zenith_inbox_attachments` để tái kích hoạt an toàn.
