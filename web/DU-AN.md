# Dự án: Ứng dụng nội bộ quản trị — Trung tâm Phẫu thuật Tạo hình Thẩm mỹ, BVĐK Hồng Phúc

> Tài liệu bàn giao để các phiên Claude Code sau tiếp tục hiệu quả. Đọc file này + mã nguồn là nắm được bối cảnh.

## Tổng quan
- Web app Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4, PostgreSQL + Prisma 7 (driver adapter `@prisma/adapter-pg`), JWT (jose) + bcryptjs. Toàn bộ trong thư mục `web/`.
- Mô hình vận hành: 1 **máy chủ** (máy của trung tâm, chạy Docker, giữ dữ liệu) + nhiều **máy con** kết nối qua trình duyệt/PWA. Triển khai bằng các file trong `windows/` (`Chay-Zenith.bat` = cài/cập nhật; `Mo-App.bat` = mở; `Phat-Hanh-Mang.bat`/`Dia-Chi-Co-Dinh.bat` = ra Internet). Ứng dụng máy con: `client/`.
- ⚠️ Kho mã ban đầu là một project C#/WPF (app "ZenithTasks" quản lý dự án cá nhân) — đã **gỡ bỏ** (15/06/2026) vì không liên quan và đang lỗi build dở dang. Kho hiện chỉ còn app phòng khám (`web/`, `windows/`, `client/`).

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

## Nhập tiền có dấu chấm ngăn cách
- Dùng `MoneyInput` (`web/src/components/ui/money-input.tsx`): hiển thị `15.000.000` khi gõ, gửi số thuần qua input ẩn. Có 2 chế độ: không kiểm soát (`defaultValue`) và có kiểm soát (`value` + `onValueChange`, dùng khi cha cần tính tổng). Đã áp dụng: giá dịch vụ (danh mục), lương cứng/thưởng, đơn giá/giảm giá & thanh toán trong hồ sơ.

## Thông tin cá nhân & ảnh đại diện
- Trang `/tai-khoan` (`tai-khoan/page.tsx` + `profile-forms.tsx`): nhân viên tự sửa họ tên, SĐT, ảnh đại diện, đổi mật khẩu. Action ở `web/src/lib/account-actions.ts` (`updateMyProfile`, `updateMyAvatar`). Trường `User.avatarUrl` (migration `add_user_avatar`). `Avatar` nhận prop `src` để hiện ảnh. Link ở menu góc phải header.

## Bảo mật (đã làm trong phiên này)
- **Chống dò mật khẩu**: `web/src/lib/rate-limit.ts` (khoá tạm theo IP + tài khoản) gắn vào `login/actions.ts`.
- **Phân quyền**: `updateAppointmentStatus` đã giới hạn vai trò (trước đây mọi tài khoản đăng nhập đều đổi được).
- **Tải ảnh**: bỏ SVG, bắt buộc đúng định dạng JPG/PNG/WEBP/HEIC.
- **Header bảo mật** trong `next.config.ts`; **bcrypt cost 12**; mật khẩu tối thiểu **8 ký tự**.
- **Khoá bí mật**: `docker-compose.yml` KHÔNG còn nhúng AUTH_SECRET. Entrypoint tự sinh AUTH_SECRET ngẫu nhiên lưu trong volume `zenith_secrets`. Có thể đặt khoá riêng qua file `.env` (xem `.env.example`).
- ⚠️ **Còn phải làm thủ công**: đổi `PHONE_ENC_KEY` (hiện vẫn dùng khoá tương thích cũ để không mất dữ liệu SĐT) → cần viết migration mã hoá lại; đổi mật khẩu `admin/123456`; bật rate-limit của Cloudflare cho `/login`. Cân nhắc đưa ảnh y khoa ra khỏi `public/` và phục vụ qua route có xác thực.

## Liên lạc khách hàng & AI
- **SĐT**: chỉ ADMIN xem số đầy đủ (giải mã ở `khach-hang/[id]/page.tsx`), kèm nút gọi/Zalo/sao chép (`admin-phone.tsx`). Nhân sự khác chỉ thấy 5 số cuối.
- **Nhật ký liên lạc**: dùng `CareMessage` (kênh Zalo/SMS/Gọi/Ghi chú, chiều IN/OUT). Trang `cham-soc` có lọc theo kênh. Ghi nhận thủ công (vì khách dùng **Zalo cá nhân** — không có API).
- **AI soạn tin** (đã làm, chạy khi có key): `web/src/lib/ai.ts` gọi Claude API qua `fetch` (model mặc định `claude-sonnet-4-6`, đổi qua env `ANTHROPIC_MODEL`); action `draftCareMessage` ở `cham-soc/actions.ts`; UI nút "AI soạn tin" trong `care-composer.tsx` (tự ẩn nếu thiếu `ANTHROPIC_API_KEY`). KHÔNG gửi SĐT/dữ liệu nhạy cảm cho AI (chỉ tên + mục đích + dịch vụ gần nhất). Bật bằng cách đặt `ANTHROPIC_API_KEY` trong `.env` (xem `.env.example`).

### Lộ trình Zalo + AI (chưa làm)
- **Zalo OA (Giai đoạn 2)**: khách đang dùng Zalo cá nhân → cần lập **Zalo OA** (oa.zalo.me) + xác minh. Sau đó tích hợp Zalo API: webhook nhận tin (tự lưu vào `CareMessage`), gửi tin từ app (inbox), gắn đúng khách. Token Zalo lưu trong `.env` (KHÔNG commit). Lưu ý chính sách Zalo: trả lời khi khách nhắn trước = free trong hạn mức; tin chủ động = ZNS template trả phí.
- **AI tự trả lời (Giai đoạn 3)**: sau khi có OA → AI tự trả lời FAQ trong cửa sổ cho phép + người duyệt cho việc quan trọng (giá/y khoa). Nhắc tái khám/hỏi thăm chủ động qua ZNS.

## Sổ thu chi (dòng tiền vận hành)
- Model `CashTransaction` (enum `CashType` INCOME/EXPENSE) — migration `cash_transactions`. Danh mục ở `web/src/lib/finance.ts` (16 hạng mục chi + 5 thu, dễ thêm).
- Trang `/thu-chi` (ADMIN/MANAGER): điều hướng theo tháng + xem tháng trước, tổng thu/chi/số dư, lọc Thu/Chi, top hạng mục chi, bảng giao dịch + Thêm/Sửa/Xóa (`thu-chi/actions.ts`, `cash-forms.tsx`). Nav "Thu chi" (icon Coins) trong `rbac.ts`.
- LƯU Ý: sổ này là dòng tiền vận hành nhập tay (mua vật tư, máy móc, tiếp khách…), tách biệt doanh thu dịch vụ (đã tính ở hồ sơ/Báo cáo).

## Lịch làm việc — xem theo tháng
- `lich-lam-viec/page.tsx`: thêm chế độ "Theo tháng" (lưới lịch + điều hướng tháng trước/sau + chọn tháng) bên cạnh "Tuần này". Quản lý xem tất cả, nhân viên xem ca của mình.

## Phân quyền tuỳ chỉnh (RBAC linh hoạt)
- `web/src/lib/permissions.ts` là **nguồn duy nhất**: `MODULES` (mục/menu) + `CAPABILITIES` (năng lực mịn: `case.clinical`, `payment.add`, `payment.manage`, `phone.full`), mỗi key có roles mặc định.
- Mỗi người có thể **thêm/bớt quyền** ngoài mặc định: lưu ở `User.permissions` JSON `{ grant:[], deny:[] }` (migration `user_permissions`). Quyền hiệu lực = (mặc định vai trò ∪ grant) − deny → `userCan(user, key)`.
- Chốt chặn: trang dùng `requireCap("mod:<key>")` (thay cho `requireUser([roles])`); năng lực trong hồ sơ dùng `requireCap("case.clinical"|"payment.add"|"payment.manage")`. Menu = `navForUser(user)`.
- Giao diện admin: trang **Nhân sự** → nút **"Phân quyền"** (`nhan-su/permission-editor.tsx`) — **kéo thả** (hoặc bấm) chuyển quyền giữa 2 cột Bật/Tắt; lưu qua `savePermissions` (tính grant/deny bằng `diffFromDesired`). VD: cấp Lễ tân quyền `mod:ho-so` + `case.clinical` để thêm vật tư/tạo hồ sơ hộ.
- **SĐT**: `phone.full` mặc định ADMIN + **MANAGER** (quản lý nay xem số đầy đủ); nhân viên khác vẫn chỉ 5 số cuối. Có thể cấp `phone.full` cho người cụ thể.
- (rbac.ts cũ giữ `ROLE_LABELS/ROLE_SHORT/isManagerial`; `NAV_ITEMS/navForRole/canAccess` không còn dùng — nav đã chuyển sang `permissions.ts`.)

## Gộp "Khách hàng" + "Hồ sơ điều trị" → "Hồ sơ khách hàng"
- Menu chỉ còn **"Hồ sơ khách hàng"** (`/khach-hang`, icon FolderHeart). Module `ho-so` đặt `hidden:true` (ẩn khỏi menu nhưng vẫn dùng để phân quyền + chốt chặn). Trang khách hàng có nút **"Tất cả hồ sơ điều trị"** → `/ho-so` cho ai có quyền. Vào từng khách vẫn thấy toàn bộ hồ sơ điều trị + mở chi tiết.

## Giảm giá & công nợ (đã rà soát)
- Dữ liệu LUÔN đúng: `finalPrice = đơn giá×SL − giảm`; `totalAmount = Σ finalPrice` (đã trừ giảm); `debtAmount = total − đã trả`. Giảm giá **không** biến thành nợ.
- Đã sửa **hiển thị** ở trang hồ sơ cho rõ: Tổng dịch vụ (trước giảm = total+discount) → Đã giảm → Thành tiền sau giảm (=total) → Đã thanh toán → Còn nợ. VD: 30tr, giảm 5tr → 25tr, trả 20tr → nợ 5tr.

## Giá gốc/ưu đãi + Voucher + Hóa đơn (đợt mới)
- **CaseService.listPrice** = giá gốc; `unitPrice` = giá ưu đãi; `finalPrice = unitPrice*SL − giảm`.
- **Voucher** (`CaseRecord.voucherCode/voucherAmount`): nhập số tiền hoặc % (`updateCaseVoucher`, quyền `payment.manage`), quy ra VND, kẹp ≤ tổng.
- **`recalc()`**: `totalAmount = Σ finalPrice − voucher` (NET) → voucher giảm cả **công nợ lẫn hoa hồng** (commission = net×rate). Doanh thu tiền mặt (dashboard/báo cáo) vẫn theo `payment.amount`. **LƯU Ý**: `totalAmount` giờ là số NET sau voucher (ảnh hưởng leaderboard/LTV — đúng ý chủ).
- **Hóa đơn in**: `/ho-so/[id]/hoa-don` (nút "In hóa đơn" trên hồ sơ). Hiện giá gốc → ưu đãi → voucher → tổng tiết kiệm → còn nợ; SĐT chỉ mask (không giải mã). Print CSS gọn trong `globals.css` (`.invoice-sheet`).

## Nhật ký kiểm toán (audit)
- `web/src/lib/audit.ts` → `audit(actorId, action, {entity,entityId,meta})`. Đã gắn: DELETE_PAYMENT, UPDATE_PAYMENT, DELETE_CASE, APPLY_VOUCHER, DELETE_CARE, REVEAL_PHONE (+ sẵn LOGIN/CREATE/UPDATE/DELETE_CUSTOMER).
- **Hiện SĐT**: `revealPhone(customerId)` (server action, kiểm tra `phone.full` + ghi REVEAL_PHONE) — bấm "Hiện số" mới giải mã (không giải mã lúc render).

## Liền mạch + mobile
- Dashboard: thẻ số liệu bấm được (→ lịch hẹn/báo cáo/khách/hồ sơ). Báo cáo: "Top công nợ" có link **"Mở hồ sơ thu nợ →"**.
- Mobile: Sổ thu chi có **bản thẻ** (`sm:hidden`) song song bảng (`hidden sm:block`); bảng dịch vụ trong hồ sơ ẩn cột "Giá gốc" trên màn nhỏ.
- Dọn mã chết `rbac.ts`; `receiveCustomer` luôn điều hướng (không "im lặng").

## Lộ trình nâng cấp (đang làm lần lượt)
- ✅ **#1 Sao lưu offsite**: `windows/Sao-Luu.ps1` đẩy bản .zip ra thư mục Google Drive/USB (config `zenith-sao-luu-offsite.txt`).
- ✅ **#2 Cảnh báo kho**: `Material.minStock/lotNo/expiryDate`; trang Kho cảnh báo tồn thấp + sắp/đã hết hạn.
- ✅ **#3 Lãi/Lỗ + Excel**: Sổ thu chi có thẻ Doanh thu dịch vụ/Thu khác/Chi/Lãi‑Lỗ; route `/thu-chi/export` xuất CSV.
- ✅ **#4 Nhật ký hệ thống**: trang `/nhat-ky` (ADMIN) xem AuditLog. (Thùng rác/xóa mềm: chưa làm — thay đổi lớn, để sau.)
- ✅ **#5 Đặt lịch online**: trang công khai `/dat-lich` (proxy.ts cho phép) — khách tự đặt → tạo Appointment (source "Đặt lịch online", SĐT đầy đủ lưu ở ghi chú để lễ tân gọi lại) → hiện ở Lịch hẹn. Chống spam: honeypot + giới hạn theo IP (`bump` trong rate-limit.ts).
- ⏸️ **#6 Zalo OA + nhắc tự động** (cần lập OA lấy token) · **#7 AI tự trả lời** (cần API key + OA) — TẠM GÁC theo yêu cầu.
- ✅ **#8 Thẻ thành viên + tích điểm** (`lib/loyalty.ts`, tính từ chi tiêu thực).
- ✅ **#9 Đổi PHONE_ENC_KEY** (`prisma/rotate-phone-key.ts` + hướng dẫn) · **2FA TOTP** (`lib/totp.ts`, mặc định tắt; bật ở /tai-khoan; admin có nút Tắt 2FA).
- ✅ **#10 Kiểm thử + CI** (vitest 20 test ở `src/lib/__tests__`; `.github/workflows/ci.yml`).
- ✅ **#11 Cập nhật gần real-time** (`components/ui/auto-refresh.tsx` ở Tổng quan/Lịch hẹn/Tiếp nhận).
- ✅ **#12 Cổng khách hàng**: link riêng `/khach/<token>` (proxy cho phép) — khách tự xem hạng/điểm, lịch sử điều trị, ảnh trước‑sau, công nợ. Tạo/đổi/thu hồi link ở hồ sơ khách (`portal-link.tsx`).

## Hồ sơ nhân sự (HR) + Chấm công nâng cao + Giá niêm yết + Xuất file (đợt mới)
- **Ảnh đại diện**: sửa lỗi không tải được ảnh iPhone (HEIC) — `updateMyAvatar` nhận mọi `image/*` (≤8MB), input `accept="image/*"`. Avatar hiện ở danh sách nhân sự + hồ sơ.
- **Hồ sơ nhân sự đầy đủ**: `User` thêm nhiều trường HR (ngày sinh, giới tính, CCCD, quê quán, địa chỉ, ngân hàng, liên hệ khẩn cấp, chức danh, phòng ban, ngày vào làm, bằng cấp, ghi chú) — migration `staff_hr`. Trang `/nhan-su/[id]` xem hồ sơ theo nhóm + nút **"Sửa hồ sơ"** (`updateStaff`, chỉ ADMIN) chỉnh tất cả + lương cứng + hoa hồng. Tên trong danh sách bấm để mở.
- **Chấm công nâng cao** (`cham-cong`): `upsertAttendance` (ADMIN/MANAGER) thêm/sửa công cho **ngày bất kỳ** (kể cả trước khi có app), nhập giờ vào/ra theo giờ VN, ghi audit `EDIT_ATTENDANCE`. Bộ chọn tháng cho mọi người; thẻ **"Lịch sử của tôi"** xem giờ vào/ra từng ngày (các tháng/năm trước); quản lý bấm **"Chi tiết"** để xem & sửa từng ngày của nhân viên. Modal ở `attendance-editor.tsx`.
- **Giá niêm yết** (`Service.listPrice`, migration `service_list_price`, backfill = giá ưu đãi): danh mục dịch vụ nhập **2 giá** (niêm yết + ưu đãi). Chọn dịch vụ trong hồ sơ tự điền giá gốc = niêm yết → hóa đơn hiện tiết kiệm đúng.
- **Xuất nhiều định dạng**: `lib/xlsx.ts` (tạo .xlsx THẬT, **không thư viện ngoài** — tự dựng ZIP qua `zlib`); `lib/export.ts` (`xlsxResponse`/`wordResponse`/`csvResponse`). Component `ExportMenu` (In-Lưu PDF / Excel .xlsx / Word .doc) ở **Báo cáo, Lương, Thu chi**. Route `/…/export?format=xlsx|doc|csv`. PDF = nút In của trình duyệt (preview). Hóa đơn vẫn dùng In sẵn có. Có test `xlsx.test.ts` (3 test).

## Hoa hồng nhập tay + Tìm kiếm + Doanh số (đợt mới nhất)
- **Bỏ hoàn toàn hoa hồng %**: đã DROP `User.commissionRate` + `CaseRecord.commissionRate` (migration `manual_commission`). Hoa hồng giờ là **số tiền nhập tay**:
  - Hồ sơ: ô "Hoa hồng cộng tác viên (VND)" (`commissionAmount`) — `recalc()` KHÔNG còn tự tính hoa hồng, chỉ tính tổng/đã trả/công nợ.
  - Bảng lương: `PayrollEntry.commission` (nhập tay). `payroll.ts` BỎ toàn bộ logic % theo bậc (tư vấn/bác sĩ/điều dưỡng). Mỗi người: lương cứng (theo ngày công) + hoa hồng + thưởng + điều chỉnh = tổng. Modal Sửa lương có ô "Hoa hồng (tự nhập)". `nurseCases` ngừng dùng (giữ cột cũ).
- **Người tư vấn = bất kỳ nhân sự nào**: `getConsultants()` trả TẤT CẢ nhân sự đang hoạt động (không bắt buộc vai trò Tư vấn viên).
- **Ô chọn có tìm kiếm** (`components/ui/combobox.tsx`): gõ chữ để lọc. Đã áp dụng: chọn dịch vụ + vật tư + người tư vấn + bác sĩ (trong hồ sơ), dịch vụ + người tư vấn (lịch hẹn), hạng mục thu chi. Dùng được 2 kiểu: `value`+`onChange` (kiểm soát) hoặc `name`+`defaultValue` (gửi form).
- **Doanh số tư vấn theo thời gian**: `getSalesSeries()` (reports.ts) → 3 mốc 7 ngày / 12 tháng / 5 năm; biểu đồ cột + đường xu hướng (`bao-cao/sales-chart.tsx`, recharts `ComposedChart` Bar+Line) + chỉ số tăng/giảm kỳ cuối. Đặt ở đầu trang Báo cáo.

## Vai trò Cổ đông + Sửa ngày tạo + Sửa vai trò (đợt mới nhất)
- **Sửa NGÀY TẠO hồ sơ (chỉ ADMIN)**: nút "Sửa ngày tạo" trên hồ sơ điều trị → `updateCaseDate` (requireUser ADMIN, ghi audit EDIT_CASE_DATE). Dùng khi tạo hồ sơ muộn. Ảnh hưởng báo cáo/lương theo tháng (tính theo createdAt).
- **Vai trò CỔ ĐÔNG (SHAREHOLDER)** — migration `shareholder_role` (enum). CHỈ XEM, không thao tác:
  - permissions.ts: thêm SHAREHOLDER vào các module XEM kinh doanh (dashboard, lịch hẹn, hồ sơ khách, hồ sơ điều trị, chăm sóc, báo cáo, thu chi, danh mục, kho). KHÔNG có ở nhân sự/lương/chấm công/lịch làm việc/tiếp nhận/nhật ký (ẩn danh sách & quy mô nhân sự).
  - KHÔNG cấp năng lực nào (không có `phone.full` → SĐT luôn che; không `case.clinical`/`payment.*`). Mọi action mutation đều dùng `requireUser([...])` KHÔNG gồm SHAREHOLDER → an toàn theo thiết kế.
  - UI ẩn nút thêm/sửa/xóa cho cổ đông qua `isShareholder()` (rbac.ts): thu-chi, danh-muc, lịch hẹn (trạng thái → badge tĩnh), chăm sóc. (Các trang khác đã gate sẵn theo vai trò.)
- **Sửa vai trò nhân sự**: form Thêm/Sửa nhân sự dùng `ROLE_LABELS` nên tự có đủ vai trò (gồm Cổ đông) — admin nâng/đổi vai trò bất kỳ. Enum vai trò trong `createStaff`/`updateStaff` đã thêm SHAREHOLDER.

## Khắc phục lỗi & phục hồi cập nhật
- `web/src/app/(app)/error.tsx`: ranh giới lỗi thân thiện (Thử lại / về Tổng quan) cho mọi trang khu vực app — không còn màn hình "lỗi máy chủ" trắng; tự phục hồi nếu lỗi tạm thời.
- `windows/Sua-Loi.bat` + `Sua-Loi.ps1`: CẬP NHẬT SẠCH (git reset --hard origin + `docker compose build --no-cache` + `up --force-recreate`) để mã + Prisma client + DB khớp nhau. Dùng khi cập nhật bị lỡ dở gây lệch schema (triệu chứng: mở hồ sơ báo lỗi máy chủ). Báo rõ nếu build thất bại (thường do thiếu RAM), KHÔNG mất dữ liệu.

## CÒN LÀM (TODO)
Đã có Sửa: Khách hàng, Hồ sơ, Dịch vụ & Vật tư (danh mục, 2 giá), Lịch hẹn, Chăm sóc, Lương, **Dịch vụ/Vật tư/Thanh toán trong hồ sơ**, **Nhân sự (hồ sơ HR đầy đủ)**, **Chấm công (ngày bất kỳ)**.
Chưa có Sửa (cần bổ sung):
- **Ca làm việc** (Shift): sửa giờ.
- (Cân nhắc) nhân sự bệnh viện điều động: cờ "lương cố định, không trừ ngày công".
- (Cân nhắc) Word/Excel cho từng hóa đơn (hiện chỉ In/PDF).

## Bật AI nhanh (Windows)
`windows/Cai-AI-Key.bat` — nhập API key Anthropic, tự ghi `ANTHROPIC_API_KEY` vào `.env` (UTF-8 không BOM, giữ các dòng khác) rồi `docker compose up -d` để áp dụng.

## Cách chạy/kiểm thử nhanh trong sandbox
- PG: `pg_ctlcluster 16 main start`; `DATABASE_URL=postgresql://zenith:zenith_dev_pw@127.0.0.1:5432/zenith_clinic?schema=public`.
- Kiểm tra biên dịch: `cd web && npx tsc --noEmit` (full `next build` hay bị kill vì RAM trong sandbox — dùng tsc).
- Dev: `npx next dev -p <port>`.

## SỬA LỖI QUAN TRỌNG: trùng mã hồ sơ khi "Mở hồ sơ điều trị" (P2002)
- Triệu chứng: bấm "Mở hồ sơ điều trị" báo lỗi máy chủ (digest 3788933152). Log: `prisma.caseRecord.create() Unique constraint failed (code)`.
- Nguyên nhân: `lib/codes.ts` sinh mã bằng `count()+1` → sau khi XÓA bản ghi, count < max nên mã mới trùng mã cũ. (Đã CMR: xóa 1 hồ sơ → count=29,max=HS00030 → count+1=HS00030 TRÙNG.)
- Sửa: `lib/seq.ts` (`nextSeq` = max+1, thuần, có test `codes.test.ts`) dùng cho `nextCustomerCode`/`nextCaseCode`; thêm vòng lặp thử lại khi P2002 (`isUniqueViolation`) trong `tiep-nhan/actions.ts` (createCustomer + receiveCustomer). Không đổi schema.

## Đợt sửa lớn: đếm số liệu, trạng thái khách, đổi vai trò, tìm kiếm danh mục
- **Đồng bộ đếm ca (sửa "8 vs 9")**: `dashboard.ts` — `consultRate.total` giờ = TỔNG ca tháng (`count(createdAt month)`) thay vì chỉ ca đã tư vấn → khớp "Số ca tháng này". Tỉ lệ chốt = AGREED / tổng ca (mẫu số = số ca, trực quan & nhất quán giữa Tổng quan và Báo cáo).
- **Hiệu suất tư vấn — bác sĩ kiêm tư vấn**: `nameMap` lấy từ TẤT CẢ user (không chỉ CONSULTANT) → người tư vấn là bác sĩ/QTV hiện đúng tên thay vì "—". (`getConsultants` đã trả mọi nhân sự đang hoạt động.)
- **Hồ sơ khách hàng — cột Trạng thái** (thay mã KH vô nghĩa): Đã làm dịch vụ (có ca SERVICED/COMPLETED) / Đã hủy (tất cả ca CANCELLED) / Chưa làm. Thêm **tab lọc**: Tất cả · Chưa làm dịch vụ · Đã làm dịch vụ (giúp lọc khách chưa làm để chăm sóc).
- **Đổi/nâng cấp vai trò**: nút **"Sửa hồ sơ"** (modal `EditStaffButton`) giờ nằm ngay trên TỪNG DÒNG ở trang Nhân sự (không cần vào trang chi tiết) → đổi vai trò (gồm Cổ đông) tại chỗ, KHÔNG phải xóa tài khoản. `updateStaff` ghi `role`.
- **Tìm kiếm danh mục**: trang Danh mục có ô tìm dịch vụ/vật tư theo tên (`?q`).
- **Tiếp nhận**: khách hẹn hôm nay CHƯA có hồ sơ → nút **"Tạo hồ sơ"** (NewCustomerButton prefill tên/nguồn/ghi chú từ lịch hẹn) để chuyển tiếp lập hồ sơ.
- **Đồng bộ khi sửa ngày tạo**: `refresh()` trong `ho-so/actions.ts` revalidate thêm `/bao-cao` + `/khach-hang`.

## Doanh thu/Lãi-Lỗ chuyển sang Báo cáo; Sổ thu chi chỉ còn dòng tiền
- **Sổ thu chi** (`thu-chi/page.tsx`): BỎ thẻ "Doanh thu dịch vụ" + "Lãi/Lỗ" (để kế toán/lễ tân nhập sổ không thấy doanh thu/lãi lỗ). Chỉ còn: Tổng thu / Tổng chi / **Số dư sổ** (thu − chi của sổ, KHÔNG gồm doanh thu dịch vụ).
- **Báo cáo** (`bao-cao/page.tsx`): thêm khối **Lãi/Lỗ tháng** = Doanh thu dịch vụ (từ hồ sơ) + Thu khác − Tổng chi. Helper `getMonthlyPnl()` ở `reports.ts`. Chỉ ADMIN/MANAGER/SHAREHOLDER (quyền `mod:bao-cao`) xem.
- **Hạng mục thu** (`finance.ts`): bỏ "Doanh thu dịch vụ" khỏi sổ thu chi, thêm **"Ứng từ doanh thu để chi trả"** (mã `ADVANCE_REVENUE`). `REVENUE_TRANSFER_CODES` (ADVANCE_REVENUE + SERVICE cũ) bị LOẠI khỏi "Thu khác" trong Lãi/Lỗ để tránh tính trùng doanh thu.

## Hiệu suất nhân sự + Cộng tác viên (2 module mới) + xếp hạng dịch vụ
- **Dịch vụ nổi bật**: xếp theo SỐ LƯỢT (rồi doanh thu) thay vì chỉ doanh thu (`reports.ts` topServices sort).
- **Module `hieu-suat`** (Hiệu suất nhân sự — ADMIN/MANAGER/SHAREHOLDER): `lib/performance.ts` `getStaffPerformance/getStaffDetail`. Trang `/hieu-suat` (bảng: ngày công, ca tư vấn, chốt%, DS tư vấn, ca mổ, DS mổ, tin CSKH) → bấm vào người mở `/hieu-suat/[id]` xem TỪNG CA (tư vấn + mổ, link sang hồ sơ). Báo cáo: hàng tư vấn/bác sĩ giờ link sang `/hieu-suat/[id]`.
- **Module `cong-tac-vien`** (Cộng tác viên — ADMIN/MANAGER/SHAREHOLDER): gộp theo `Customer.sourceDetail` (nguồn=COLLABORATOR). `/cong-tac-vien` so sánh CTV theo 7 ngày/tháng/năm/tất cả (số khách, số ca, doanh số, hoa hồng) → `/cong-tac-vien/[tên]` xem hồ sơ khách CTV giới thiệu + từng ca. (Chưa có hồ sơ CTV sửa được — đề xuất thêm model `Collaborator` nếu cần.)
- Icon nav: thêm `Activity`, `Handshake` vào `app-shell.tsx`.

## Sửa ngày thu tiền (ADMIN) + Biểu đồ đa kiểu + Biểu đồ CTV
- **Sửa NGÀY thu tiền**: `updatePayment` cho phép ADMIN sửa `paidAt` (ô "Ngày thu tiền" trong modal Sửa khoản thu, chỉ hiện với ADMIN) — để cập nhật số liệu cũ cho báo cáo/doanh thu đúng kỳ. Ghi audit. `refresh()` revalidate báo cáo/dashboard.
- **Biểu đồ đa kiểu** `components/ui/multi-chart.tsx` (recharts): chọn Cột / Đường / Vùng / Tròn. Áp dụng: Báo cáo (doanh thu 14 ngày + doanh số tư vấn), Tổng quan (doanh thu — `components/charts/revenue-chart.tsx` nay dùng MultiChart), Cộng tác viên.
- **Mốc tuần**: `getSalesSeries()` thêm `thisWeek` (T2..CN) + `weeksOfMonth` (Tuần 1..N của tháng). SalesChart có tab: Tuần này / Tuần-tháng / 7 ngày / 12 tháng / 5 năm + kèm % tăng/giảm kỳ cuối.
- **Biểu đồ CTV**: trang `/cong-tac-vien` có biểu đồ so sánh top 10 CTV theo doanh số (cột/tròn); trang chi tiết CTV có biểu đồ **xu hướng 12 tháng** (`getCollaboratorTrend`).
- Đã bỏ `bao-cao/revenue-chart.tsx` cũ (thay bằng MultiChart).

## Quyền Thu chi cho tư vấn/lễ tân — GỘP 1 quyền (đơn giản)
- Bỏ ý tưởng `cash.write` riêng (gây rắc rối phải cấp 2 quyền). Nay **chỉ cần cấp 1 quyền "Thu chi" (`mod:thu-chi`)** là nhân sự VÀO được + GHI được.
- `thu-chi/actions.ts` (create/update/delete): `requireCap("mod:thu-chi")` + chặn nếu `isShareholder` (cổ đông chỉ xem).
- `thu-chi/page.tsx`: `canManage = !isShareholder(user.role)` (ai có mod:thu-chi & không phải cổ đông thì thấy nút Thêm/Sửa/Xóa).
- Cách dùng: Nhân sự → Phân quyền → bật **"Thu chi"** cho tư vấn/lễ tân là họ nhập được ngay. Cổ đông có mod:thu-chi nhưng là view-only → chỉ xem.

## Sửa: ảnh không hiện + sửa CTV không lưu + biểu đồ tăng trưởng CTV
- **Ảnh trước/sau không hiện** (production không phục vụ tệp ghi runtime trong public/): thêm route `app/media/[file]/route.ts` đọc tệp từ `public/uploads` và trả về kèm Content-Type (đáng tin cậy, không cần đăng nhập để cổng khách `/khach/[token]` vẫn xem được). `uploadPhoto` lưu URL `/media/<tệp>`; helper `lib/media.ts photoSrc()` map URL cũ `/uploads/<tệp>` → `/media/<tệp>`. Đã đổi `<img>` ở hồ sơ điều trị, hồ sơ khách, cổng khách.
- **Đăng ký/sửa CTV không cập nhật**: `EditCollaboratorButton`/`NewCollaboratorButton` gọi `router.refresh()` sau khi lưu; action `revalidatePath("/cong-tac-vien","layout")` (bao trang chi tiết). KHÓA ô Tên khi sửa/đăng-ký-theo-tên (tránh đổi tên làm lệch khớp với `sourceDetail`).
- **Biểu đồ tăng trưởng CTV**: `getCollaboratorSeries(name?)` (tuần này / các tuần trong tháng / 12 tháng / 5 năm). Component dùng chung `components/ui/range-chart.tsx` (chọn mốc + chọn kiểu cột/đường/vùng/tròn + % tăng giảm). Trang CTV: thêm "Tăng trưởng doanh số CTV" (tất cả CTV) + giữ "So sánh top 10". Trang chi tiết CTV: đổi sang RangeChart theo tuần/tháng/năm.

## Lưu mãi/"xoay mãi" + Xem ảnh + Ảnh cận lâm sàng + Lưu trữ ở máy phòng khám (đợt mới nhất)
### 1) Lưu xong nhưng "xoay mãi" (gặp ở TẤT CẢ form)
- **Nguyên nhân**: form dùng `useActionState`; server action gọi `revalidatePath(...)` nên Next **gộp việc render lại cả trang vào phản hồi** của action → spinner phải đợi tải lại toàn trang (rất lâu khi mạng tới máy chủ phòng khám chậm), dù dữ liệu ĐÃ lưu xong (nên bấm Hủy vẫn thấy đã lưu).
- **Cách sửa**: hook mới `lib/use-form-action.ts` (`useFormAction`) — API y hệt `useActionState` (`[state, action, pending]`):
  - `pending` TẮT NGAY khi máy chủ lưu xong (không chờ tải lại trang), đóng form, rồi `router.refresh()` ở chế độ NỀN để cập nhật dữ liệu trang hiện tại.
  - Có bắt lỗi mạng → hiện "Không lưu được — kiểm tra kết nối và thử lại."; KHÔNG nuốt `redirect()/notFound()` của Next.
- **Bỏ `revalidatePath` ở các action lưu** (giữ lại cho action XÓA dùng `<form action>`): vì mọi trang dữ liệu đều `force-dynamic` (tự tải mới khi mở) nên `revalidatePath` thừa; trang hiện tại đã được `router.refresh()` lo.
- **Đã áp dụng cho** (save-and-stay): hồ sơ điều trị (dịch vụ/thanh toán/vật tư/ảnh/voucher/thông tin/ngày tạo/tái khám), danh mục (dịch vụ/vật tư), thu chi, cộng tác viên, sửa khách hàng, hồ sơ nhân sự (thêm/sửa), chấm công, chăm sóc (soạn + sửa tin), lịch hẹn (thêm/sửa), xếp ca, tài khoản (thông tin + ảnh đại diện + đổi mật khẩu). Các form điều hướng (đăng nhập, tiếp nhận, đặt lịch) hoặc có màn hình "thành công" (đặt lại mật khẩu, 2FA) KHÔNG bị lỗi này nên giữ nguyên.
### 2) Xem được ảnh khi bấm + tải nhanh hơn
- **Thư viện ảnh** `components/ui/photo-gallery.tsx`: lưới ảnh thu nhỏ (tải lười `loading="lazy"` → tiết kiệm băng thông, chỉ tải khi cuộn tới), **bấm để xem ảnh lớn** (overlay toàn màn hình, ◀▶/Esc, nút **Tải về**), bấm thùng rác để xóa (nếu có quyền). Dùng ở: hồ sơ điều trị (xóa được), hồ sơ khách, cổng khách `/khach/[token]` (chỉ xem).
- **Nén ảnh trước khi tải** `lib/compress-image.ts` (`compressImage`): resize ≤1920px + JPEG q0.82 ngay trên máy/điện thoại trước khi gửi → tải nhanh hơn nhiều, nhẹ kho. Áp dụng cho tải ảnh hồ sơ **và** ảnh đại diện. HEIC iPhone tự fallback.
### 3) Ảnh cận lâm sàng
- Thêm loại ảnh `PhotoType.CLINICAL` (migration `20260619230000_photo_clinical`) — chọn "Cận lâm sàng (X-quang/CT/siêu âm)" khi tải ảnh; nhãn vàng "Cận lâm sàng" (`photo-label.tsx`).
### 4) Lưu trữ ở máy phòng khám, tải về khi cần xem (đúng ý chủ)
- Ảnh/tệp lưu ở **chính máy chủ phòng khám** trong volume Docker `zenith_uploads` (`docker-compose.yml` gốc), KHÔNG mất khi cập nhật/`build --no-cache`. Phục vụ **theo yêu cầu** qua route `/media/[file]` — bản web chỉ hiện thu nhỏ, bấm mới tải ảnh đầy đủ từ máy về xem.
- **An toàn dù xóa ở điện thoại**: ảnh đã nằm ở máy phòng khám; `windows/Sao-Luu.ps1` sao lưu cả DB **lẫn** thư mục `uploads` ra ổ ngoài/Google Drive. (Lưu ý: `web/docker-compose.yml` chỉ là DB cho lập trình — KHÔNG dùng khi vận hành; script Windows luôn chạy compose ở thư mục gốc.)
