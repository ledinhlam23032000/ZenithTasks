# Zenith Clinic — Hệ thống quản lý Trung tâm Phẫu thuật Thẩm mỹ

> Lưu ý: phần tài khoản mẫu bên dưới chỉ dành cho QA với dữ liệu giả. Production phải dùng bootstrap admin riêng và không dùng mật khẩu mẫu.

Ứng dụng web đa người dùng cho **Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc**.

> Tài liệu tiếp quản chuẩn ở root: [`../docs/INDEX.md`](../docs/INDEX.md), [`../docs/AI-ADMIN-GATEWAY.md`](../docs/AI-ADMIN-GATEWAY.md), [`../docs/OPERATIONS-RUNBOOK.md`](../docs/OPERATIONS-RUNBOOK.md), [`../VERSION.md`](../VERSION.md) và [`../UPGRADE-HANDOFF-2026-08.md`](../UPGRADE-HANDOFF-2026-08.md).

Ứng dụng web đa người dùng cho **Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc**:
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
pnpm install --frozen-lockfile    # cài đúng lockfile; tự chạy prisma generate

# 1) Tạo file .env từ mẫu, điền DATABASE_URL, AUTH_SECRET, PHONE_ENC_KEY
cp .env.example .env
#    Sinh khoá:  openssl rand -base64 48   (AUTH_SECRET)
#                openssl rand -base64 32   (PHONE_ENC_KEY)

# 2) Khởi tạo cơ sở dữ liệu (PostgreSQL phải đang chạy — xem docker-compose bên dưới)
pnpm exec prisma migrate deploy   # áp dụng migration đã commit; không reset database
pnpm run db:seed                   # QA only: nạp dữ liệu mẫu, không dùng cho dữ liệu thật

# 3) Chạy
pnpm dev                          # http://localhost:3000
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
pnpm build
pnpm exec prisma migrate deploy   # áp dụng migration trên DB thật
pnpm start                         # chạy server Node.js
```

- Đặt biến môi trường `DATABASE_URL`, `AUTH_SECRET`, `PHONE_ENC_KEY` trên máy chủ.
- Chạy được trên **máy chủ nội bộ** phòng khám hoặc **đám mây** (chỉ cần PostgreSQL).
- Ảnh và giấy tờ được lưu ngoài `public/` (mặc định `private/uploads`) và chỉ phát qua route đã xác thực.
  Docker cần volume bền vững; Vercel/serverless cần cấu hình object storage trước khi bật upload.

## Cấu hình Trợ lý AI và giọng nói

Trợ lý AI chạy hoàn toàn phía máy chủ qua `AI_API_KEY`, `AI_BASE_URL` và `AI_MODEL`; không đặt khóa trong Client Component. Có thể tách model lập kế hoạch và model viết câu trả lời bằng `AI_AGENT_MODEL` và `AI_WRITER_MODEL`. Model planner nên ưu tiên khả năng suy luận/structured JSON, còn writer nên ưu tiên tiếng Việt tự nhiên và độ trễ thấp. `AI_TIMEOUT_MS` kiểm soát thời gian chờ mỗi lượt gọi và `AI_MAX_RETRIES` giới hạn retry cho lỗi tạm thời như 429 hoặc 5xx.

Chế độ giọng nói dùng `MediaRecorder` trong trình duyệt, gửi audio đến `/api/assistant/transcribe`, rồi chuyển thành transcript để người dùng xem/sửa trước khi gửi cho agent. Mặc định máy chủ dùng `VOICE_PROVIDER=openai-compatible` với endpoint `/audio/transcriptions`. Có thể dùng `VOICE_PROVIDER=whisper-cpp`, trỏ `VOICE_BASE_URL` tới whisper-server nội bộ (mặc định endpoint upstream là `/inference`) và không cần `VOICE_API_KEY`. whisper-server phải chạy nội bộ hoặc sau firewall; không mở trực tiếp endpoint upload của nó ra internet. Nếu chưa có cấu hình speech-to-text, ứng dụng vẫn giữ fallback SpeechRecognition của trình duyệt khi trình duyệt hỗ trợ; không nên coi fallback này là đường voice production vì khả năng hỗ trợ và chất lượng phụ thuộc browser.

Ví dụ cấu hình tối thiểu:

```dotenv
AI_API_KEY="..."
AI_BASE_URL="https://api.deepseek.com"
AI_MODEL="deepseek-chat"
AI_AGENT_MODEL="deepseek-reasoner"
AI_WRITER_MODEL="deepseek-chat"
AI_TIMEOUT_MS="30000"
AI_MAX_RETRIES="2"
VOICE_API_KEY="..."
VOICE_BASE_URL="https://api.openai.com/v1"
VOICE_MODEL="whisper-1"
```

Các thao tác đọc được chạy ngay theo quyền; thao tác ghi, tiền, lương, hồ sơ y khoa, xóa và bulk action vẫn phải qua preview, approval, audit và kiểm tra trạng thái thật. Sau khi thay đổi cấu hình hoặc code, chạy `pnpm exec prisma generate`, `pnpm exec tsc --noEmit`, `pnpm test` và `pnpm build`.

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

- Mã nguồn: `src/lib/channels/` (Zalo OA + Facebook), route webhook/OAuth: `src/app/api/webhooks/`, `src/app/api/integrations/zalo/`; UI: `src/app/(app)/cham-soc/hop-thu`, `src/app/(app)/cham-soc/ket-noi`.
- Chi tiết kiến trúc, biến môi trường và cách kết nối: xem mục "Kênh giao tiếp (Omnichannel)" trong [`BAN-GIAO.md`](BAN-GIAO.md).
