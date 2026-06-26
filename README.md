# Ứng dụng quản trị — Trung tâm Phẫu thuật Tạo hình Thẩm mỹ (BVĐK Hồng Phúc)

Ứng dụng web **nội bộ** quản lý phòng khám thẩm mỹ: tiếp nhận khách, lịch hẹn, hồ sơ điều trị
(dịch vụ · vật tư · thanh toán · ảnh trước/sau/tái khám/cận lâm sàng), chăm sóc khách, báo cáo
doanh thu & lãi/lỗ, nhân sự, chấm công, lương/hoa hồng, kho, sổ thu chi, cộng tác viên, hiệu suất.
Có **cổng khách hàng** (link riêng) và **đặt lịch online**.

> Toàn bộ ứng dụng nằm trong thư mục **`web/`**. Stack: Next.js 16 + React 19 + TypeScript +
> Tailwind v4 + PostgreSQL/Prisma 7, chạy bằng Docker.

---

## 📖 Đọc gì trước? (dành cho lập trình viên / AI tiếp quản)

| File | Nội dung |
|------|----------|
| **[`web/BAN-GIAO.md`](web/BAN-GIAO.md)** | **BẮT ĐẦU TỪ ĐÂY.** Bàn giao kỹ thuật đầy đủ, tự chứa: kiến trúc, mô hình dữ liệu, phân quyền, logic nghiệp vụ, quy ước phát triển bắt buộc, bảo mật, cách chạy/kiểm thử, cạm bẫy đã gặp. Đọc file này là làm việc được ngay. |
| [`web/DU-AN.md`](web/DU-AN.md) | Nhật ký thay đổi chi tiết theo từng đợt (lịch sử + lý do từng quyết định). |
| [`web/AGENTS.md`](web/AGENTS.md) | Lưu ý: Next.js 16 khác bản cũ — đọc docs trong `node_modules/next/dist/docs/` trước khi viết. |
| [`web/DEPLOY.md`](web/DEPLOY.md) | Hướng dẫn triển khai & vận hành chi tiết. |
| [`PROJECT-OVERVIEW.md`](PROJECT-OVERVIEW.md) | Bản giới thiệu tổng quan dự án. |

> Nếu bạn dùng Claude Code: `web/CLAUDE.md` tự nạp 3 tài liệu nền (`AGENTS.md`, `BAN-GIAO.md`, `DU-AN.md`) vào ngữ cảnh mỗi phiên.

## 🚀 Chạy nhanh

**Bằng Docker (giống vận hành thật):** tại thư mục gốc
```bash
cp .env.example .env       # điền khoá nếu muốn; để trống = tự sinh an toàn
docker compose up --build
# Mở http://localhost:3000 — đăng nhập lần đầu: admin / 123456 (ĐỔI NGAY)
```

**Lập trình (dev):**
```bash
cd web
npm install
npx prisma generate
npx prisma migrate deploy          # cần DATABASE_URL trỏ tới PostgreSQL
npm run dev                        # http://localhost:3000
npx tsc --noEmit && npx vitest run # kiểm tra biên dịch + test
```

**Triển khai trên máy Windows (máy chủ phòng khám):** dùng các script trong [`windows/`](windows/)
(`Chay-Zenith.bat` để cài/chạy, `Sua-Loi.bat` để cập nhật sạch, `Sao-Luu.ps1` để sao lưu).

## 🔐 Bảo mật (đọc kỹ trước khi chia sẻ)
- **Repo phải để PRIVATE.** Dữ liệu khách hàng thật (SĐT mã hoá AES-256-GCM) nằm trên máy chủ phòng khám, KHÔNG nằm trong repo.
- Khoá bí mật (`AUTH_SECRET`) tự sinh mỗi máy, lưu trong volume Docker, **không commit**. `PHONE_ENC_KEY` đang dùng khoá DEMO tương thích — đổi khoá phải mã hoá lại dữ liệu (xem `web/DEPLOY.md`).
- File `.env` (khoá thật) **không bao giờ** được commit. Mẫu ở `.env.example`.

## 🗺️ Cấu trúc kho
```
web/        Ứng dụng Next.js (mã nguồn chính)
windows/    Script .bat/.ps1 cài đặt & vận hành trên Windows
client/     App máy con (mở trình duyệt vào máy chủ)
docker-compose.yml   Chạy toàn hệ thống (web + PostgreSQL) — dùng khi vận hành
.env.example         Mẫu cấu hình khoá/biến môi trường
```
