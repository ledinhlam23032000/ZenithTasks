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
| B2 | **Kênh giao tiếp** (Zalo/SMS/Email) | ✅ Bậc 1 + Bậc 2/3 (Zalo OA/Facebook) | ✅ Bậc 1: Nút Gọi/SMS/Zalo deep-link kèm mẫu tin (Đợt 5) + hiện SỐ đầy đủ & nút "Chép số" để gọi tay trên máy tính (sửa lẻ sau Đợt 16). ✅ Bậc 2–3: hộp thư hợp nhất Zalo OA + Facebook Messenger 2 chiều thật — nhận/gửi/AI soạn nháp trả lời (`/cham-soc/hop-thu`), trang kết nối token (`/cham-soc/ket-noi`, ADMIN) — xem BAN-GIAO.md mục "Kênh giao tiếp (Omnichannel)". 🔑 Cần chủ lập Zalo OA (oa.zalo.me) + Facebook App/Page thật rồi tự kết nối trong app — xem TODO ở BAN-GIAO.md mục 14. SMS/Email tự động thật (Brandname/SMTP) vẫn CHƯA làm — Email cũng cần thêm field email cho Customer. |
| B3 | **Sổ công nợ chủ động** | ✅ Xong | ✅ Trang `/cong-no`: lọc theo tuổi nợ + cảnh báo vượt ngưỡng + nút liên hệ (Đợt 5). ✅ Kế hoạch trả góp / hẹn nợ (Đợt 15: model `DebtPlan` — ngày X hằng tháng trả Y đồng, hiện kỳ tới + cảnh báo trả chậm). |
| B4 | **Lịch hẹn nâng cao** | ✅ Một phần | ✅ Chống trùng lịch cùng người phụ trách (cảnh báo + cho ghi đè "Vẫn đặt") — Đợt 9. ✅ Link khách tự xác nhận/đổi lịch (D3, Đợt 12). ⏳ Còn: tài nguyên phòng/giường. |
| B5 | **Kho theo chuẩn y tế** | ✅ Xong | ✅ Giá vốn bình quân + giá trị tồn kho + COGS (Đợt 4). ✅ Cảnh báo FEFO/hạn dùng (B1). ✅ Định mức vật tư theo dịch vụ (BOM) + nút tự trừ kho (Đợt 6). ✅ Phiếu nhập kho nhiều dòng (Đợt 10). |
| B6 | **Hồ sơ y khoa chuẩn** | ✅ Xong | ✅ Tiền sử/dị ứng/chống chỉ định + cảnh báo an toàn (Đợt 8). ✅ Phiếu đồng ý (consent) + mẫu phiếu + ghi nhận trên hồ sơ + in cho khách ký (Đợt 11). |
| B7 | **Khách tham khảo (leads)** | ✅ Xong | Khách từ nguồn giới thiệu tới tham khảo, chưa hẹn/chưa đến → trang `/khach-tham-khao`: theo dõi phễu (mới/đã liên hệ/đã chuyển/tỉ lệ chuyển đổi) + chuyển 1 bấm thành khách hàng (Đợt 16). |

## NHÓM C — PHÂN TÍCH & RA QUYẾT ĐỊNH (BI)

| Mã | Hạng mục | Trạng thái | Ghi chú |
|----|----------|-----------|---------|
| C1 | **Giữ chân khách (RFM/Cohort)** + radar khách rời bỏ | ✅ Một phần | ✅ Phân khúc RFM + radar khách nguy cơ rời bỏ kèm nút liên hệ (Đợt 7, `/phan-tich`). ⏳ Còn: cohort theo tháng, tự đẩy danh sách vào workqueue B1. |
| C2 | **LTV & dự báo doanh thu** | ✅ Một phần | ✅ LTV (giá trị vòng đời) theo nguồn khách (Đợt 7). ⏳ Còn: dự báo doanh thu theo xu hướng + lịch hẹn. |
| C3 | **ROI theo kênh nguồn** | ✅ Xong | ✅ ROI Marketing trên `/phan-tich`: chi phí marketing (Sổ thu chi) vs doanh thu thực thu từ khách nguồn marketing (Đợt 13). |
| C4 | **Phễu chuyển đổi** | ✅ Xong | ✅ Phễu hồ sơ (mở → tư vấn → chốt → thu) + phễu lịch hẹn (hẹn → đến), tỉ lệ từng bước (Đợt 7, `/phan-tich`). |

## NHÓM D — TRẢI NGHIỆM & SÁNG TẠO

| Mã | Hạng mục | Trạng thái | Ghi chú |
|----|----------|-----------|---------|
| D1 | **AI trợ lý vận hành** | ✅ Phần lớn xong | ✅ Lớp AI TRUNG LẬP NHÀ CUNG CẤP (Đợt 14) + ✅ AI soạn tin chăm sóc + ✅ **Trợ lý hỏi-đáp số liệu `/tro-ly`** (Đợt 17: hỏi doanh thu/công nợ/dịch vụ/khách rời bỏ/tồn kho; AI chỉ trả lời dựa trên ảnh chụp số liệu, không truy cập DB) + ✅ **AI tự soạn kế hoạch `/ke-hoach`** (Đợt 29: AI soạn bản nháp kế hoạch có cấu trúc — nhiệm vụ chính/phụ/ghi chú — người dùng xem/sửa rồi mới lưu, không tự lưu; chỉ ADMIN/MANAGER/SHAREHOLDER). ⏳ Còn (tuỳ chọn): tóm tắt từng hồ sơ + gợi ý upsell tự động. 🔑 Cần `AI_API_KEY`. |
| D2 | **So sánh ảnh trước/sau (slider)** | ✅ Xong | Kéo so sánh (clip-path), chọn ảnh trái/phải bất kỳ. Chưa làm: đóng dấu ngày/logo, xuất ảnh ghép. |
| D3 | **Cổng khách hàng nâng cao** | ✅ Xong | ✅ Khách tự xác nhận/đổi lịch (Đợt 12). ✅ Đánh giá NPS từ cổng khách + thẻ NPS ở Phân tích; ✅ link cổng khách có hạn 90 ngày + thu hồi (Đợt 18). |
| D4 | **Tìm kiếm toàn cục (Ctrl/Cmd+K)** | ✅ Xong | Command palette tìm khách/hồ sơ/vật tư/**kế hoạch** (Đợt 29) + điều hướng menu. |
| D5 | **Màn "đầu ca lễ tân"** | ✅ Xong | Gộp khách chưa đến + đang chờ + việc tồn đọng (link `/viec-hom-nay`). |

## NHÓM E — CHẤT LƯỢNG MÃ NGUỒN

| Mã | Hạng mục | Trạng thái | Ghi chú |
|----|----------|-----------|---------|
| E1 | Sửa tài liệu phóng đại LOC | ✅ Xong | `PROJECT-OVERVIEW.md`: 60k → số THỰC đã kiểm chứng ~21k LOC, 25 model, 25 migration (Đợt 19). |
| E2 | Tách tầng domain cho logic tiền | ✅ Xong | `lib/case-math.ts` (toán hồ sơ) + `lib/inventory-cost.ts` (giá vốn kho) + `lib/pnl.ts` (Lãi/Lỗ — Đợt 19, tách khỏi `reports.ts`) — đều THUẦN, có test. |
| E3 | Dọn lint | ✅ Phần lớn xong | ✅ **0 cảnh báo biến không dùng** (Đợt 13 + xác nhận lại Đợt 19). ✅ Sửa `two-factor.tsx` (suy trạng thái khi render thay vì setState-in-effect). Còn **15 lỗi `react-hooks`** (React Compiler strictness) — **KHÔNG chặn `next build`/runtime**: phần lớn là FALSE-POSITIVE trên Server Component (gọi `Date.now()` khi render RSC là đúng) + truy cập `window` an toàn-SSR (portal-link/app-shell); số còn lại (command-palette, permission-editor) sửa cần refactor effect tương tác → để đợt riêng tránh rủi ro hồi quy. |

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

### A2 — Quản lý khoá mã hoá
- `PHONE_ENC_KEY` không còn fallback cố định trong source; production đọc từ secret manager/.env hoặc volume runtime.
- Nếu mất khóa trong khi CSDL còn dữ liệu `phoneEnc`, `docker-entrypoint.sh` **dừng khởi động** thay vì sinh khóa sai khiến dữ liệu không thể giải mã.
- Khi đổi khóa, phải sao lưu và chạy quy trình mã hóa lại (`prisma/rotate-phone-key.ts`).

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

### B2 bậc 2/3 — Hộp thư hợp nhất Zalo OA + Facebook Messenger (2 chiều thật)
- Model mới `ChannelAccount`/`Conversation`/`Message` (mã hoá token bằng `lib/secret-crypto.ts`,
  tách khỏi `CareMessage` cũ vì cần external ID + hội thoại có thể CHƯA gắn khách).
- `lib/channels/zalo.ts` + `lib/channels/facebook.ts`: OAuth/token refresh, gửi tin, kiểm chữ ký
  webhook (`X-ZEvent-Signature` / `X-Hub-Signature-256`). Webhook công khai tại
  `/api/webhooks/{zalo,facebook}` (ngoài `proxy.ts`, tự kiểm chữ ký thay đăng nhập).
- Trang `/cham-soc/hop-thu` (danh sách + chi tiết hội thoại, gộp tab với `/cham-soc` cũ) + AI soạn
  nháp trả lời theo ngữ cảnh hội thoại. Trang `/cham-soc/ket-noi` (ADMIN) để kết nối/ngắt/kiểm tra
  kết nối + hướng dẫn từng bước lấy App ID/Secret/token ngay trong app.
- KHÔNG dùng thư viện "tự động Zalo cá nhân" trên GitHub (bẻ khoá trái phép, vi phạm điều khoản,
  dễ bị khoá số) — chỉ hỗ trợ Zalo Official Account đăng ký chính thức.
- 🔑 Cần chủ: (1) lập Zalo OA tại oa.zalo.me + app tại developers.zalo.me (App ID/Secret + Secret
  Key webhook riêng của OA); (2) Facebook App liên kết Fanpage (App Secret + Page Access Token,
  nên lấy qua Meta Business Suite để không hết hạn). Xem hướng dẫn đầy đủ ngay trên trang
  `/cham-soc/ket-noi` sau khi đăng nhập ADMIN.
- ⏳ Chưa làm: AI tự động trả lời (hiện chỉ soạn nháp, nhân viên vẫn bấm gửi tay) — GĐ3 cũ trong
  BAN-GIAO.md; tổng đài/gọi điện qua PBX thật (cần chọn nhà cung cấp, hiện vẫn `tel:` tay + ghi chú).

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

## CHI TIẾT ĐỢT 6 — Đã làm (B5 giai đoạn 2: định mức vật tư theo dịch vụ — BOM)

> Nối tiếp Đợt 4 (giá vốn kho). Mục tiêu: khai báo "1 lần làm dịch vụ X tiêu hao mặc định
> bao nhiêu vật tư", để khi thêm dịch vụ vào hồ sơ, nhân viên bấm 1 nút là tự ghi nhận vật
> tư đã dùng + trừ kho — chống quên ghi vật tư (đúng họ lỗi đã gây ra Đợt 4). TSC pass,
> **70/70 test** (thêm 8 test service-bom). Smoke test THẬT bằng trình duyệt (Playwright +
> Chromium): khai báo định mức Botox 2 lọ/lần cho dịch vụ filler → thêm dịch vụ (SL 2) vào hồ
> sơ → bấm "Trừ VT" → kiểm DB: tồn Botox 54→50 (đúng 2×2=4), MaterialUsage 4 lọ, StockMovement
> OUT 4 @ giá vốn 500.000, cờ bomApplied=true, nút đổi thành nhãn "Đã trừ VT".

### Schema (migration `20260627120000_service_bom`)
- Model **`ServiceMaterial`** (BOM): `serviceId` + `materialId` + `quantity` (định mức/lần),
  unique theo `[serviceId, materialId]`. Quan hệ: `Service.materials` + `Material.serviceMaterials`.
- Cờ **`CaseService.bomApplied`** (Boolean, mặc định false): đánh dấu dòng dịch vụ đã trừ vật
  tư theo định mức → chống trừ kho 2 lần.

### `lib/service-bom.ts` (THUẦN, có test)
- `scaleBomQty(bomQty, serviceQty)` (định mức × SL dịch vụ, lấy SL phần nguyên), `bomNeeds`
  (quy đổi cả danh sách + đánh dấu `short` khi thiếu tồn, bỏ dòng định mức 0), `bomShortages`,
  `bomCost` (giá vốn ước tính = Σ need × giá vốn).

### Danh mục (`/danh-muc`) — khai báo định mức
- Server action `addServiceMaterial` (upsert theo [serviceId, materialId]) + `removeServiceMaterial`.
- `ServiceBomButton` (modal, ở `catalog-forms.tsx`): mỗi dịch vụ có nút "Định mức vật tư" (huy
  hiệu số dòng) → liệt kê/thêm/xóa định mức (Combobox chọn vật tư + số định mức/lần). Chỉ
  ADMIN/MANAGER (cổ đông không thấy).

### Hồ sơ (`/ho-so/[id]`) — áp định mức
- Server action `applyServiceBom`: nạp định mức của dịch vụ → tạo MaterialUsage (× SL dịch vụ)
  + trừ kho + ghi StockMovement OUT (đơn giá = giá vốn bình quân → COGS) trong **1 giao dịch**,
  rồi set `bomApplied=true`. Quyền `case.clinical`, tôn trọng khóa hồ sơ.
- Dòng dịch vụ (gắn danh mục, có định mức, chưa áp) hiện nút **"Trừ VT"** (ConfirmButton). Đã
  áp → đổi thành nhãn "Đã trừ VT". Vật tư cần thêm/bớt khác vẫn ghi tay như cũ.
- ⏳ Còn (B5): phiếu nhập kho nhiều dòng (1 phiếu nhập nhiều vật tư cùng lúc).

## CHI TIẾT ĐỢT 7 — Đã làm (Nhóm C: phân tích kinh doanh BI)

> Trang mới `/phan-tich` (Phân tích kinh doanh) — chỉ ĐỌC dữ liệu sẵn có, KHÔNG đổi schema,
> KHÔNG cần tài khoản/API. TSC pass, **83/83 test** (+13 test `analytics`). Smoke test THẬT bằng
> trình duyệt (Playwright + Chromium): ADMIN thấy đủ 4 phần (phễu, phân khúc RFM, radar khách rời
> bỏ, LTV theo nguồn) + đổi khoảng thời gian 30 ngày OK; vai trò TELESALE (không có quyền
> `mod:phan-tich`) bị chặn → `/khong-co-quyen`.

### `lib/analytics.ts` (THUẦN, có test)
- **RFM**: `rfmScore` (chấm điểm Recency/Frequency/Monetary theo ngưỡng `DEFAULT_RFM` tinh chỉnh
  được), `rfmSegment` (quy về 6 phân khúc: VIP / Trung thành / Mới / Nguy cơ rời bỏ / Đang ngủ /
  Khác), `isChurnRisk`.
- **Phễu**: `funnelRates` (tỉ lệ từng bậc so với bậc đầu & bậc liền trước).

### `lib/analytics-data.ts` (lắp ráp số liệu — truy vấn DB)
- `getBusinessAnalytics(days)`: gom RFM toàn bộ khách (raw SQL), đếm phân khúc, lọc danh sách
  khách "nguy cơ rời bỏ" (ưu tiên giá trị cao); phễu hồ sơ (mở → tư vấn → chốt → thu) + phễu lịch
  hẹn (hẹn → đến) trong kỳ; LTV theo nguồn khách (doanh thu/số khách).

### Trang `/phan-tich` (module mới — ADMIN/MANAGER/SHAREHOLDER)
- 4 thẻ tổng quan (khách có hồ sơ, khách VIP, nguy cơ rời bỏ, tỉ lệ chốt) + chọn khoảng thời gian
  (30/90/180/365 ngày qua query string, không cần JS).
- Phễu chuyển đổi (thanh ngang), phân khúc RFM (thanh phân bố), **radar khách rời bỏ** (bảng kèm
  `ContactButtons` mẫu tin "mời quay lại"), LTV theo nguồn (bảng).
- ⏳ Còn nhóm C: C3 ROI theo nguồn (cần gắn chi phí marketing từ Sổ thu chi); dự báo doanh thu;
  cohort theo tháng; tự đẩy danh sách khách rời bỏ vào workqueue B1.

## CHI TIẾT ĐỢT 8 — Đã làm (B6 giai đoạn 1: an toàn y khoa)

> Thêm thông tin AN TOÀN Y KHOA cho khách (dị ứng / tiền sử / chống chỉ định) + cảnh báo nổi bật
> để bác sĩ thấy TRƯỚC khi làm dịch vụ. Quan trọng cho phòng khám phẫu thuật thẩm mỹ. Không cần
> API/tài khoản. TSC pass, **83/83 test** (không thêm test — đây là schema + UI). Smoke test THẬT
> bằng trình duyệt (Playwright + Chromium): set dị ứng/tiền sử/chống chỉ định cho 1 khách → banner
> đỏ "Lưu ý an toàn y khoa" hiện đúng trên CẢ trang khách hàng LẪN trang hồ sơ điều trị.

### Schema (migration `20260627130000_customer_medical`)
- Thêm 3 cột text nullable vào `Customer`: `allergies` (dị ứng), `medicalHistory` (tiền sử bệnh +
  thuốc đang dùng), `contraindications` (chống chỉ định / lưu ý).

### Nhập liệu
- `updateCustomer` (action) + `EditCustomerButton` (form): thêm mục "An toàn y khoa" gồm 3 ô nhập.
  Người sửa: ADMIN/MANAGER/RECEPTION/TELESALE (lễ tân ghi khi tiếp nhận).

### Cảnh báo
- `components/ui/medical-alert.tsx` (mới): banner đỏ "Lưu ý an toàn y khoa" — dị ứng + chống chỉ
  định tô đỏ đậm, tiền sử để nhạt; **ẩn hoàn toàn** nếu không có thông tin. Bản `compact` cho trang
  hồ sơ.
- Gắn vào trang khách hàng (`/khach-hang/[id]`, ngay dưới thẻ hồ sơ) + trang hồ sơ điều trị
  (`/ho-so/[id]`, nơi bác sĩ thao tác — bản gọn).
- ⏳ Còn (B6): phiếu đồng ý (consent) ký số, mẫu hồ sơ y khoa theo loại dịch vụ. Cho bác sĩ
  (DOCTOR/CONSULTANT) sửa được thông tin y khoa (hiện chỉ ADMIN/MANAGER/RECEPTION/TELESALE).

## CHI TIẾT ĐỢT 9 — Đã làm (B4 phần 1: chống trùng lịch hẹn)

> Cảnh báo khi đặt/sửa lịch mà người phụ trách (tư vấn) đã có hẹn khác ĐỤNG GIỜ (trong cửa sổ
> 30 phút), cho phép "Vẫn đặt lịch này" để ghi đè. TSC pass, **90/90 test** (+7 test `schedule`).
> Smoke test THẬT (Playwright + Chromium): đặt lịch A (10:00, người phụ trách X) → đặt lịch B
> (10:15, cùng X) → hiện cảnh báo trùng + nút "Vẫn đặt lịch này"; bấm ghi đè → tạo được lịch B
> (kiểm DB có cả 2 lịch). Vai trò không có quyền vẫn bị chặn như cũ.

### `lib/schedule.ts` (THUẦN, có test)
- `slotConflict` (2 mốc giờ đụng nhau trong cửa sổ phút), `findConflicts` (lọc lịch trùng, bỏ
  chính lịch đang sửa), `minutesApart`, hằng `SLOT_WINDOW_MIN = 30`.

### Server action (`lich-hen/actions.ts`)
- `consultantConflictMessage`: truy vấn lịch khác của cùng người phụ trách (trạng thái còn hiệu
  lực) trong ngày, dùng `findConflicts` → sinh câu cảnh báo (kèm tên khách + giờ + số phút lệch).
- Tách lõi `doCreateAppointment`/`doUpdateAppointment(formData, force)` + 2 export mỗi loại:
  thường (kiểm tra trùng) và **forced** (`createAppointmentForced`/`updateAppointmentForced`, bỏ
  qua kiểm tra). Lý do dùng action riêng thay vì truyền cờ qua FormData: xem cạm bẫy mục dưới.

### Form (`new-appointment.tsx`)
- Khi trùng: hiện cảnh báo vàng + nút đổi thành "Vẫn đặt lịch này" → gọi action *forced*.
- ⚠️ **Cạm bẫy React 19 đã xử lý:** `<form action={fn}>` TỰ RESET các input không kiểm soát sau
  mỗi lần gửi → sau cảnh báo trùng, dữ liệu đã nhập bị xoá (và nút ghi đè gửi đi form rỗng). Khắc
  phục: dùng `onSubmit` + `e.preventDefault()` rồi gọi action thủ công (KHÔNG dùng prop `action`)
  → form không bị reset, ghi đè đọc lại đúng dữ liệu. (Cũng sửa luôn lỗi tiềm ẩn: form mất dữ
  liệu khi gặp lỗi validate.)
- ⏳ Còn (B4): tài nguyên phòng/giường; link khách tự xác nhận lịch (gắn với D3 cổng khách).

## CHI TIẾT ĐỢT 10 — Đã làm (B5 hoàn tất: phiếu nhập kho nhiều dòng)

> Nhập nhiều vật tư trong MỘT phiếu (mỗi dòng: vật tư + SL + đơn giá), gửi trong 1 giao dịch.
> TSC pass, **95/95 test** (+5 test `stock-in`). Smoke test THẬT (Playwright + Chromium): nhập 2
> dòng (Botox 10 @600.000 + Chỉ Collagen 20 @300.000) → tồn Botox 54→64, giá vốn bình quân
> 500.000→515.625 (đúng công thức (54×500k+10×600k)/64); Chỉ Collagen 0→20 @300.000; 2 dòng
> StockMovement IN ghi đúng đơn giá.

### `lib/stock-in.ts` (THUẦN, có test)
- `validStockInLines` (lọc dòng có vật tư + SL>0, kẹp đơn giá ≥0), `parseStockInLines` (gộp 3 mảng
  song song từ `FormData.getAll`), `stockInTotal`.

### Server action + UI
- `kho/actions.ts` `stockInBatch`: với mỗi dòng → cộng tồn + cập nhật giá vốn bình quân
  (`weightedAvgCost`) + ghi `StockMovement` IN, tất cả trong **1 `$transaction`**. Ghi chú/NCC dùng
  chung cả phiếu. Quyền ADMIN/MANAGER.
- `kho/stock-in-batch.tsx`: modal nhiều dòng (thêm/xóa dòng động), gắn nút "Nhập kho" lên trang
  `/kho` (chỉ ADMIN/MANAGER). Dùng `onSubmit`+`preventDefault` (tránh React 19 reset mất dòng đã nhập).

## CHI TIẾT ĐỢT 11 — Đã làm (B6 hoàn tất: phiếu đồng ý / consent)

> Soạn mẫu phiếu đồng ý → ghi nhận trên hồ sơ (tự điền tên/ngày/dịch vụ) → in cho khách ký tay.
> TSC pass, **100/100 test** (+5 test `consent`). Smoke test THẬT (Playwright + Chromium): trang
> `/mau-phieu` hiện mẫu; trên hồ sơ bấm "Ghi nhận đồng ý" → chọn mẫu → nội dung tự thay {{ten}} →
> "Hồ Phương Thảo" (hết placeholder); lưu → phiếu hiện trên hồ sơ + DB có snapshot; trang in
> `/ho-so/[id]/consent/[id]` render đủ tiêu đề + nội dung + ô ký 2 bên.

### Schema (migration `20260627140000_consent`)
- `ConsentTemplate` (mẫu phiếu: title + body + active). `CaseConsent` (phiếu đã ký cho hồ sơ — lưu
  SNAPSHOT title/body tại thời điểm ký + signerName + relationship + signedAt + note).

### `lib/consent.ts` (THUẦN, có test)
- `fillConsentTemplate(body, vars)` thay placeholder `{{ten}}/{{ngay}}/{{dichvu}}/{{mahoso}}`.

### Trang/UI
- `/mau-phieu` (module mới ADMIN/MANAGER): CRUD mẫu phiếu (thêm/sửa/ẩn/xóa), gợi ý placeholder.
- Hồ sơ (`ho-so/[id]`): card "Phiếu đồng ý" + `AddConsentButton` (chọn mẫu → tự điền, sửa được;
  người ký mặc định = tên khách) + nút "In phiếu" + xóa. Action `addConsent`/`deleteConsent`.
- Trang in `ho-so/[id]/consent/[consentId]` (dùng `.invoice-sheet`): header thương hiệu + nội dung
  + 2 ô ký (đại diện trung tâm / người đồng ý). ⚠️ "Ký số" thực thụ (chữ ký điện tử) chưa làm —
  hiện in giấy cho khách ký tay rồi lưu (đúng thực tế phòng khám); có thể nâng cấp ký trên màn sau.

## CHI TIẾT ĐỢT 12 — Đã làm (D3 phần 1: cổng khách tự xác nhận / đổi lịch)

> Trên cổng khách (`/khach/[token]`, công khai) thêm mục "Lịch hẹn sắp tới": khách tự **xác nhận
> sẽ đến** hoặc **đề nghị đổi lịch**. TSC pass, **100/100 test**. Smoke test THẬT (Playwright +
> Chromium, KHÔNG đăng nhập): mở cổng bằng token → xác nhận → lịch hẹn chuyển CONFIRMED; gửi đề
> nghị đổi → tạo CareMessage (NOTE/IN) cho nhân viên + ghi note lên lịch hẹn.

### Bảo mật (PUBLIC action — quan trọng)
- `khach/[token]/actions.ts` (server action công khai, KHÔNG đăng nhập): mọi thao tác kiểm
  **token → khách → lịch hẹn thuộc đúng khách đó**. Có **chống spam** (rate-limit `bump` theo token:
  xác nhận 40 lần / đổi lịch 12 lần / 15 phút). **KHÔNG tự đổi giờ** (tránh trùng lịch) — chỉ ghi
  nhận yêu cầu để nhân viên gọi lại sắp xếp.

### UI
- `khach/[token]/appointment-actions.tsx` (client): nút "Xác nhận sẽ đến" / "Đề nghị đổi lịch"
  (mở ô nhập khung giờ mong muốn). Trang cổng khách thêm section "Lịch hẹn sắp tới".
- ⏳ Còn (D3): đánh giá NPS sau dịch vụ; token cổng khách có hạn dùng / tự thu hồi.

## CHI TIẾT ĐỢT 13 — Đã làm (C3 ROI marketing + E3 dọn lint)

> Hai việc nhỏ chốt lại các nhóm còn dở. TSC pass, **102/102 test** (+2 test `marketingRoi`).
> Smoke test THẬT (Playwright): `/phan-tich` hiện section "ROI Marketing" đủ 3 ô (chi phí / doanh
> thu nguồn marketing / ROI).

### C3 — ROI Marketing (trên `/phan-tich`)
- `lib/analytics.ts`: `marketingRoi(revenue, spend)` (số lần, null nếu chưa có chi phí) + test.
- `lib/analytics-data.ts`: thêm chi phí marketing (Sổ thu chi `EXPENSE`/`MARKETING` trong kỳ) +
  doanh thu thực thu trong kỳ từ khách nguồn marketing (MARKETING/FACEBOOK/ZALO/TIKTOK/HOTLINE).
- Trang `/phan-tich`: card "ROI Marketing" (chi phí / doanh thu / ROI = doanh thu ÷ chi phí).

### E3 — Dọn lint
- Xóa 5 cảnh báo: biến `m` (cham-soc/actions), import `PageHeader` (khach-hang/[id]/page) + `BarChart`
  (multi-chart) không dùng; sửa vị trí `eslint-disable` ở avatar (vừa hết "directive thừa" vừa hết
  cảnh báo `no-img-element`).
- ⚠️ Còn 15 lỗi `react-hooks/set-state-in-effect` (rule mới của eslint-config-next 16, áp lên code
  cũ: command-palette, v.v.). Sửa đúng cần refactor effect (có rủi ro đổi hành vi) → để đợt riêng;
  KHÔNG chặn `next build`.

## QUY TRÌNH LÀM VIỆC (cho phiên sau)
1. Chạy `web/BAN-GIAO.md` mục 10 để dựng sandbox. **Lưu ý proxy:** trong môi trường này, tải
   Prisma engine cần đi qua proxy — đặt `HTTPS_PROXY` + `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`
   và `CHECKPOINT_DISABLE=1`; nếu `npm install` lỗi ECONNRESET ở `@prisma/engines`, tải engine bằng
   `curl --proxy` rồi `gunzip` vào `node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x`.
2. Làm theo thứ tự ưu tiên: hết Nhóm A (A5, A7) → B1 (giá trị cao nhất) → D2/D4/D5/B2/B3 (✅ xong,
   Đợt 3-5) → B5 giai đoạn 2 BOM (✅ xong, Đợt 6) → C BI/phân tích (✅ C1/C2/C4 phần lõi, Đợt 7;
   còn C3 + dự báo) → còn lại (B4 lịch hẹn nâng cao, B6 hồ sơ y khoa/consent, B5 phiếu nhập nhiều
   dòng). 🔑 Cần chủ cấp API/tài khoản: D1 AI (`ANTHROPIC_API_KEY`), B2 bậc 2–3 (SMS/Zalo OA).
3. Mỗi mục: viết code + test → `npx tsc --noEmit` + `npx vitest run` → commit (tiếng Việt) →
   cập nhật trạng thái ở bảng trên + ghi changelog vào `web/DU-AN.md`.

## VIỆC CỦA CHỦ (🔑 — làm khi rảnh, không gấp)
- Đặt `PHONE_ENC_KEY` riêng + `npm run rotate:phone` (tắt banner đỏ A2).
- Trong QA, seed dùng `DEMO_PASSWORD` cấp từ môi trường; production phải dùng tài khoản bootstrap cá nhân và không bật `ALLOW_DEMO_SEED`.
- Khi muốn bật: cấp `ANTHROPIC_API_KEY` (AI), tài khoản SMS/Email (gửi tin thật), nơi đẩy backup offsite (A5).
- **Muốn bật Hộp thư Zalo OA + Facebook (B2 bậc 2/3, mới xong phần code)**: lập Zalo Official Account
  tại oa.zalo.me (KHÔNG phải Zalo cá nhân đang dùng) + app tại developers.zalo.me; tạo Facebook App
  liên kết Fanpage (Meta Business Suite). Hướng dẫn từng bước lấy đúng giá trị nằm ngay trong app tại
  `/cham-soc/ket-noi` (đăng nhập ADMIN) — không cần biết kỹ thuật, làm theo là được.
- Mỗi lần có bản mới: chạy `windows/Sua-Loi.bat` trên máy chủ phòng khám.
