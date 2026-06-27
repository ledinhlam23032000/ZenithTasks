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
| B2 | **Kênh giao tiếp** (Zalo/SMS/Email) | ✅ Bậc 1 | ✅ Nút Gọi/SMS/Zalo deep-link kèm mẫu tin (Đợt 5). 🔑 Bậc 2–3 (gửi thật, tự động) cần tài khoản SMS/Email/Zalo OA — Email cũng cần thêm field email cho Customer. |
| B3 | **Sổ công nợ chủ động** | ✅ Một phần | ✅ Trang `/cong-no`: lọc theo tuổi nợ + cảnh báo vượt ngưỡng + nút liên hệ (Đợt 5). ⏳ Còn: kế hoạch trả góp (cần schema mới). |
| B4 | **Lịch hẹn nâng cao** | ⏳ Chưa làm | Chống trùng lịch, tài nguyên phòng/giường, link khách tự xác nhận. |
| B5 | **Kho theo chuẩn y tế** | ✅ Một phần | ✅ Giá vốn bình quân + giá trị tồn kho + COGS (Đợt 4). ✅ Cảnh báo FEFO/hạn dùng (đã có ở B1). ⏳ Còn: định mức vật tư/dịch vụ (BOM), phiếu nhập kho nhiều dòng. |
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
| D2 | **So sánh ảnh trước/sau (slider)** | ✅ Xong | Kéo so sánh (clip-path), chọn ảnh trái/phải bất kỳ. Chưa làm: đóng dấu ngày/logo, xuất ảnh ghép. |
| D3 | **Cổng khách hàng nâng cao** | ⏳ Chưa làm | Khách tự đặt lại lịch, xác nhận hẹn, đánh giá (NPS). Token có hạn dùng. |
| D4 | **Tìm kiếm toàn cục (Ctrl/Cmd+K)** | ✅ Xong | Command palette tìm khách/hồ sơ/vật tư + điều hướng menu. |
| D5 | **Màn "đầu ca lễ tân"** | ✅ Xong | Gộp khách chưa đến + đang chờ + việc tồn đọng (link `/viec-hom-nay`). |

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

## CHI TIẾT ĐỢT 3 — Đã làm (trải nghiệm & sáng tạo)

> Tự kiểm thử: TSC pass, 40/40 test; smoke test dev server thật (forge JWT `zsession` bằng
> `AUTH_SECRET` trong `.env` mới tạo cho sandbox — xem `web/BAN-GIAO.md` mục 10). `/dau-ca`,
> `/khach-hang/[id]` (nút so sánh ảnh), `/khach-hang` (nút Tìm kiếm + `Ctrl+K`) đều trả 200 và
> hiện đúng nội dung (kiểm bằng `grep` chuỗi tiếng Việt trong HTML trả về).

### D2 — So sánh ảnh trước/sau (slider)
- `web/src/components/ui/photo-compare.tsx` (mới): `PhotoCompareButton({photos})` — ẩn nếu
  < 2 ảnh; mở modal `PhotoCompareModal` cho chọn ảnh trái/phải (mặc định: trái = ảnh BEFORE đầu
  tiên, phải = ảnh không-BEFORE gần nhất), kéo `CompareSlider` bằng con trỏ
  (`onPointerDown/Move/Up/Leave`, không cần thư viện ngoài) — dùng `clip-path: inset(...)` để
  lộ dần ảnh trái theo vị trí kéo.
- Gắn nút vào `web/src/app/(app)/ho-so/[id]/page.tsx` (cạnh nút tải ảnh) và
  `web/src/app/(app)/khach-hang/[id]/page.tsx` (trong `CardHeader` ảnh).
- ⏳ Chưa làm: đóng dấu ngày/logo lên ảnh, xuất ảnh ghép (cần canvas render phía client).

### D4 — Tìm kiếm toàn cục (Ctrl/Cmd+K)
- `web/src/lib/search-actions.ts` (mới): `globalSearch(query)` — tìm Khách hàng (tên/mã/5 số
  cuối SĐT), Hồ sơ điều trị (mã/tên khách), Vật tư (tên); mỗi loại giới hạn 6 kết quả, lọc theo
  quyền hiện có (`moduleCan`) — người không có quyền vào mục đó sẽ không thấy kết quả mục đó.
- `web/src/components/layout/command-palette.tsx` (mới): `CommandPalette({nav, open,
  onOpenChange})` — input debounce 200ms gọi `globalSearch`, gộp thêm kết quả khớp tên trong
  menu điều hướng; điều khiển bằng bàn phím (↑↓ Enter Esc).
- `web/src/components/layout/app-shell.tsx`: thêm nút "Tìm kiếm…" trên header (hiện phím tắt
  `⌘K`/`Ctrl+K` tuỳ hệ điều hành) + `useEffect` lắng nghe phím tắt toàn trang, mount
  `<CommandPalette>` (state `searchOpen` quản lý ở `AppShell`, palette là component có điều khiển).

### D5 — Màn "đầu ca lễ tân" (`/dau-ca`)
- Module mới trong `permissions.ts`: `dau-ca` (ADMIN/MANAGER/RECEPTION/TELESALE), icon `Sunrise`.
- `web/src/app/(app)/dau-ca/page.tsx` (mới): 3 thẻ số liệu (chưa đến / đang chờ / việc tồn đọng
  khác) + 2 danh sách "Khách chưa đến" (nút 1-bấm "Đã đến") và "Khách đang chờ" (tính phút chờ từ
  `arrivedAt`, tô đỏ nếu ≥ 20 phút, nút 1-bấm "Bắt đầu tư vấn") + phần rút gọn các việc tồn đọng
  khác từ `getWorkqueue()` (B1), link sang `/viec-hom-nay` xem đầy đủ.
- `web/src/app/(app)/dau-ca/quick-status-button.tsx` (mới): nút 1-bấm gọi lại
  `updateAppointmentStatus` đã có sẵn ở `lich-hen/actions.ts` (KHÔNG tạo action mới — tái dùng
  100%, chỉ thêm `revalidatePath("/dau-ca")` vào action đó).
- KHÔNG đổi schema: dùng nguyên `Appointment.arrivedAt` đã có sẵn từ trước.

## CHI TIẾT ĐỢT 4 — Đã làm (kho theo chuẩn y tế — giai đoạn giá vốn)

> Bắt đầu từ một LỖI chủ phát hiện khi test thật: thêm vật tư cho khách nhưng kho không trừ.
> Sửa lỗi đó (xem changelog `web/DU-AN.md`) rồi nâng kho lên "có giá vốn" để tính được giá trị
> tồn kho & giá vốn vật tư đã dùng. TSC pass, **49/49 test** (thêm 9 test giá vốn), smoke test
> THẬT bằng trình duyệt (Playwright + Chromium pre-installed): nhập 10 @ 500.000 → tồn 47→57,
> giá vốn 0→500.000, giá trị tồn 28.500.000; thêm 3 vào hồ sơ → OUT ghi unitCost 500.000 (COGS).

### Sửa lỗi nền tảng — Kho không trừ tồn (xem chi tiết ở `DU-AN.md`)
- Form "Thêm vật tư" thiếu input ẩn `materialId` → `addMaterial` không trừ kho. Đã sửa + gói
  usage/tồn/nhật ký vào `$transaction` (add/remove/update).

### B5 (giai đoạn 1) — Giá vốn & giá trị tồn kho
- **Schema** (migration `20260626140000_inventory_costing`): `Material.avgCost` (giá vốn bình
  quân) + `StockMovement.unitCost` (đơn giá theo từng giao dịch).
- **`lib/inventory-cost.ts`** (THUẦN, có test): `weightedAvgCost` (bình quân gia quyền; nếu
  CHƯA từng ghi giá vốn thì LẤY luôn giá nhập, không pha loãng với tồn "giá 0"; nhập không khai
  báo giá thì giữ nguyên), `stockValue`, `totalStockValue`.
- **Nhập kho** (`danh-muc`): thêm ô "Giá vốn" (đơn giá nhập) → cập nhật `avgCost` bình quân +
  lưu `unitCost` vào dòng nhập.
- **Xuất kho cho hồ sơ** (`ho-so/actions.ts`): mỗi lần trừ/hoàn kho ghi `unitCost` = giá vốn bình
  quân tại thời điểm đó (để truy vết COGS).
- **Trang Kho** (`/kho`): thẻ "Giá trị tồn kho" (Σ tồn×giá vốn) + "Giá vốn đã xuất 30 ngày"
  (COGS); cột "Giá vốn tồn" trong bảng tồn kho.
- ⚠️ **KHÔNG** tự cộng COGS vật tư vào Lãi/Lỗ (Báo cáo) để **tránh tính trùng** với chi phí mua
  vật tư mà chủ có thể đã ghi tay ở Sổ thu chi. Giá vốn ở đây là THÔNG TIN tham khảo trên trang Kho.

## CHI TIẾT ĐỢT 5 — Đã làm (B3 sổ công nợ + B2 bậc 1 nút liên hệ)

> Làm đồng thời 2 hạng mục theo yêu cầu chủ. TSC pass, **62/62 test** (thêm 13 test: debt-aging +
> message-templates). Smoke test THẬT bằng trình duyệt (Playwright + Chromium): vào `/cong-no` →
> 13 hồ sơ nợ → lọc tuổi nợ "30–60 ngày" → còn 5 dòng đúng; bấm "Liên hệ" → giải mã số (đổi tạm
> `PHONE_ENC_KEY` test) → hiện đủ 3 nút Gọi (`tel:`)/SMS (`sms:...?body=` đã URL-encode tin nhắn
> nhắc nợ tiếng Việt)/Zalo (`zalo.me/<số>`); vai trò DOCTOR (không có quyền) vào `/cong-no` bị đẩy
> sang `/khong-co-quyen` — đúng RBAC.

### B2 bậc 1 — Nút liên hệ nhanh (Gọi/SMS/Zalo)
- **`lib/message-templates.ts`** (THUẦN, có test): sinh sẵn nội dung tin nhắn theo ngữ cảnh —
  nhắc nợ, nhắc tái khám, xác nhận lịch hẹn, sinh nhật, khách nguội. CHỈ tạo text, KHÔNG tự gửi.
- **`components/ui/contact-buttons.tsx`** (mới): tái dùng `revealPhone` (đã có ở trang khách hàng,
  gate quyền `phone.full` + ghi nhật ký `REVEAL_PHONE`) → sau khi hiện số, render nút Gọi
  (`tel:`), SMS (`sms:...?body=`, có thể truyền sẵn tin nhắn mẫu), Zalo (`zalo.me/<số>`).
- Gắn `ContactButtons` vào trang Sổ công nợ mới (mỗi dòng có sẵn mẫu nhắc nợ kèm số tiền + mã hồ sơ).
- Bổ sung nút SMS (trước đã có Gọi + Zalo) vào `khach-hang/[id]/admin-phone.tsx` cho đồng bộ.
- 🔑 Bậc 2–3 (tự động gửi SMS/Zalo OA thật, không cần nhân viên bấm tay) cần chủ cấp tài khoản
  SMS Brandname / Zalo OA / API key. Kênh Email cũng cần thêm field email vào `Customer` (hiện
  chưa có) — để khi rảnh chủ quyết có cần không trước khi đổi schema.

### B3 — Sổ công nợ chủ động (`/cong-no`)
- **`lib/debt-aging.ts`** (THUẦN, có test): `debtAgeDays`, `debtAgingBucket` (4 mốc: 0-15/15-30/
  30-60/60+ ngày), `isOverThreshold`.
- Trang mới `app/(app)/cong-no/page.tsx`: liệt kê toàn bộ `CaseRecord.debtAmount > 0`, lọc theo
  mốc tuổi nợ (tab, qua query string, không cần JS), ngưỡng cảnh báo nhập tay (mặc định 5tr, áp
  dụng qua query string) → hồ sơ vượt ngưỡng tô đỏ "Vượt ngưỡng". Thẻ tổng công nợ/số hồ sơ vượt
  ngưỡng/nợ lâu nhất. Mỗi dòng có `ContactButtons` kèm mẫu nhắc nợ.
- Thêm module `mod:cong-no` vào `permissions.ts` (roles: ADMIN, MANAGER, RECEPTION, CONSULTANT,
  SHAREHOLDER) → tự vào menu điều hướng.
- ⏳ Còn: "kế hoạch trả góp" (installment plan) — cần model DB mới (số kỳ, ngày hẹn trả từng kỳ);
  hiện thay bằng field `note` có sẵn ở hồ sơ để nhân viên ghi tay khi thoả thuận trả góp.

## QUY TRÌNH LÀM VIỆC (cho phiên sau)
1. Chạy `web/BAN-GIAO.md` mục 10 để dựng sandbox. **Lưu ý proxy:** trong môi trường này, tải
   Prisma engine cần đi qua proxy — đặt `HTTPS_PROXY` + `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`
   và `CHECKPOINT_DISABLE=1`; nếu `npm install` lỗi ECONNRESET ở `@prisma/engines`, tải engine bằng
   `curl --proxy` rồi `gunzip` vào `node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x`.
2. Làm theo thứ tự ưu tiên: hết Nhóm A (A5, A7) → B1 (giá trị cao nhất) → D2/D4/D5/B2/B3 (✅ xong,
   Đợt 3-5) → C → còn lại (B4, B5 giai đoạn 2, B6).
3. Mỗi mục: viết code + test → `npx tsc --noEmit` + `npx vitest run` → commit (tiếng Việt) →
   cập nhật trạng thái ở bảng trên + ghi changelog vào `web/DU-AN.md`.

## VIỆC CỦA CHỦ (🔑 — làm khi rảnh, không gấp)
- Đặt `PHONE_ENC_KEY` riêng + `npm run rotate:phone` (tắt banner đỏ A2).
- Đổi mật khẩu `admin/123456`.
- Khi muốn bật: cấp `ANTHROPIC_API_KEY` (AI), tài khoản SMS/Email/Zalo OA (gửi tin thật),
  nơi đẩy backup offsite (A5).
- Mỗi lần có bản mới: chạy `windows/Sua-Loi.bat` trên máy chủ phòng khám.
