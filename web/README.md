# Zenith Clinic — Hệ thống quản lý Trung tâm Phẫu thuật Thẩm mỹ

> Lưu ý: phần tài khoản mẫu bên dưới chỉ dành cho QA với dữ liệu giả. Production phải dùng bootstrap admin riêng và không dùng mật khẩu mẫu.

Ứng dụng web đa người dùng cho **Trung tâm Phẫu thuật Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc**:
quản lý lịch hẹn, tiếp nhận khách, tư vấn — dịch vụ, hồ sơ điều trị, thanh toán & công nợ,
chăm sóc khách hàng và báo cáo quản trị.

> Thay thế cho bản phần mềm desktop trước đây bằng một ứng dụng web mượt mà, dễ dùng,
> chạy được trên mọi máy tính/máy tính bảng trong trung tâm.

## Công nghệ

| Thành phần | Lựa chọn |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript |
| Giao diện | Tailwind CSS v4 + Be Vietnam Pro + lucide-react + Recharts |
| Cơ sở dữ liệu | PostgreSQL 16 (qua Prisma 7 + driver adapter) |
| Xác thực | JWT (jose) trong cookie httpOnly + bcrypt, phân quyền theo vai trò |
| Bảo mật SĐT | Mã hoá AES-256-GCM, chỉ lộ 5 số cuối |

## Cài đặt & chạy (môi trường phát triển)

```bash
cd web
npm install                       # cài thư viện (tự chạy "prisma generate")

# 1) Tạo file .env từ mẫu, điền DATABASE_URL, AUTH_SECRET, PHONE_ENC_KEY
cp .env.example .env
#    Sinh khoá:  openssl rand -base64 48   (AUTH_SECRET)
#                openssl rand -base64 32   (PHONE_ENC_KEY)

# 2) Khởi tạo cơ sở dữ liệu (PostgreSQL phải đang chạy — xem docker-compose bên dưới)
npm run db:migrate                # tạo bảng
npm run db:seed                   # QA only: nạp dữ liệu mẫu, không dùng cho dữ liệu thật

# 3) Chạy
npm run dev                       # http://localhost:3000
```

### PostgreSQL bằng Docker (nhanh nhất)

```bash
docker compose up -d              # chạy Postgres 16 ở cổng 5432
# DATABASE_URL="postgresql://zenith:zenith@127.0.0.1:5432/zenith_clinic?schema=public"
```

## Tài khoản QA (chỉ dùng với dữ liệu giả)

Mật khẩu mẫu chỉ dành cho môi trường QA; không dùng seed hoặc mật khẩu này trên cơ sở dữ liệu thật.

| Tài khoản | Vai trò | Thấy được |
|---|---|---|
| `admin` | Quản trị viên | Toàn bộ + báo cáo + nhân sự + danh mục |
| `quanly` | Quản lý | Báo cáo, vận hành (không quản trị hệ thống) |
| `telesale` | Tiếp nhận/Telesale | Lịch hẹn, tiếp nhận khách |
| `letan` | Lễ tân | Tiếp nhận, khách hàng, thu tiền |
| `tuvan1`, `tuvan2` | Tư vấn viên | Hồ sơ mình phụ trách |
| `bacsi1`, `bacsi2` | Bác sĩ | Hồ sơ mình thực hiện, vật tư, ảnh |
| `cskh` | Chăm sóc KH | Tin nhắn chăm sóc |

## Ánh xạ 7 yêu cầu nghiệp vụ → tính năng

1. **Tiếp nhận thông tin / báo lịch hẹn** → `Lịch hẹn` (`/lich-hen`): đặt lịch theo nguồn
   (marketing, CTV, hotline…), xem hôm nay / ngày mai (mấy khách, giờ nào, dịch vụ gì).
2. **Tra cứu theo 5 số cuối, lập hồ sơ, chuyển giao** → `Tiếp nhận khách` (`/tiep-nhan`).
3. **Tư vấn: dịch vụ, giảm giá, thanh toán, công nợ** → `Hồ sơ điều trị` (`/ho-so/[id]`).
4. **Bác sĩ: vật tư, ảnh trước–sau, tái khám** → trong hồ sơ điều trị.
5. **CSKH nhắn tin hiển thị cho quản trị** → `Chăm sóc KH` (`/cham-soc`) + dashboard.
6. **Báo cáo: lịch, doanh thu, tăng trưởng, tỉ lệ tư vấn, hiệu suất** → `Báo cáo` (`/bao-cao`).
7. **Mỗi nhân sự chỉ thấy phần của mình; SĐT ẩn 100%, chỉ tra 5 số cuối** → phân quyền
   theo vai trò + mã hoá SĐT (xem `src/lib/phone.ts`, `src/lib/rbac.ts`).

## Bảo mật số điện thoại (Yêu cầu #7)

- SĐT đầy đủ được **mã hoá AES-256-GCM** (`phoneEnc`), **không bao giờ** gửi ra giao diện.
- Chỉ lưu & hiển thị **5 số cuối** (`phoneLast5`) để tra cứu.
- Băm HMAC (`phoneHash`) để chống trùng hồ sơ mà không cần giải mã.
- Giải mã chỉ thực hiện phía máy chủ khi cần gửi tin (Zalo/SMS — tích hợp sau).

## Triển khai (production)

```bash
npm run build
npm run db:deploy        # áp dụng migration trên DB thật
npm run start            # chạy server Node.js
```

- Đặt biến môi trường `DATABASE_URL`, `AUTH_SECRET`, `PHONE_ENC_KEY` trên máy chủ.
- Chạy được trên **máy chủ nội bộ** phòng khám hoặc **đám mây** (chỉ cần PostgreSQL).
- Ảnh và giấy tờ được lưu ngoài `public/` (mặc định `private/uploads`) và chỉ phát qua route đã xác thực.
  Docker cần volume bền vững; Vercel/serverless cần cấu hình object storage trước khi bật upload.

## Cấu trúc thư mục

```
web/
├── prisma/schema.prisma      # mô hình dữ liệu
├── prisma/seed.ts            # dữ liệu mẫu
├── src/lib/                  # db, auth, phone, rbac, money, dates, queries
├── src/components/ui/        # bộ giao diện dùng chung
├── src/app/login/            # đăng nhập
├── src/app/(app)/            # khu vực đã đăng nhập (sidebar + topbar)
│   ├── dashboard, lich-hen, tiep-nhan, khach-hang, ho-so,
│   └── cham-soc, bao-cao, lich-lam-viec, nhan-su, danh-muc
└── src/proxy.ts              # bảo vệ route (thay cho middleware ở Next 16)
```

## Hộp thư chăm sóc đa kênh

- Mã nguồn provider/domain: `src/lib/channels/`; OAuth/webhook/attachment: `src/app/api/channels/`; UI: `src/app/(app)/cham-soc/`.
- Cờ `OMNICHANNEL_ENABLED` mặc định `false`. ADMIN quản lý kênh ở `/cham-soc/cai-dat`; ADMIN/MANAGER/CARE dùng inbox theo capability `inbox.*`; SHAREHOLDER bị hard-deny nội dung hội thoại.
- Token OAuth dùng `CHANNEL_TOKEN_ENC_KEY`; route bảo trì dùng `CHANNEL_MAINTENANCE_SECRET`; tệp inbox ở volume riêng ngoài `public/`.
- Docker tự sinh và giữ hai secret kênh khi để trống. Xem cấu hình provider, callback, scheduler và release gate tại [`DEPLOY.md`](DEPLOY.md#hộp-thư-zalo-oa--facebook-fanpage).
