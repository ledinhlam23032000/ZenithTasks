# BÀN GIAO KỸ THUẬT — Ứng dụng quản trị Trung tâm Phẫu thuật Tạo hình Thẩm mỹ (BVĐK Hồng Phúc)

> **Mục đích:** Đây là tài liệu NỀN TẢNG, tự chứa. Một phiên Claude Code mới chỉ cần đọc file này
> (+ mã nguồn khi cần) là hiểu kiến trúc, quy ước, nghiệp vụ và làm việc được NGAY ở mức như các
> phiên trước. Lịch sử thay đổi chi tiết theo từng đợt nằm ở `DU-AN.md`. Lưu ý Next.js: đọc `AGENTS.md`.
>
> Khi bạn (Claude) thêm tính năng/đổi quy ước, hãy CẬP NHẬT file này cho khớp.

---

## 0. Cách làm việc với chủ dự án (QUAN TRỌNG)
- **Chủ**: GĐĐH — **BS. Lê Đình Lam**, hotline **0941 567 496**. Xưng hô thân thiện ("anh Lam"), trả lời bằng **tiếng Việt**, giải thích dễ hiểu (chủ không phải dân kỹ thuật). Khi báo cáo: nói rõ đã làm gì + cách lấy bản cập nhật (chạy `Sua-Loi.bat`).
- **Phong cách**: chủ thường giao nhiều việc 1 lúc, yêu cầu "làm 1 mạch đến hết". Hãy làm trọn vẹn, kiểm thử, commit + push, rồi tóm tắt ngắn gọn bằng tiếng Việt. Được phép chủ động đề xuất ý tưởng hay.
- **Thương hiệu (BẮT BUỘC)**: tên chính thức **"Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc"**. KHÔNG dùng "Zenith" hay "Thẩm mỹ Hồng Phúc" trong giao diện. Màu thương hiệu: **ĐỎ hoa phượng** `#dc2626` (brand), nhấn vàng gold (accent). Định nghĩa ở `src/app/globals.css`.
- ⚠️ "Zenith" chỉ còn là tên kỹ thuật nội bộ (tên repo, container, volume, cookie `zsession`) — KHÔNG hiện ra cho người dùng.

## 1. Sản phẩm
App **nội bộ** quản trị phòng khám thẩm mỹ: tiếp nhận khách → lịch hẹn → hồ sơ điều trị (dịch vụ, vật tư, thanh toán, ảnh trước/sau/tái khám/cận lâm sàng) → chăm sóc khách → báo cáo doanh thu/lãi lỗ → nhân sự, chấm công, lương/hoa hồng, kho vật tư, sổ thu chi, cộng tác viên, hiệu suất nhân sự. Có **cổng khách hàng** (link riêng để khách tự xem) và **đặt lịch online** công khai.

Mô hình vận hành: **1 máy chủ** (máy của trung tâm, chạy Docker, giữ toàn bộ dữ liệu + ảnh) + nhiều **máy con/điện thoại** truy cập qua trình duyệt/PWA. Ra Internet qua **Cloudflare Tunnel**.

## 2. Stack & kiến trúc
- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** + **Tailwind v4**. Toàn bộ app trong thư mục **`web/`**.
- ⚠️ Next.js 16 KHÁC bản bạn từng biết (breaking changes). Khi cần API/quy ước Next, ĐỌC `node_modules/next/dist/docs/` trước. `params`/`searchParams` là **Promise** (phải `await`).
- **PostgreSQL + Prisma 7** với driver adapter `@prisma/adapter-pg`. Client tạo **lazy qua Proxy** ở `src/lib/db.ts` → build KHÔNG cần `DATABASE_URL`. Prisma client sinh ra ở `src/generated/prisma/`.
- **Server Actions** cho mọi thao tác ghi (`"use server"`). Trang là Server Components (`force-dynamic`), form là Client Components.
- **Auth**: JWT (thư viện `jose`) trong cookie httpOnly **`zsession`** (payload `{uid, role, name}`, 30 ngày). Mật khẩu **bcryptjs cost 12**, tối thiểu 8 ký tự. Đăng nhập KHÔNG phân biệt hoa/thường. Tuỳ chọn **2FA TOTP** (`src/lib/totp.ts`).
- **Biểu đồ**: `recharts` (Bar/Line/Area/Pie/Composed) — bọc trong `components/ui/multi-chart.tsx` + `range-chart.tsx`.
- **Test**: `vitest` (`src/lib/__tests__`). CI: `.github/workflows/ci.yml`.
- **proxy.ts** (middleware): `PUBLIC_PATHS = ["/login","/dat-lich","/khach"]`; matcher loại trừ `api|_next/static|_next/image|favicon.ico|img|uploads|.*\\..*`.

## 3. Bản đồ thư mục
```
web/
  prisma/schema.prisma          # Mô hình dữ liệu (nguồn duy nhất)
  prisma/migrations/            # Migration viết tay, commit kèm (entrypoint chạy migrate deploy)
  src/app/
    (app)/                      # Khu vực đăng nhập (có app-shell, sidebar)
      dashboard, lich-hen, tiep-nhan, khach-hang, ho-so/[id], cham-soc,
      bao-cao, hieu-suat, cong-tac-vien, lich-lam-viec, luong, thu-chi,
      nhan-su/[id], nhat-ky, danh-muc, kho, cham-cong, tai-khoan
      <mỗi mục>/actions.ts       # Server actions của mục đó
      <mỗi mục>/*-forms.tsx      # Form client (modal)
    login/, dat-lich/           # Công khai
    khach/[token]/              # Cổng khách hàng (công khai, theo token)
    media/[file]/route.ts       # Phục vụ ảnh từ public/uploads (KHÔNG auth — để cổng khách xem được)
  src/lib/                      # Logic dùng chung (xem mục 4)
  src/components/ui/            # Nút, modal, bảng, combobox, money-input, photo-gallery, chart…
  src/components/layout/        # app-shell (sidebar + header), change-password
  src/components/charts/        # revenue-chart (dùng MultiChart)
windows/                        # Script .bat/.ps1 triển khai trên máy Windows (xem mục 11)
client/                         # App máy con (mở trình duyệt vào máy chủ)
docker-compose.yml              # GỐC repo — dùng khi VẬN HÀNH (có volume ảnh)
web/docker-compose.yml          # CHỈ là DB cho lập trình — KHÔNG dùng khi vận hành
```

### Các trang & route (29 page, hầu hết `export const dynamic = "force-dynamic"`)
Chỉ 3 trang KHÔNG dynamic: `/` (redirect), `/login`, `/khong-co-quyen`. **Hệ quả quan trọng**: mọi trang dữ liệu luôn tải mới khi điều hướng → `revalidatePath` gần như THỪA (xem mục 8 về `useFormAction`).

## 4. Thư viện `src/lib/` (chức năng từng file)
- **db.ts** — Prisma client lazy (Proxy).
- **auth.ts** — `getSession/getCurrentUser`, `requireUser([roles])`, `requireCap("key")`, `createSession/destroySession`, `hashPassword/verifyPassword`. `requireCap` ném/redirect nếu thiếu quyền.
- **auth-actions.ts**, **account-actions.ts** — đăng nhập/đăng xuất; nhân viên tự sửa hồ sơ/ảnh đại diện/đổi mật khẩu; admin đặt lại mật khẩu; 2FA.
- **permissions.ts** — **NGUỒN DUY NHẤT của RBAC** (xem mục 6).
- **rbac.ts** — `ROLE_LABELS`, `ROLE_SHORT`, `isManagerial`, `isShareholder`. (Mã cũ `NAV_ITEMS/navForRole/canAccess` đã bỏ — nav nay ở permissions.ts.)
- **phone.ts** — mã hoá SĐT **AES-256-GCM** (`encryptPhone/decryptPhone`), `maskPhone` (5 số cuối). `PHONE_ENC_KEY` từ env.
- **codes.ts** + **seq.ts** — sinh mã KH/hồ sơ. `nextSeq(codes, prefix) = max hiện có + 1` (KHÔNG dùng count+1 — sẽ trùng sau khi xóa). `isUniqueViolation(e)` bắt P2002.
- **money.ts** — `toNum` (Decimal→number), `formatVND`.
- **format.ts** — `fmtDate/fmtDateTime/fmtRelative/toDatetimeLocal`.
- **dates.ts** — `vnDateOnly()` (mốc ngày theo giờ VN cho cột @db.Date).
- **status.ts** — nhãn + tone cho các enum (CASE_STATUS, CONSULT_RESULT, APPT_STATUS/TYPE, SOURCE_LABEL, PAYMENT_LABEL, CARE_CHANNEL, GENDER_LABEL).
- **finance.ts** — danh mục thu/chi sổ thu chi; `CATEGORY_LABEL`, `categoriesFor(type)`; `REVENUE_TRANSFER_CODES = ["ADVANCE_REVENUE","SERVICE"]` (loại khỏi "thu khác" trong P&L để tránh tính trùng).
- **payroll.ts** — `getPayroll(monthDate, standardDays=26)` → bảng lương.
- **reports.ts** — `getReports()`, `getMonthlyPnl()`, `getSalesSeries()` (mốc tuần/tháng/năm).
- **dashboard.ts** — `getAdminDashboard()`, `getStaffSnapshot()`.
- **performance.ts** — `getStaffPerformance/getStaffDetail` (hiệu suất nhân sự); `getCollaborators/getCollaboratorDetail/getCollaboratorSeries` (cộng tác viên); `rangeBounds(range)`.
- **lookups.ts** — `getActiveServices/getActiveMaterials/getConsultants/getDoctors`. `getConsultants` trả **MỌI nhân sự đang hoạt động** (ai cũng có thể là người tư vấn).
- **loyalty.ts** — hạng thành viên + điểm theo chi tiêu thực (`tierFor/pointsFor/nextTier`).
- **media.ts** — `photoSrc(url)`: map URL cũ `/uploads/<f>` → `/media/<f>`, URL khác giữ nguyên.
- **compress-image.ts** — `compressImage(file, maxDim=1920, quality=0.82)`: nén ảnh ngay trên trình duyệt trước khi tải lên (HEIC tự fallback về file gốc).
- **use-form-action.ts** — **hook lưu chuẩn** (xem mục 8). RẤT QUAN TRỌNG.
- **audit.ts** — `audit(actorId, action, {entity,entityId,meta})` ghi `AuditLog` (nuốt lỗi an toàn).
- **export.ts** + **xlsx.ts** — xuất CSV/Word(.doc)/Excel(.xlsx THẬT, tự dựng ZIP, không thư viện ngoài).
- **ai.ts** — gọi Claude API soạn tin chăm sóc (ẩn nếu thiếu `ANTHROPIC_API_KEY`). KHÔNG gửi dữ liệu nhạy cảm (chỉ tên + mục đích + dịch vụ gần nhất).
- **rate-limit.ts** — chống dò mật khẩu + chống spam đặt lịch (theo IP + tài khoản).

## 5. Mô hình dữ liệu (Prisma)
**Enums**: `Role` (ADMIN, MANAGER, TELESALE, RECEPTION, CONSULTANT, DOCTOR, NURSE, CARE, SHAREHOLDER), `Gender`, `CustomerSource`, `AppointmentType`, `AppointmentStatus`, `CaseStatus` (OPEN, CONSULTED, SERVICED, COMPLETED, CANCELLED), `ConsultResult` (PENDING, AGREED, CONSIDERING, DECLINED), `PaymentMethod` (CASH, CARD, TRANSFER, EWALLET), `PhotoType` (BEFORE, AFTER, FOLLOW_UP, **CLINICAL**), `CareChannel`, `CareDirection`, `StockType`, `CashType` (INCOME, EXPENSE).

**Models chính**:
- **User** — nhân sự + thông tin HR đầy đủ (dob, gender, nationalId, hometown, address, bank*, emergency*, position, department, hireDate, qualification, notes), `baseSalary`, `avatarUrl`, `role`, `permissions` (JSON `{grant,deny}`), `totpSecret/totpEnabled`. **KHÔNG còn `commissionRate`** (đã bỏ — hoa hồng nhập tay).
- **Customer** — `phoneEnc`(mã hoá)/`phoneLast5`, `source`/`sourceDetail` (CTV gắn ở đây), `portalToken`, `code`.
- **Appointment**, **CaseRecord** (hồ sơ điều trị: `code`, `status`, `consultResult`, `consultantId`, `doctorId`, `totalAmount`, `paidAmount`, `debtAmount`, `discountAmount`, `commissionAmount` (nhập tay), `voucherCode`, `voucherAmount`, `locked/lockedAt/lockedById`, `completedAt`).
- **CaseService** (`listPrice`=giá gốc, `unitPrice`=giá ưu đãi, `quantity`, `discount`, `finalPrice`), **Payment** (`amount`, `method`, `paidAt`, `receivedById`), **MaterialUsage**, **Photo** (`type`, `url`, `caption`, `followUpIndex`, `caseId` nullable — giữ ảnh khi xóa hồ sơ).
- **Service** (`listPrice` niêm yết + `defaultPrice` ưu đãi), **Material** (`stock`, `minStock`, `lotNo`, `expiryDate`), **StockMovement**.
- **Attendance** (chấm công theo ngày), **Shift** (ca làm), **PayrollEntry** (theo tháng: `baseSalary`, `commission` nhập tay, `bonus`, `adjustment`…).
- **CareMessage** (nhật ký chăm sóc: `channel`, `direction`), **FollowUp** (hẹn tái khám), **AuditLog**, **CashTransaction** (sổ thu chi), **Collaborator** (hồ sơ CTV: `name @unique`, `phone`, `bank*`, `note`, `active`).

## 6. Phân quyền (RBAC) — `src/lib/permissions.ts`
- 2 loại quyền: **mục** `mod:<key>` (gate cả menu lẫn trang) và **năng lực** mịn.
- **Năng lực**: `case.clinical` (thao tác hồ sơ), `payment.add` (thu tiền), `payment.manage` (sửa/xóa khoản thu), `phone.full` (xem SĐT đầy đủ — mặc định ADMIN+MANAGER).
- Quyền hiệu lực = (mặc định theo vai trò ∪ `grant`) − `deny`, lưu ở `User.permissions`. Hàm: `userCan(user,key)`, `navForUser(user)`, `requireCap("key")` (ở `auth.ts`), `diffFromDesired(role, desired)` (tính grant/deny).
- **Trang** chốt bằng `requireCap("mod:<key>")` (KHÔNG dùng `requireUser([roles])` cho trang nữa). Năng lực trong hồ sơ dùng `requireCap("case.clinical"|"payment.add"|"payment.manage")`.
- **Giao diện cấp quyền**: Nhân sự → "Phân quyền" (`nhan-su/permission-editor.tsx`) — kéo thả Bật/Tắt, lưu qua `savePermissions`.
- **SHAREHOLDER (Cổ đông)**: CHỈ XEM. Có ở các mục xem kinh doanh (dashboard, lịch hẹn, hồ sơ khách, hồ sơ điều trị, chăm sóc, báo cáo, hiệu suất, CTV, thu chi, danh mục, kho); KHÔNG có ở nhân sự/lương/chấm công/lịch làm việc/tiếp nhận/nhật ký. KHÔNG có năng lực nào (SĐT luôn che). UI ẩn nút thao tác qua `isShareholder()`. Mọi action mutation dùng `requireUser([...])` KHÔNG gồm SHAREHOLDER → an toàn theo thiết kế.
- **Lưu ý quyền Thu chi**: chỉ cần cấp 1 quyền `mod:thu-chi` là nhân sự vào ĐƯỢC + ghi ĐƯỢC (action chặn riêng cổ đông). Không có quyền `cash.write` riêng.

## 7. Logic nghiệp vụ cốt lõi
### Giá / voucher / công nợ (hồ sơ điều trị)
- `CaseService.finalPrice = unitPrice*quantity − discount`. `listPrice` = giá gốc (để hiện "tiết kiệm" + hoá đơn).
- **Voucher** (`updateCaseVoucher`, quyền `payment.manage`): nhập VND hoặc % → quy ra VND, kẹp ≤ tổng; lưu `voucherCode` (hiển thị) + `voucherAmount`.
- **`recalc(caseId)`** (trong `ho-so/actions.ts`) là toán cuối: `subtotal = Σ finalPrice`; `voucher = min(voucherAmount, subtotal)`; `net = subtotal − voucher`; `totalAmount = net`; `paidAmount = Σ payment.amount`; `debtAmount = max(net − paid, 0)`. **Hoa hồng KHÔNG tự tính** (`commissionAmount` nhập tay). → `totalAmount` là số NET sau voucher (ảnh hưởng leaderboard/LTV — đúng ý chủ).
- **Doanh thu tiền mặt** (dashboard/báo cáo) tính theo `payment.amount`/`paidAt`, KHÔNG theo totalAmount.
- **Hoá đơn in**: `/ho-so/[id]/hoa-don` (CSS in trong globals.css `.invoice-sheet`). SĐT chỉ mask.
- **Khóa hồ sơ**: `locked` → chỉ ADMIN sửa được (`isLockedFor`).

### Lương & hoa hồng (`payroll.ts`)
- Lương cứng theo **ngày công** (`baseSalary × ngày công ÷ ngày chuẩn`, mặc định 26). Hoa hồng + thưởng + điều chỉnh **nhập tay** trong `PayrollEntry`. **ĐÃ BỎ toàn bộ logic % theo bậc** (tư vấn/bác sĩ/điều dưỡng).

### Sổ thu chi & Lãi/Lỗ (`finance.ts`, `reports.ts`)
- **Sổ thu chi** (`/thu-chi`): dòng tiền vận hành nhập tay. Thẻ: Tổng thu / Tổng chi / **Số dư sổ** (KHÔNG hiện doanh thu/lãi lỗ — để kế toán/lễ tân không thấy).
- **Lãi/Lỗ** chuyển sang **Báo cáo** (`getMonthlyPnl` = doanh thu dịch vụ + thu khác − tổng chi). Hạng mục thu có "Ứng từ doanh thu để chi trả" (`ADVANCE_REVENUE`).

### Đếm số liệu (đồng bộ Tổng quan ↔ Báo cáo)
- Mọi đếm theo **`createdAt` trong tháng**. Tỉ lệ chốt = AGREED / tổng ca tháng. "Dịch vụ nổi bật" xếp theo **số lượt** rồi doanh thu.

### Hiệu suất nhân sự & Cộng tác viên
- `/hieu-suat` (bảng → bấm xem từng ca của 1 người). `/cong-tac-vien` (gộp theo `Customer.sourceDetail` nguồn=COLLABORATOR; có hồ sơ CTV sửa được qua model `Collaborator`; biểu đồ tăng trưởng theo tuần/tháng/năm + so sánh CTV).

### Khách hàng
- Cột **Trạng thái** (Đã làm = có ca SERVICED/COMPLETED · Đã hủy = tất cả ca CANCELLED · Chưa làm) + tab lọc. `DONE_STATUSES = ["SERVICED","COMPLETED"]`.

## 8. QUY ƯỚC PHÁT TRIỂN — BẮT BUỘC TUÂN THỦ
### 8.1. Lưu dữ liệu: dùng `useFormAction` (KHÔNG dùng `useActionState` cho form lưu)
**Vấn đề đã sửa:** `useActionState` + server action gọi `revalidatePath` → Next gộp việc render lại CẢ TRANG vào phản hồi của action → spinner quay mãi khi mạng tới máy chủ chậm, dù dữ liệu đã lưu.

**Quy ước mới (`src/lib/use-form-action.ts`):**
```ts
const [state, action, pending] = useFormAction(serverAction, onSuccess?);
// <form action={action}> ... hoặc gọi action(formData) thủ công (khi cần nén ảnh)
```
- Tắt `pending` NGAY khi action trả về → gọi `onSuccess` (đóng modal/reset form) → `router.refresh()` ở chế độ NỀN (KHÔNG ràng buộc spinner). Bắt lỗi mạng; KHÔNG nuốt `redirect()/notFound()` của Next.
- **Server action đi kèm KHÔNG được gọi `revalidatePath`** (vì trang đều `force-dynamic` → tự tải mới khi điều hướng; trang hiện tại do `router.refresh()` lo). → BỎ `revalidatePath` ở các action LƯU.
- **GIỮ `revalidatePath`** cho các action gọi qua `<form action={serverAction}>` thuần trong Server Component (các nút XÓA: `removeMaterial`, `deletePhoto`, `removeCaseService`, `deleteFollowUp`, `lockCase`…) — chúng không có `router.refresh()` phía client.
- Form **điều hướng** (đăng nhập, tiếp nhận, đặt lịch → có `redirect()`) hoặc form có **màn hình "thành công"** (đổi/đặt lại mật khẩu, 2FA) KHÔNG bị lỗi này → giữ `useActionState`.

### 8.2. Nút Xóa / xác nhận
Dùng `components/ui/DeleteButton` / `ConfirmButton` (gọi server action qua `useTransition` + `router.refresh()`). KHÔNG dùng `<form action>` cho nút xóa ở client (hay treo ở production).

### 8.3. Nhập tiền
`components/ui/MoneyInput` (hiện `15.000.000`, gửi số thuần qua input ẩn). 2 chế độ: `defaultValue` (không kiểm soát) hoặc `value`+`onValueChange` (kiểm soát, khi cha cần tính tổng).

### 8.4. Ô chọn có tìm kiếm
`components/ui/Combobox` (gõ để lọc). 2 kiểu: `value`+`onChange` hoặc `name`+`defaultValue` (gửi form).

### 8.5. Sinh mã (chống trùng P2002)
Dùng `nextSeq` (max+1) ở `lib/seq.ts` + vòng lặp thử lại khi `isUniqueViolation`. KHÔNG dùng `count()+1`.

### 8.6. Ảnh & lưu trữ
- Tải ảnh: nén bằng `compressImage` ngay trên client trước khi gửi (form dùng `onSubmit` → `action(fd)` thay vì `action={action}`). Áp dụng cho ảnh hồ sơ + ảnh đại diện.
- Lưu file vào `public/uploads`; DB lưu `url = /media/<tên>`. Phục vụ qua **route `app/media/[file]/route.ts`** (đọc từ `public/uploads`, KHÔNG auth để cổng khách xem được; chặn `..`, chỉ tên `[A-Za-z0-9._-]`). Lý do: `next start` KHÔNG phục vụ tin cậy các file ghi lúc chạy trong `public/`.
- Hiển thị qua `components/ui/photo-gallery.tsx`: thu nhỏ tải lười + bấm xem lớn (◀▶/Esc/Tải về) + xóa (nếu có quyền). Khi render `<img>` thủ công thì bọc `src={photoSrc(p.url)}`.
- **Lưu trữ thực tế**: thư mục `public/uploads` được mount vào **volume Docker `zenith_uploads`** (compose GỐC) → KHÔNG mất khi `build --no-cache`/cập nhật. `windows/Sao-Luu.ps1` sao lưu cả DB lẫn `uploads`.

### 8.7. Múi giờ
VN (`TZ` trong docker-compose). Ngày chấm công dùng `vnDateOnly()`.

### 8.8. Migration
Đổi schema → **viết tay** file trong `prisma/migrations/<timestamp>_<tên>/migration.sql` + commit. Entrypoint chạy `prisma migrate deploy` khi khởi động. ⚠️ Trong sandbox: `prisma migrate dev` lỗi "non-interactive", `migrate reset` BỊ CHẶN cho AI. Sau khi đổi schema phải chạy `npx prisma generate` để tsc không lỗi. `ALTER TYPE ... ADD VALUE IF NOT EXISTS` cho việc thêm giá trị enum (idempotent).

## 9. Bảo mật (RÀNG BUỘC — phải giữ)
- **SĐT khách**: luôn mã hoá **AES-256-GCM**. Số đầy đủ chỉ lộ cho **ADMIN + MANAGER** qua server action `revealPhone(customerId)` (ghi audit `REVEAL_PHONE`) — chỉ giải mã KHI BẤM, KHÔNG giải mã lúc render. Nhân sự khác chỉ thấy 5 số cuối (`maskPhone`).
- **`AUTH_SECRET`**: tự sinh ngẫu nhiên mỗi máy, lưu trong volume `zenith_secrets` (KHÔNG commit). Có thể đặt riêng qua `.env`.
- **`PHONE_ENC_KEY`**: hiện dùng khoá DEMO tương thích cũ (trong `docker-entrypoint.sh`). Đổi khoá cần **mã hoá lại** dữ liệu (`prisma/rotate-phone-key.ts`) — KHÔNG tự đổi. **Repo phải để PRIVATE.**
- **Khi đóng gói code gửi ra ngoài**: che `PHONE_ENC_KEY` demo, loại trừ `.env`/secrets.
- **Audit**: `lib/audit.ts` — đã gắn DELETE_PAYMENT, UPDATE_PAYMENT, DELETE_CASE, APPLY_VOUCHER, DELETE_CARE, REVEAL_PHONE, EDIT_CASE_DATE, EDIT_ATTENDANCE… Trang xem ở `/nhat-ky`.
- **Tải ảnh**: chỉ nhận ảnh bitmap (JPG/PNG/WEBP/HEIC), KHÔNG nhận SVG. Giới hạn 8MB.
- **KHÔNG** ghi định danh model (`claude-opus-*`…) vào commit/PR/code/comment — chỉ dùng khi trả lời chat.

## 10. Chạy & kiểm thử trong sandbox
```bash
pg_ctlcluster 16 main start                       # khởi động Postgres local
export DATABASE_URL="postgresql://zenith:zenith_dev_pw@127.0.0.1:5432/zenith_clinic?schema=public"
cd web
npx tsc --noEmit                                  # KIỂM TRA BIÊN DỊCH (full `next build` hay bị kill vì RAM)
npx vitest run                                    # chạy test
npx next dev -p 3939                              # dev server (Turbopack; biên dịch trang đầu khá chậm)
```
- **Test trang cần đăng nhập**: forge JWT bằng `jose` (chạy script TỪ thư mục `web/` để resolve được `jose`), ký bằng `AUTH_SECRET` đang dùng, payload `{uid, role:"ADMIN", name}`, đặt cookie `zsession=<token>` rồi `curl`. Lấy `uid` admin: `psql ... -c "select id from \"User\" where role='ADMIN' limit 1"`.
- DB local đã có seed (~29 hồ sơ). `psql` KHÔNG hiểu `?schema=public` (đó là param của Prisma) — bỏ khi dùng psql.
- Dọn tiến trình dev: `pkill -f "next dev"`.

## 11. Triển khai (Windows, máy chủ phòng khám)
- Repo clone vào **`%USERPROFILE%\ZenithTasks`**. Script ở **`%USERPROFILE%\ZenithTasks\windows\`**:
  - **`Chay-Zenith.bat`** — cài/cập nhật + chạy (clone/pull + `docker compose up -d --build`). Tự cài Git/Docker qua winget nếu thiếu.
  - **`Sua-Loi.bat`** — CẬP NHẬT SẠCH (`git reset --hard origin` + `build --no-cache app` + `up -d --force-recreate` + `migrate deploy`). Dùng khi cập nhật lỡ dở / đổi schema. Tự xin quyền admin.
  - **`Mo-App.bat`** (mở), **`Phat-Hanh-Mang`/`Dia-Chi-Co-Dinh`** (Cloudflare Tunnel ra Internet), **`Sao-Luu`/`Cai-Sao-Luu-Tu-Dong`** (sao lưu DB + uploads), **`Cai-AI-Key`** (đặt `ANTHROPIC_API_KEY`), **`Xem-Loi`** (xuất log).
- **docker-compose.yml GỐC** (dùng khi vận hành): service `db` (Postgres, volume `zenith_db`) + `app` (build `./web`, cổng 3000, volumes `zenith_uploads:/app/public/uploads` + `zenith_secrets:/app/.runtime`). Env qua `.env` cạnh file (xem `.env.example`): `AUTH_SECRET`, `PHONE_ENC_KEY`, `APP_ORIGINS` (tên miền sau Cloudflare), `ANTHROPIC_API_KEY`…
- ⚠️ `web/docker-compose.yml` CHỈ là DB cho lập trình (không có service app, không volume ảnh) — script Windows luôn chạy compose ở thư mục GỐC nên không đụng tới nó.
- Đăng nhập lần đầu: `admin / 123456` (đổi ngay).

## 12. Git & quy trình bàn giao
- **Nhánh phát hành hiện hành: `master`** theo chỉ đạo trực tiếp của chủ dự án ngày 2026-08-01. Mọi thay đổi đã kiểm thử phải commit và push lên `origin/master`; không tạo nhánh/PR khác nếu chủ chưa yêu cầu.
- Mỗi thay đổi chức năng phải cập nhật `DU-AN.md`; thay đổi kiến trúc/quy ước/vận hành phải cập nhật thêm `BAN-GIAO.md` và tài liệu liên quan (`README.md`, `PROJECT-OVERVIEW.md`, `DEPLOY.md`, `.env.example`) để phiên sau tiếp quản được.
- Commit message tiếng Việt, rõ ràng; không ghi tên/định danh model hoặc URL phiên làm việc trong commit/code/comment.
- Trước push: xem diff, chạy kiểm thử phù hợp và chỉ stage tệp thuộc phạm vi công việc. Repo scope: `ledinhlam23032000/ZenithTasks`.

## 13. Cạm bẫy đã gặp (đọc để khỏi lặp lại)
1. **"Không mở được hồ sơ điều trị" (P2002)**: mã sinh bằng `count()+1` trùng sau khi xóa → đổi sang `nextSeq` (max+1) + retry. (Mục 8.5)
2. **Ảnh không hiện ở production**: `next start` không phục vụ file ghi lúc chạy trong `public/` → route `/media/[file]`. (Mục 8.6)
3. **Lưu "xoay mãi dù đã lưu"**: `revalidatePath` trong action gộp render lại cả trang vào phản hồi → `useFormAction`. (Mục 8.1)
4. **vitest không resolve `@/`**: test dùng import tương đối; tách logic thuần (vd `seq.ts`) khỏi code import db.
5. **`migrate reset`/`migrate dev` không chạy được trong sandbox** → viết migration tay + `migrate deploy`.
6. **Forge JWT phải chạy từ `web/`** để resolve `jose`.
7. **`cd` không giữ giữa các lần gọi Bash; `sleep` foreground bị chặn** → dùng vòng `until`/`run_in_background`.
8. Sau đổi schema mà quên `prisma generate` → tsc báo lỗi kiểu.

## 14. TODO / lộ trình
- **Hộp thư đa kênh Zalo OA + Facebook Fanpage**: chủ dự án đã có quyền quản trị cả hai và duyệt hướng tích hợp trực tiếp ngày 2026-08-01. Thiết kế tại `docs/superpowers/specs/2026-08-01-omnichannel-inbox-design.md`; chỉ nhận tin mới, trả lời trong app, chưa bật AI tự trả lời/broadcast.
- **AI tự trả lời (giai đoạn sau)**: chỉ xem xét sau khi inbox thật vận hành ổn định; nội dung y khoa/giá vẫn cần người duyệt.
- Sửa giờ **Shift** (ca làm việc) — chưa có.
- (Cân nhắc) cờ "nhân sự bệnh viện điều động: lương cố định, không trừ ngày công".
- (Cân nhắc) xuất Word/Excel cho từng hoá đơn (hiện chỉ In/PDF).
- (Cân nhắc) ảnh cận lâm sàng độ phân giải cao hơn (hiện nén chung 1920px).

## 15. Trỏ tới tài liệu khác
- **`DU-AN.md`** — changelog chi tiết theo từng đợt (đọc để biết lịch sử + lý do từng quyết định).
- **`AGENTS.md`** — lưu ý Next.js 16 (đọc docs trong node_modules trước khi viết).
- **`PROJECT-OVERVIEW.md`** — bản giới thiệu dự án (để gửi người/AI khác review).
- **`CLAUDE.md`** — tự nạp các tài liệu trên vào ngữ cảnh mỗi phiên.
