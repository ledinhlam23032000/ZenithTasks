# Dự án: Ứng dụng nội bộ quản trị — Trung tâm Phẫu thuật Tạo hình Thẩm mỹ, BVĐK Hồng Phúc

> Tài liệu bàn giao để các phiên Claude Code sau tiếp tục hiệu quả. Đọc file này + mã nguồn là nắm được bối cảnh.

## Tổng quan
- Web app Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4, PostgreSQL + Prisma 7 (driver adapter `@prisma/adapter-pg`), JWT (jose) + bcryptjs. Toàn bộ trong thư mục `web/`.
- Mô hình vận hành: 1 **máy chủ** (máy của trung tâm, chạy Docker, giữ dữ liệu) + nhiều **máy con** kết nối qua trình duyệt/PWA. Triển khai bằng các file trong `windows/` (`Chay-Zenith.bat` = cài/cập nhật; `Mo-App.bat` = mở; `Phat-Hanh-Mang.bat`/`Dia-Chi-Co-Dinh.bat` = ra Internet). Ứng dụng máy con: `client/`.

## Thương hiệu (BẮT BUỘC giữ đúng)
- Tên chính thức: **Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc**. KHÔNG dùng "Zenith" hay tên ngắn "Thẩm mỹ Hồng Phúc".
- Màu thương hiệu: **ĐỎ hoa phượng** (brand = đỏ, `#dc2626`; nhấn = vàng gold). Định nghĩa ở `web/src/app/globals.css` (`--color-brand-*`, `--color-accent-*`).
- Tác giả/hỗ trợ: GĐĐH — BS. Lê Đình Lam · 0941 567 496.

## Cơ chế lương (đã lập trình trong `web/src/lib/payroll.ts`)
- Lương cứng theo **ngày công** (× ngày công ÷ ngày chuẩn, mặc định 26). Lương cứng mặc định: BS 10tr, Điều dưỡng/Tư vấn 8tr (đặt riêng qua trang Lương).
- Tư vấn viên: % theo **tổng doanh thu tháng**, tách khách mới (≤500tr 3% · 500–800 4% · ≥800 5%) / khách cũ (≤200 4% · 200–500 5% · ≥500 6%).
- Bác sĩ: 8% dịch vụ + 10% tư vấn khách cũ. Điều dưỡng: 100k/ca (nhập tay) + 4% tư vấn.
- Thưởng nóng/điều chỉnh nhập tay theo tháng (bảng `PayrollEntry`). Khách "mới" = hồ sơ đầu tiên của khách; "cũ" = đã có hồ sơ trước.

## Quy ước kỹ thuật quan trọng
- **Xóa / xác nhận**: dùng `DeleteButton` / `ConfirmButton` (gọi server action TRỰC TIẾP qua `useTransition` + `router.refresh()`, KHÔNG dùng `<form action>` cho nút xóa vì hay treo ở production).
- **Sửa (edit)**: modal dùng `useActionState` (xem `danh-muc/catalog-forms.tsx` làm mẫu) HOẶC pattern programmatic như trên.
- Đăng nhập KHÔNG phân biệt hoa/thường (`findFirst` + `mode:"insensitive"`). Phiên 30 ngày.
- Múi giờ VN (TZ trong docker-compose). Ngày chấm công dùng `vnDateOnly()` (`web/src/lib/dates.ts`).
- Prisma client lazy (Proxy) ở `web/src/lib/db.ts` — build không cần DATABASE_URL.
- `next.config.ts`: `serverActions.bodySizeLimit: 12mb` (tải ảnh), `allowedOrigins` qua env `APP_ORIGINS`.
- Sau khi đổi schema: `prisma migrate dev` + commit migration (entrypoint chạy `migrate deploy`).

## CÒN LÀM (TODO) — thêm nút "Sửa" cho ADMIN ở các phần còn thiếu
Đã có Sửa: Khách hàng, Hồ sơ (thông tin), **Dịch vụ & Vật tư (danh mục)**.
Chưa có Sửa (cần bổ sung):
- **Lịch hẹn**: sửa giờ/dịch vụ/tư vấn/khách (hiện chỉ đổi trạng thái + xóa).
- **Dịch vụ trong hồ sơ** (CaseService): sửa đơn giá/SL/giảm giá.
- **Vật tư trong hồ sơ** (MaterialUsage): sửa số lượng.
- **Thanh toán** (Payment): sửa số tiền/hình thức.
- **Ca làm việc** (Shift): sửa giờ.
- **Nhân sự**: sửa họ tên/vai trò/SĐT.
- (Cân nhắc) nhân sự bệnh viện điều động: cờ "lương cố định, không trừ ngày công".

## Cách chạy/kiểm thử nhanh trong sandbox
- PG: `pg_ctlcluster 16 main start`; `DATABASE_URL=postgresql://zenith:zenith_dev_pw@127.0.0.1:5432/zenith_clinic?schema=public`.
- Kiểm tra biên dịch: `cd web && npx tsc --noEmit` (full `next build` hay bị kill vì RAM trong sandbox — dùng tsc).
- Dev: `npx next dev -p <port>`.
