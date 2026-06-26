# LỘ TRÌNH NÂNG CẤP — App quản trị BVĐK Hồng Phúc

> Tài liệu KẾ HOẠCH + THEO DÕI tiến độ cho người/AI tiếp quản. Đọc cùng `web/BAN-GIAO.md`
> (kiến trúc) và `web/DU-AN.md` (changelog chi tiết). Khi làm xong 1 mục, đổi trạng thái ở đây.
>
> **Ký hiệu trạng thái:** ✅ Xong · ⏳ Chưa làm · 🔑 Cần chủ cấp khoá/tài khoản · 🧪 Cần kiểm thử thực tế

---

## Bối cảnh
App nội bộ quản trị phòng khám thẩm mỹ (Next.js 16 + Prisma 7 + Postgres), chạy 1 máy chủ tại
phòng khám. Kế hoạch chia 5 nhóm A→E: **A củng cố nền tảng (ổn định/an toàn)**, **B nghiệp vụ mới**,
**C phân tích/BI**, **D trải nghiệm/sáng tạo**, **E chất lượng mã**. Chi tiết lý do từng mục: xem
phần "Đánh giá" trong lịch sử hội thoại + `web/DU-AN.md`.

---

## NHÓM A — CỦNG CỐ NỀN TẢNG (ổn định & an toàn)

| Mã | Hạng mục | Trạng thái | Ghi chú |
|----|----------|-----------|---------|
| A1 | **Xác thực ảnh y khoa** (route `/media`) | ✅ Xong | Route yêu cầu đăng nhập HOẶC vé ký ngắn hạn; cổng khách ký vé/ảnh. Xem mục "Đã làm" bên dưới. |
| A2 | **Cảnh báo khoá mã hoá mặc định** | ✅ Xong | Banner đỏ cho ADMIN khi `PHONE_ENC_KEY` = khoá demo. 🔑 Chủ cần đặt khoá thật + `npm run rotate:phone`. |
| A3 | **Giao dịch nguyên tử cho tiền** | ✅ Xong | `withCaseLock` + `$transaction` + `SELECT … FOR UPDATE` cho mọi thao tác động tới tiền. |
| A4 | **Test toán tiền & token ảnh** | ✅ Xong | `case-math.test.ts` (8) + `media-token.test.ts` (7). Tổng test: 25 → 40. |
| A6 | **Content-Security-Policy** | ✅ Xong | Thêm CSP + giữ các header cũ trong `next.config.ts`. |
| A5 | **Sao lưu tự động + theo dõi** | ✅ Xong (tại chỗ) | `scripts/backup.mjs` (pg_dump -Fc + ảnh tar.gz + giữ 14 bản) chạy nền hằng ngày qua `docker-entrypoint.sh`; trang Tình trạng hệ thống hiện "lần sao lưu gần nhất". 🔑 Đẩy offsite vẫn dùng `windows/Sao-Luu.ps1`. |
| A7 | **Trang "Tình trạng hệ thống"** | ✅ Xong | `/he-thong` (ADMIN): cảnh báo bảo mật, quy mô dữ liệu, kích thước DB/ảnh, lần sao lưu gần nhất, hoạt động nhạy cảm gần đây. (`lib/system-status.ts`) |

## NHÓM B — TÍNH NĂNG NGHIỆP VỤ MỚI

| Mã | Hạng mục | Trạng thái | Ghi chú |
|----|----------|-----------|---------|
| B1 | **Trung tâm nhắc & thông báo tự động** | ✅ Phần lõi xong | Trang **"Việc cần làm hôm nay"** (`/viec-hom-nay`) tổng hợp tự động: tái khám đến hạn, hẹn chưa đến, công nợ quá hạn, sinh nhật khách, khách nguội, kho cảnh báo (`lib/workqueue.ts`, không đổi schema). ⏳ Còn: Web Push lên điện thoại + việc có người phụ trách/đánh dấu xong (cần schema + cron + VAPID). |
| B2 | **Kênh giao tiếp** (Zalo/SMS/Email) | ⏳ Chưa làm | Bậc 1 (deep-link) làm được ngay. 🔑 Bậc 2–3 cần tài khoản SMS/Email/Zalo OA. |
| B3 | **Sổ công nợ chủ động** | ⏳ Chưa làm | Lọc theo tuổi nợ, kế hoạch trả góp, cảnh báo vượt ngưỡng. |
| B4 | **Lịch hẹn nâng cao** | ⏳ Chưa làm | Chống trùng lịch, tài nguyên phòng/giường, link khách tự xác nhận. |
| B5 | **Kho theo chuẩn y tế** | ⏳ Chưa làm | FEFO theo hạn dùng, phiếu nhập kho + giá vốn, định mức vật tư/dịch vụ. |
| B6 | **Hồ sơ y khoa chuẩn** | ⏳ Chưa làm | Phiếu đồng ý (consent) ký số, tiền sử/dị ứng/chống chỉ định, mẫu hồ sơ. |

## NHÓM C — PHÂN TÍCH & RA QUYẾT ĐỊNH (BI)

| Mã | Hạng mục | Trạng thái | Ghi chú |
|----|----------|-----------|---------|
| C1 | **Giữ chân khách (RFM/Cohort)** + radar khách rời bỏ | ⏳ Chưa làm | Tự sinh danh sách khách nguy cơ rời bỏ → đẩy vào workqueue B1. |
| C2 | **LTV & dự báo doanh thu** | ⏳ Chưa làm | Giá trị vòng đời theo nguồn/CTV; dự báo theo xu hướng + lịch hẹn. |
| C3 | **ROI theo kênh nguồn** | ⏳ Chưa làm | Doanh thu/khách theo nguồn vs chi phí marketing. |
| C4 | **Phễu chuyển đổi** | ⏳ Chưa làm | Hẹn → đến → tư vấn → chốt → thanh toán. |

## NHÓM D — TRẢI NGHIỆM & SÁNG TẠO

| Mã | Hạng mục | Trạng thái | Ghi chú |
|----|----------|-----------|---------|
| D1 | **AI trợ lý vận hành** | ⏳ Chưa làm | 🔑 Cần `ANTHROPIC_API_KEY`. Hỏi đáp số liệu, tóm tắt hồ sơ, gợi ý upsell (có người duyệt). |
| D2 | **So sánh ảnh trước/sau (slider)** | ⏳ Chưa làm | Kéo so sánh, đóng dấu ngày/logo, xuất ảnh ghép. "Wow factor" đúng ngành. |
| D3 | **Cổng khách hàng nâng cao** | ⏳ Chưa làm | Khách tự đặt lại lịch, xác nhận hẹn, đánh giá (NPS). Token có hạn dùng. |
| D4 | **Tìm kiếm toàn cục (Ctrl/Cmd+K)** | ⏳ Chưa làm | Command palette tìm khách/hồ sơ/dịch vụ/menu. |
| D5 | **Màn "đầu ca lễ tân"** | ⏳ Chưa làm | Gộp hẹn hôm nay + khách chờ + việc cần làm + cảnh báo kho. |

## NHÓM E — CHẤT LƯỢNG MÃ NGUỒN

| Mã | Hạng mục | Trạng thái | Ghi chú |
|----|----------|-----------|---------|
| E1 | Sửa tài liệu phóng đại LOC (60k → ~15k thực) | ✅ Xong | Sửa trong `PROJECT-OVERVIEW.md`. |
| E2 | Tách tầng domain cho logic tiền | ✅ Một phần | `lib/case-math.ts` (toán thuần, có test). Còn các module khác có thể tách dần. |
| E3 | Dọn cảnh báo lint biến không dùng | ⏳ Chưa làm | Vài action có biến `m`/`name` không dùng. |

---

## CHI TIẾT ĐỢT 1 — Đã làm (củng cố nền tảng)

> Mục tiêu: app "ổn" (tiền đúng, dữ liệu y khoa không lộ, không sập). Toàn bộ tự kiểm thử
> trong sandbox (TSC pass, 40/40 test). Chủ chỉ cần `Sua-Loi.bat` để cập nhật.

### A1 — Xác thực ảnh y khoa
- **Vấn đề:** route `/media/[file]` phục vụ ảnh trước/sau + cận lâm sàng cho BẤT KỲ ai có link.
- **Sửa:**
  - `web/src/lib/media-token.ts` (mới): ký/kiểm "vé" ngắn hạn HMAC-SHA256 bằng `AUTH_SECRET`
    (`signMediaToken`, `verifyMediaToken`, `withMediaToken`). Vé gắn đúng 1 tệp + hạn 24h.
  - `web/src/app/media/[file]/route.ts`: chỉ phục vụ khi **đã đăng nhập** (cookie phiên) HOẶC
    có **vé `?t=` hợp lệ**. Không thì trả `401`.
  - `web/src/app/khach/[token]/page.tsx` (cổng khách, công khai): ký vé cho từng ảnh qua
    `withMediaToken` trước khi đưa vào `PhotoGallery`.
  - Trang nhân viên (`ho-so`, `khach-hang`) KHÔNG cần đổi: trình duyệt tự gửi cookie phiên.
- **Đã kiểm thử (dev server thực):** không vé → 401 · vé đúng → 200 · vé sai/khác tệp → 401.

### A2 — Cảnh báo khoá mã hoá mặc định
- `web/src/lib/security-status.ts` (mới): `securityWarnings()` phát hiện `PHONE_ENC_KEY` đang
  dùng khoá DEMO công khai.
- `web/src/app/(app)/layout.tsx`: hiện **banner đỏ cho ADMIN** nếu có cảnh báo.
- **KHÔNG hard-fail** khi khởi động (tránh sập phòng khám đang chạy bằng khoá demo + mất khả
  năng giải mã). 🔑 Việc của chủ: đặt `PHONE_ENC_KEY` riêng trong `.env` rồi `npm run rotate:phone`.

### A3 — Giao dịch nguyên tử cho luồng tiền
- **Vấn đề:** `recalc()` + thêm/sửa/xóa thanh toán/dịch vụ/voucher KHÔNG nằm trong giao dịch →
  hai người thao tác cùng lúc trên 1 hồ sơ có thể ghi đè số liệu của nhau.
- **Sửa (`web/src/app/(app)/ho-so/actions.ts`):**
  - `withCaseLock(caseId, fn)`: chạy trong `prisma.$transaction` + `SELECT id FROM "CaseRecord"
    WHERE id = … FOR UPDATE` (khoá hàng hồ sơ → các thao tác tiền trên cùng hồ sơ chạy tuần tự).
  - `recalc(caseId, db)` nhận client giao dịch (`tx`).
  - Đã bọc: `addCaseService`, `updateCaseService`, `removeCaseService`, `updateCaseVoucher`,
    `addPayment`, `updatePayment`, `deletePayment`.

### A4 — Test toán tiền & token ảnh
- `web/src/lib/case-math.ts` (mới): `computeCaseTotals()` — toán thuần (subtotal/voucher/net/
  paid/debt), KHÔNG phụ thuộc DB. `recalc()` nay dùng hàm này.
- `web/src/lib/__tests__/case-math.test.ts` (8 test) + `media-token.test.ts` (7 test).

### A6 — Content-Security-Policy
- `web/next.config.ts`: thêm header `Content-Security-Policy` (giữ `'unsafe-inline'`/`'unsafe-eval'`
  vì Next cần — có thể siết bằng nonce sau) + `object-src 'none'`, `base-uri`, `form-action`,
  `frame-ancestors`.

---

## CHI TIẾT ĐỢT 2 — Đã làm (chủ động + theo dõi)

> Tự kiểm thử: TSC pass, 40/40 test; smoke test dev server thật (2 trang mới + hồ sơ đều 200, backup tạo dump khôi phục được).

### B1 (lõi) — Trang "Việc cần làm hôm nay" (`/viec-hom-nay`)
- `web/src/lib/workqueue.ts`: `getWorkqueue()` tổng hợp **từ dữ liệu sẵn có, KHÔNG đổi schema, KHÔNG cần cron**:
  tái khám đến hạn (2 ngày tới), hẹn hôm nay chưa đến, công nợ quá hạn (>15 ngày), sinh nhật khách hôm nay,
  khách nguội (>60 ngày chưa quay lại + không có lịch tái khám), kho cảnh báo. Các ngưỡng là hằng số đầu file (dễ chỉnh).
- `web/src/app/(app)/viec-hom-nay/page.tsx`: trang gom theo nhóm + đếm + link xử lý từng việc.
- Module `viec-hom-nay` trong `permissions.ts` (ADMIN/MANAGER/TELESALE/RECEPTION/CONSULTANT/DOCTOR/CARE); icon `ListTodo`.
- ⏳ **Bước kế (B1 phần 2):** Web Push (PWA — tự tải VAPID), việc có người phụ trách + đánh dấu xong (cần model mới + cron).

### A7 — Trang "Tình trạng hệ thống" (`/he-thong`, ADMIN)
- `web/src/lib/system-status.ts`: gom cảnh báo bảo mật, quy mô dữ liệu, kích thước DB (`pg_database_size`),
  dung lượng ảnh (quét `public/uploads`), lần sao lưu gần nhất (đọc `backup-status.json`), 10 hoạt động nhạy cảm gần đây.
- Module `he-thong` (ADMIN); icon `ServerCog`. Banner cảnh báo bảo mật cũng hiện ở đây + ở layout chung (A2).

### A5 — Sao lưu tự động + theo dõi
- `web/scripts/backup.mjs`: `pg_dump -Fc` (nén, khôi phục bằng `pg_restore`) + ảnh `tar.gz`, giữ 14 bản gần nhất,
  ghi `backup-status.json` (trang A7 đọc). Bắt lỗi → ghi error vào status.
- `web/package.json`: thêm script `npm run backup`.
- `web/docker-entrypoint.sh`: chạy nền 1 lần lúc khởi động rồi mỗi 24h.
- 🔑 Sao lưu RA NGOÀI (Google Drive/USB) vẫn là `windows/Sao-Luu.ps1` — đó mới là phục hồi thảm hoạ.

---

## QUY TRÌNH LÀM VIỆC (cho phiên sau)
1. Chạy `web/BAN-GIAO.md` mục 10 để dựng sandbox. **Lưu ý proxy:** trong môi trường này, tải
   Prisma engine cần đi qua proxy — đặt `HTTPS_PROXY` + `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`
   và `CHECKPOINT_DISABLE=1`; nếu `npm install` lỗi ECONNRESET ở `@prisma/engines`, tải engine bằng
   `curl --proxy` rồi `gunzip` vào `node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x`.
2. Làm theo thứ tự ưu tiên: hết Nhóm A (A5, A7) → B1 (giá trị cao nhất) → D2/D4/D5 → C → còn lại.
3. Mỗi mục: viết code + test → `npx tsc --noEmit` + `npx vitest run` → commit (tiếng Việt) →
   cập nhật trạng thái ở bảng trên + ghi changelog vào `web/DU-AN.md`.

## VIỆC CỦA CHỦ (🔑 — làm khi rảnh, không gấp)
- Đặt `PHONE_ENC_KEY` riêng + `npm run rotate:phone` (tắt banner đỏ A2).
- Đổi mật khẩu `admin/123456`.
- Khi muốn bật: cấp `ANTHROPIC_API_KEY` (AI), tài khoản SMS/Email/Zalo OA (gửi tin thật),
  nơi đẩy backup offsite (A5).
- Mỗi lần có bản mới: chạy `windows/Sua-Loi.bat` trên máy chủ phòng khám.
