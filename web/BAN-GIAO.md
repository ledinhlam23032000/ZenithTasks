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
- **Biểu đồ**: `recharts` (Bar/Line/Area/Pie/Composed) — bọc trong `components/ui/multi-chart.tsx` + `range-chart.tsx`. `ResponsiveContainer` có `initialDimension` để không cảnh báo kích thước khi render phía máy chủ.
- **Test**: `vitest` (`src/lib/__tests__`). CI: `.github/workflows/ci.yml`.
- **proxy.ts** (middleware): `PUBLIC_PATHS = ["/login","/dat-lich","/khach"]`; matcher chính loại trừ `api|_next/static|_next/image|favicon.ico|img|uploads|.*\\..*` (uploads tách riêng, xem dưới). Next 16 chạy proxy bằng Node.js runtime (không còn giới hạn Edge) nên proxy **xác thực chữ ký JWT thật** (`jwtVerify`) chứ không chỉ kiểm tra cookie có tồn tại — cookie hỏng (hết hạn/đổi `AUTH_SECRET`/sửa tay) bị **xoá ngay trên response** trước khi chuyển hướng, tránh vòng lặp `ERR_TOO_MANY_REDIRECTS` giữa `/login` ↔ trang cần đăng nhập. **`/uploads/*` có matcher entry RIÊNG** (`"/uploads/:path*"`) để proxy chặn luôn đường tĩnh Next.js phục vụ file trong `public/uploads` — không có phiên hợp lệ → 401. Lý do: file trong `public/` được Next tự phục vụ static theo đúng đường dẫn, HOÀN TOÀN BỎ QUA route `/media/[file]` (nơi có xác thực) nếu không chặn riêng — nếu không có entry này, ai biết đúng tên tệp vẫn xem được ảnh/giấy tờ qua `/uploads/<f>` dù đã có `/media`.

## 3. Bản đồ thư mục
```
web/
  prisma/schema.prisma          # Mô hình dữ liệu (nguồn duy nhất)
  prisma/migrations/            # Migration viết tay, commit kèm (entrypoint chạy migrate deploy)
  src/app/
    (app)/                      # Khu vực đăng nhập (có app-shell, sidebar)
      dashboard, viec-hom-nay, dau-ca, cong-no, lich-hen, tiep-nhan, khach-hang, ho-so/[id], cham-soc,
      bao-cao, phan-tich, hieu-suat, cong-tac-vien, lich-lam-viec, luong, thu-chi,
      nhan-su/[id], nhat-ky, he-thong, danh-muc, mau-phieu, kho, cham-cong, tai-khoan
      <mỗi mục>/actions.ts       # Server actions của mục đó
      <mỗi mục>/*-forms.tsx      # Form client (modal)
    login/, dat-lich/           # Công khai
    khach/[token]/              # Cổng khách hàng (công khai, theo token)
    media/[file]/route.ts       # Phục vụ ảnh từ public/uploads (KHÔNG auth — để cổng khách xem được)
  src/lib/                      # Logic dùng chung (xem mục 4)
  src/components/ui/            # Nút, modal, bảng, combobox, money-input, photo-gallery, photo-compare (D2), contact-buttons (B2 bậc 1), medical-alert (B6 cảnh báo an toàn), chart…
  src/components/layout/        # app-shell (sidebar + header), change-password, command-palette (D4, Ctrl/Cmd+K)
  src/components/charts/        # revenue-chart (dùng MultiChart)
windows/                        # Script .bat/.ps1 triển khai trên máy Windows (xem mục 11)
client/                         # App máy con (mở trình duyệt vào máy chủ)
docker-compose.yml              # GỐC repo — dùng khi VẬN HÀNH (có volume ảnh)
web/docker-compose.yml          # CHỈ là DB cho lập trình — KHÔNG dùng khi vận hành
```

### Các trang & route (34 page, hầu hết `export const dynamic = "force-dynamic"`)
Chỉ 3 trang KHÔNG dynamic: `/` (redirect), `/login`, `/khong-co-quyen`. **Hệ quả quan trọng**: mọi trang dữ liệu luôn tải mới khi điều hướng → `revalidatePath` gần như THỪA (xem mục 8 về `useFormAction`).

### Quy ước trải nghiệm người dùng
- Menu trong `permissions.ts` có trường `group`, chia 6 nhóm: **Hôm nay / Khách hàng / Phân tích / Trợ lý AI / Vận hành / Quản trị**. Giữ nhóm khi thêm module mới để sidebar không trở lại thành danh sách dài. Mỗi nhóm trong sidebar tự đóng/mở (bấm tiêu đề nhóm) — mặc định chỉ mở nhóm "Hôm nay" + nhóm chứa trang đang xem, trạng thái lưu `localStorage`.
- **Gộp trang liên quan chung 1 mục menu** (đỡ dài mà không mất chức năng): đặt `hidden: true` cho module phụ trong `permissions.ts` (vẫn là module riêng để phân quyền, chỉ ẩn khỏi sidebar/Ctrl+K), rồi thêm `<PageTabs tabs={...} />` (từ `lib/nav-tabs.ts`) ngay dưới `PageHeader` của các trang liên quan để điều hướng qua lại. Đã áp dụng: Báo cáo⟷Phân tích kinh doanh, Hiệu suất nhân sự⟷Cộng tác viên, Danh mục dịch vụ⟷Kho vật tư, Chấm công⟷Lịch làm việc. `nav-tabs.ts` tự lọc tab theo quyền từng người — khi thêm nhóm gộp mới, viết hàm tương tự (không hard-code tab cho người không có quyền).
- **Trợ lý AI là ngoại lệ cố ý:** hiển thị thành nhóm/menu riêng cho ADMIN + SHAREHOLDER để cổ đông lớn tuổi dễ tìm; trên mobile được ưu tiên ngay thanh đáy. `userCan()` chặn cứng mọi vai trò khác, kể cả khi bị cấp `grant` nhầm.
- Mục chỉ dành riêng 1-2 vai trò vận hành (vd "Đầu ca lễ tân" — chỉ RECEPTION/TELESALE) thì đặt `roles` đúng vai trò đó, KHÔNG thêm ADMIN/MANAGER mặc định — tránh sidebar quản trị bị nhét việc vận hành không liên quan. ADMIN cần xem thì cấp quyền riêng qua Phân quyền.
- Trên điện thoại, `AppShell` hoạt động như một app mobile-first: header gọn + thanh đáy 5 nút (3 mục ưu tiên theo quyền, Tìm kiếm, Tất cả). Nút **Tất cả** mở kho ứng dụng dạng bottom-sheet, liệt kê TOÀN BỘ module người dùng được cấp quyền theo nhóm; do đó mobile không mất công năng nào so với web. Modal và tìm kiếm cũng dùng bottom-sheet; bảng rộng giữ đủ cột và có chỉ dẫn vuốt ngang.
- `components/install-app.tsx` hướng dẫn cài PWA lên iPhone bằng Safari → Chia sẻ → Thêm vào MH chính; trình duyệt hỗ trợ `beforeinstallprompt` thì gọi hộp cài trực tiếp. `manifest.ts`, `PwaRegister`, `public/sw.js` và `viewportFit: cover` tạo trải nghiệm toàn màn hình, hỗ trợ vùng tai thỏ/safe-area. Service worker KHÔNG cache dữ liệu nghiệp vụ nhạy cảm, chỉ cache icon tĩnh.
- Tổng quan hiển thị `WorkSummary` ngay dưới lời chào nếu người dùng có quyền `mod:viec-hom-nay`; chi tiết vẫn nằm tại `/viec-hom-nay`.
- Hồ sơ điều trị có thanh điều hướng neo cố định (`#tong-quan`, `#tu-van`, `#dich-vu`, `#vat-tu`, `#hinh-anh`, `#giay-to`, `#tai-chinh`, `#tai-kham`). Khi thêm khối lớn mới, cân nhắc thêm neo tương ứng.
- Đặt lịch công khai tách **ngày** và **giờ**, có các khung giờ chọn nhanh nhưng vẫn cho nhập giờ khác. Đây là giờ mong muốn, không được mô tả là giờ còn trống khi chưa có mô hình sức chứa.
- Danh sách Lịch hẹn và Hồ sơ khách dùng dạng thẻ ở màn hình nhỏ (`sm:hidden`) và giữ bảng ở màn hình lớn (`hidden sm:block`). Khi bổ sung cột mới, cập nhật cả hai cách hiển thị.

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
- **collections.ts** — `collectionsByStaff/collectionsTotal` THUẦN (có test): gom tiền THỰC THU (Payment) trong 1 kỳ về từng nhân sự (tư vấn viên + bác sĩ, cùng 1 khoản ghi cho cả 2), tách "ca tháng này" (`fromNew`) / "thu nợ ca cũ" (`fromDebt`, hồ sơ tạo trước kỳ). Dùng ở `payroll.ts` + `performance.ts` — đây là CĂN CỨ để quản lý nhập hoa hồng (khách trả nợ tháng nào tính thực thu tháng đó, không phải tháng chốt ca).
- **payroll.ts** — `getPayroll(monthDate, standardDays=26)` → bảng lương, có thêm `collectedConsult/collectedDoctor` (thực thu từng người, dùng `collections.ts`) + `debtOutstanding` (nợ khách mình phụ trách còn lại) + `collectedAll` (thực thu toàn trung tâm trong tháng).
- **reports.ts** — `getReports(monthDate?)`, `getMonthlyPnl(monthDate?)` (nhận tháng bất kỳ, mặc định tháng hiện tại — "tháng trước" luôn lùi 1 tháng từ mốc xem), `getSalesSeries()` (mốc tuần/tháng/năm, luôn tương đối "hiện tại" — không theo tháng chọn).
- **dashboard.ts** — `getAdminDashboard()` (CHỈ tháng hiện tại — dùng cho `/dashboard`), `getStaffSnapshot()`.
- **performance.ts** — `getStaffPerformance/getStaffDetail` (hiệu suất nhân sự, có `collectedConsult/collectedDoctor`; `getStaffDetail` có thêm `collections` = danh sách từng khoản tiền đã thu trong tháng của người đó); `getCollaborators/getCollaboratorDetail/getCollaboratorSeries` (cộng tác viên); `rangeBounds(range)`.
- **nav-tabs.ts** — `reportTabs/performanceTabs/catalogTabs/attendanceTabs(user)`: danh sách tab (đã lọc theo quyền) cho các nhóm trang gộp chung 1 mục sidebar — xem mục "Quy ước trải nghiệm người dùng".
- **settings.ts** — cấu hình dùng chung dạng khoá–giá trị lưu ở DB (model `AppSetting`): `getSetting/setSetting`, `getDebtThreshold()` (ngưỡng cảnh báo công nợ, mặc định 5tr). Vì lưu DB nên KHÔNG mất khi rời trang / đổi máy (trước đây ngưỡng chỉ ở URL nên "không lưu"). Thêm cấu hình mới → thêm khoá + helper ở đây.
- **lookups.ts** — `getActiveServices/getActiveMaterials/getConsultants/getDoctors`. `getConsultants` trả **MỌI nhân sự đang hoạt động** (ai cũng có thể là người tư vấn).
- **loyalty.ts** — hạng thành viên + điểm theo chi tiêu thực (`tierFor/pointsFor/nextTier`).
- **media.ts** — `photoSrc(url)`: map URL cũ `/uploads/<f>` → `/media/<f>`, URL khác giữ nguyên.
- **compress-image.ts** — `compressImage(file, maxDim=1920, quality=0.82)`: nén ảnh ngay trên trình duyệt trước khi tải lên (HEIC tự fallback về file gốc).
- **use-form-action.ts** — **hook lưu chuẩn** (xem mục 8). RẤT QUAN TRỌNG.
- **audit.ts** — `audit(actorId, action, {entity,entityId,meta})` ghi `AuditLog` (nuốt lỗi an toàn).
- **export.ts** + **xlsx.ts** — xuất CSV/Word(.doc)/Excel(.xlsx THẬT, tự dựng ZIP, không thư viện ngoài).
- **ai.ts** — gọi AI soạn tin chăm sóc, **TRUNG LẬP NHÀ CUNG CẤP** (không khoá vào một hãng). `resolveAiConfig(env)` THUẦN (có test) phân giải cấu hình từ `AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL`/`AI_PROVIDER`; hỗ trợ 2 chuẩn API: **OpenAI-compatible** (`/chat/completions` — DeepSeek, Qwen, Gemini-compat, OpenAI, Groq, tự host Ollama/vLLM) và **Anthropic** (`/v1/messages` — Claude). Tương thích ngược `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`. Ẩn nút AI nếu chưa có khoá (`aiConfigured()`). KHÔNG gửi dữ liệu nhạy cảm (chỉ tên + mục đích + dịch vụ gần nhất). Chọn nhà cung cấp: xem khối "AI" trong `.env.example`.
- **rate-limit.ts** — chống dò mật khẩu + chống spam đặt lịch (theo IP + tài khoản).
- **case-math.ts** — `computeCaseTotals()` toán tiền hồ sơ THUẦN (có test). `recalc()` trong `ho-so/actions.ts` dùng hàm này.
- **inventory-cost.ts** — giá vốn kho THUẦN (có test, B5): `weightedAvgCost` (bình quân gia quyền; chưa có giá vốn thì lấy luôn giá nhập), `stockValue`, `totalStockValue`. Dùng ở `danh-muc` (nhập kho) + `/kho` (giá trị tồn).
- **service-bom.ts** — định mức vật tư theo dịch vụ THUẦN (có test, B5 gđ2): `scaleBomQty` (định mức × SL dịch vụ), `bomNeeds` (quy đổi cả danh sách + đánh dấu thiếu tồn), `bomShortages`, `bomCost` (giá vốn ước tính). Dùng ở `danh-muc` (khai báo định mức qua `ServiceBomButton`) + `ho-so/actions.ts` (`applyServiceBom` tự trừ kho theo định mức).
- **media-token.ts** — ký/kiểm "vé" xem ảnh ngắn hạn (A1): `signMediaToken/verifyMediaToken/withMediaToken`.
- **security-status.ts** — `securityWarnings()` (A2): cảnh báo khoá mã hoá demo → banner ADMIN.
- **workqueue.ts** — `getWorkqueue()` (B1): tổng hợp "Việc cần làm hôm nay" từ dữ liệu sẵn có.
- **system-status.ts** — `getSystemStatus()`/`humanBytes()` (A7): số liệu trang Tình trạng hệ thống.
- **search-actions.ts** — `globalSearch(query)` (D4): tìm khách hàng/hồ sơ/vật tư cho command palette, lọc theo quyền (`moduleCan`).
- **debt-aging.ts** — tuổi nợ THUẦN (có test, B3): `debtAgeDays`, `debtAgingBucket` (4 mốc 0-15/15-30/30-60/60+), `isOverThreshold`. Dùng ở `/cong-no`.
- **debt-plan.ts** — kế hoạch trả nợ / hẹn nợ THUẦN (có test, B3 bổ sung): `clampDayOfMonth` (1..31), `dueDateInMonth` (ngày X của 1 tháng cụ thể — tháng thiếu ngày 29/30/31 tự lùi về ngày cuối tháng), `nextDueDate`, `monthsToClear`, `duePeriods`, `expectedPaidByNow`, `debtPlanStatus` (kỳ tới + số tháng còn lại + đang chậm bao nhiêu). Dùng ở hồ sơ (`DebtPlanCard` qua `cong-no/actions.ts` `saveDebtPlan`/`deleteDebtPlan`) + gợi ý kỳ tới ở `/cong-no`. Model `DebtPlan` (1 hồ sơ 1 kế hoạch, caseId unique). `DebtPlanCard` tự hiện "Đã tất toán" khi còn kế hoạch mà nợ đã về 0.
- **leads.ts** — khách tham khảo THUẦN (có test): `LEAD_STATUSES`/`LEAD_STATUS_LABEL`/`LEAD_STATUS_TONE`, `summarizeLeads` (phễu: tổng/đang theo đuổi/đã chuyển/tỉ lệ chuyển đổi). Dùng ở `/khach-tham-khao` (module `khach-tham-khao`, icon `UserSearch`). Actions `khach-tham-khao/actions.ts`: createLead/updateLead (cặp useFormAction), setLeadStatus/deleteLead/convertLeadToCustomer. `convertLeadToCustomer` COPY thẳng SĐT đã mã hoá sang Customer (không giải mã), chống trùng theo phoneHash.
- **upload.ts** — tệp giấy tờ tải lên THUẦN (có test): `isAllowedDocMime`/`docExt`/`safeStoredName`/`prettyFileSize` (PDF/ảnh/Word/Excel, chống path traversal). Dùng ở `uploadCaseDocument` (ho-so/actions). Model `CaseDocument` (giấy tờ hành chính/phiếu đồng ý ĐÃ KÝ tải lên thay vì gõ tay) hiện ở thẻ "Giấy tờ hành chính" của hồ sơ; xem qua `/media/<tệp>` (route đã thêm content-type PDF/Word/Excel, vẫn gate đăng nhập/vé).
- **nps.ts** — đánh giá NPS THUẦN (có test, D3 gđ2): `clampScore` (0..10), `npsCategory`, `npsSummary` (NPS = %promoter − %detractor + điểm TB + đếm nhóm). Dùng ở cổng khách (`portalSubmitNps`) + thẻ NPS trên `/phan-tich` (qua `getBusinessAnalytics`). Model `NpsResponse`. Link cổng khách có `Customer.portalTokenExpiresAt` (90 ngày, `genPortalLink`/`revokePortalLink`).
- **assistant.ts** — trợ lý AI hỏi-đáp THUẦN (có test, D1): `formatAssistantContext` (ảnh chụp số liệu → văn bản gọn), `ASSISTANT_SYSTEM`, `SUGGESTED_QUESTIONS`. **assistant-data.ts**: `getAssistantContext()` gom số liệu KINH DOANH (KHÔNG gồm SĐT/y khoa) — tái dùng `getBusinessAnalytics`. Dùng ở `/tro-ly` (module `tro-ly`, icon `Sparkles`, ADMIN/MANAGER/SHAREHOLDER); action `askAssistant` đưa bối cảnh cho `ai.ts` — AI KHÔNG truy cập thẳng DB (chống bịa số/rò rỉ). 🔑 cần `AI_API_KEY`.
- **message-templates.ts** — mẫu tin nhắn THUẦN (có test, B2 bậc 1): `tplDebtReminder/tplFollowUpReminder/tplApptConfirm/tplBirthday/tplWinback` — chỉ tạo text, không tự gửi. Dùng ở `ContactButtons`.
- **analytics.ts** — phân tích kinh doanh THUẦN (có test, Nhóm C): `rfmScore`/`rfmSegment`/`isChurnRisk` (phân khúc khách theo RFM, ngưỡng `DEFAULT_RFM` tinh chỉnh được), `funnelRates` (tỉ lệ phễu chuyển đổi), `marketingRoi` (ROI marketing — C3). Dùng ở `/phan-tich`.
- **analytics-data.ts** — `getBusinessAnalytics(days)` (Nhóm C): truy vấn + lắp ráp RFM/phân khúc/radar khách rời bỏ/phễu hồ sơ + lịch hẹn/LTV theo nguồn. Dùng `analytics.ts` (thuần) để chấm điểm.
- **schedule.ts** — chống trùng lịch THUẦN (có test, B4): `slotConflict`/`findConflicts`/`minutesApart` + `SLOT_WINDOW_MIN` (30'). Dùng ở `lich-hen/actions.ts` (`consultantConflictMessage`).
- **stock-in.ts** — phiếu nhập kho nhiều dòng THUẦN (có test, B5): `validStockInLines`/`parseStockInLines`/`stockInTotal`. Dùng ở `kho/actions.ts` (`stockInBatch` — nhập nhiều vật tư 1 giao dịch).
- **consent.ts** — phiếu đồng ý THUẦN (có test, B6 gđ2): `fillConsentTemplate` thay placeholder `{{ten}}/{{ngay}}/{{dichvu}}/{{mahoso}}` + `CONSENT_PLACEHOLDERS`. Dùng ở `/mau-phieu` + `ho-so/[id]/consent-widgets.tsx`.
- **scripts/backup.mjs** (ngoài lib) — sao lưu tự động (A5): `pg_dump -Fc` + ảnh + status JSON; `npm run backup`.

## 5. Mô hình dữ liệu (Prisma)
**Enums**: `Role` (ADMIN, MANAGER, TELESALE, RECEPTION, CONSULTANT, DOCTOR, NURSE, CARE, SHAREHOLDER), `Gender`, `CustomerSource`, `AppointmentType`, `AppointmentStatus`, `CaseStatus` (OPEN, CONSULTED, SERVICED, COMPLETED, CANCELLED), `ConsultResult` (PENDING, AGREED, CONSIDERING, DECLINED), `PaymentMethod` (CASH, CARD, TRANSFER, EWALLET), `PhotoType` (BEFORE, AFTER, FOLLOW_UP, **CLINICAL**), `CareChannel`, `CareDirection`, `StockType`, `CashType` (INCOME, EXPENSE).

**Models chính**:
- **User** — nhân sự + thông tin HR đầy đủ (dob, gender, nationalId, hometown, address, bank*, emergency*, position, department, hireDate, qualification, notes), `baseSalary`, `avatarUrl`, `role`, `permissions` (JSON `{grant,deny}`), `totpSecret/totpEnabled`. **KHÔNG còn `commissionRate`** (đã bỏ — hoa hồng nhập tay).
- **Customer** — `phoneEnc`(mã hoá)/`phoneLast5`, `source`/`sourceDetail` (CTV gắn ở đây), `portalToken`, `code`. An toàn y khoa (B6 gđ1): `allergies`/`medicalHistory`/`contraindications` (text, hiện banner cảnh báo ở trang khách + hồ sơ qua `components/ui/medical-alert.tsx`).
- **Appointment** (`phoneEnc` — SĐT mã hoá, chỉ có khi đặt qua `/dat-lich` công khai; lịch tạo nội bộ chỉ thu 5 số cuối nên null), **CaseRecord** (hồ sơ điều trị: `code`, `status`, `consultResult`, `consultantId`, `doctorId`, `totalAmount`, `paidAmount`, `debtAmount`, `discountAmount`, `commissionAmount` (nhập tay), `voucherCode`, `voucherAmount`, `locked/lockedAt/lockedById`, `completedAt`).
- **CaseService** (`listPrice`=giá gốc, `unitPrice`=giá ưu đãi, `quantity`, `discount`, `finalPrice`), **Payment** (`amount`, `method`, `paidAt`, `receivedById`), **MaterialUsage**, **Photo** (`type`, `url`, `caption`, `followUpIndex`, `caseId` nullable — giữ ảnh khi xóa hồ sơ).
- **Service** (`listPrice` niêm yết + `defaultPrice` ưu đãi), **Material** (`stock`, `minStock`, `lotNo`, `expiryDate`, `avgCost` = giá vốn bình quân), **StockMovement** (`type`, `quantity`, `unitCost` = đơn giá tại thời điểm GD). Khi thêm/sửa/xóa vật tư trong hồ sơ → tự trừ/hoàn tồn + ghi `StockMovement` (nguyên tử, xem `ho-so/actions.ts`). Giá vốn: xem `lib/inventory-cost.ts`.
- **ServiceMaterial** (B5 gđ2 — định mức vật tư/BOM: `serviceId`+`materialId`+`quantity` định mức/lần, unique theo cặp). **Khi thêm dịch vụ vào hồ sơ (`addCaseService`) hệ thống TỰ ĐỘNG trừ kho theo định mức** (Đợt 20 — helper `applyBomTx`): đọc bảng này → ghi MaterialUsage + trừ kho (× SL dịch vụ) + đánh dấu `CaseService.bomApplied`. Nút "Trừ VT" thủ công (`applyServiceBom`) VẪN còn cho dịch vụ thêm trước khi có auto, hoặc dịch vụ khai báo định mức sau. `bomApplied` chống trừ 2 lần. Điều kiện: dịch vụ phải có định mức (khai báo ở `danh-muc` qua `ServiceBomButton`). Xem `lib/service-bom.ts`.
- **DebtPlan** (B3 bổ sung — hẹn nợ/trả góp: `caseId` unique + `dayOfMonth` 1..31 (tháng thiếu ngày tự lùi cuối tháng) + `monthlyAmount` + `startDate` + `note`). Mỗi hồ sơ 1 kế hoạch. KHÔNG sinh từng dòng kỳ — lịch & trạng thái suy ra bằng `lib/debt-plan.ts`. Xem ở thẻ Tài chính của hồ sơ.
- **Lead** + enum **LeadStatus** (NEW/CONTACTED/CONVERTED/LOST) — khách tham khảo: `fullName` + SĐT mã hoá (tuỳ chọn, như Customer) + `source`/`sourceDetail` + `serviceInterest` + `status`. Phễu trước Customer/Appointment. `convertLeadToCustomer` chuyển thành Customer. Xem `lib/leads.ts` + `/khach-tham-khao`.
- **ConsentTemplate** + **CaseConsent** (B6 gđ2 — phiếu đồng ý): mẫu phiếu (quản ở `/mau-phieu`) + phiếu đã ghi nhận cho hồ sơ (lưu snapshot title/body). Card "Phiếu đồng ý" + in ở `ho-so/[id]/consent/[consentId]`. Xem `lib/consent.ts`.
- **Attendance** (chấm công theo ngày), **Shift** (ca làm), **PayrollEntry** (theo tháng: `baseSalary`, `commission` nhập tay, `bonus`, `adjustment`…).
- **CareMessage** (nhật ký chăm sóc: `channel`, `direction`), **FollowUp** (hẹn tái khám), **AuditLog**, **CashTransaction** (sổ thu chi), **Collaborator** (hồ sơ CTV: `name @unique`, `phone`, `bank*`, `note`, `active`).
- **AppSetting** (cấu hình khoá–giá trị dùng chung: `key @id` + `value` + `updatedAt`). Hiện dùng cho ngưỡng cảnh báo công nợ (`debt.threshold`). Xem `lib/settings.ts`.

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
- **Thực thu (căn cứ nhập hoa hồng)**: doanh thu chia 2 dạng — **giá trị chốt** (`totalAmount`, gồm cả nợ chưa thu) và **thực thu** (tiền THẬT đã về, theo `Payment.paidAt`). Khách trả nợ tháng nào thì khoản đó tính vào thực thu tháng đó của tư vấn viên VÀ bác sĩ phụ trách hồ sơ (không phải tháng chốt ca) — xem `lib/collections.ts`. `/luong` và `/hieu-suat` hiện cột Thực thu (tách rõ "ca tháng này" / "thu nợ ca cũ") + Nợ khách còn lại, để quản lý biết đúng doanh số thật trước khi nhập hoa hồng tay.

### Sổ thu chi & Lãi/Lỗ (`finance.ts`, `reports.ts`)
- **Sổ thu chi** (`/thu-chi`): dòng tiền vận hành nhập tay. Thẻ: Tổng thu / Tổng chi / **Số dư sổ** (KHÔNG hiện doanh thu/lãi lỗ — để kế toán/lễ tân không thấy).
- **Lãi/Lỗ** chuyển sang **Báo cáo** (`getMonthlyPnl(monthDate?)` = doanh thu dịch vụ + thu khác − tổng chi, xem được tháng bất kỳ). Hạng mục thu có "Ứng từ doanh thu để chi trả" (`ADVANCE_REVENUE`).

### Công nợ (`/cong-no`)
- Thu nợ / tất toán ngay tại sổ công nợ (không cần mở hồ sơ): nút "Thu nợ" mỗi dòng mở modal mặc định điền đủ số còn lại — bấm là **tất toán** (nợ về 0); sửa số tiền để thu một phần. Dùng lại `addPayment` (khoá hồ sơ + `recalc` nguyên tử, xem mục 9).
- Thẻ "Đã thu nợ tháng này" = thực thu trong tháng từ hồ sơ tạo TRƯỚC tháng (đồng bộ định nghĩa với `lib/collections.ts`). Có lọc theo tư vấn viên.
- Hẹn nợ: ngày trả hằng tháng nhận **1..31** (không còn giới hạn 28) — tháng thiếu ngày tự lùi về ngày cuối tháng, xem `lib/debt-plan.ts`.

### Đếm số liệu (đồng bộ Tổng quan ↔ Báo cáo)
- Mọi đếm theo **`createdAt` trong tháng**. Tỉ lệ chốt = AGREED / tổng ca tháng. "Dịch vụ nổi bật" xếp theo **số lượt** rồi doanh thu. **Báo cáo xem được tháng bất kỳ** (`?m=yyyy-MM`, giống Lương/Hiệu suất) — "Phân bổ nguồn khách" lọc đúng theo tháng đang xem (trước đây đếm nhầm toàn thời gian).

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
- Lưu file vào `public/uploads`; DB lưu `url = /media/<tên>`. Phục vụ qua **route `app/media/[file]/route.ts`** (đọc từ `public/uploads`; chặn `..`, chỉ tên `[A-Za-z0-9._-]`). Lý do: `next start` KHÔNG phục vụ tin cậy các file ghi lúc chạy trong `public/`.
- ⚠️ **Ảnh y khoa CÓ xác thực** (A1): route chỉ trả ảnh khi (1) có **phiên đăng nhập** HOẶC (2) có **vé ký `?t=`** hợp lệ (HMAC theo `AUTH_SECRET`, gắn đúng 1 tệp, hạn 24h — `lib/media-token.ts`). Trang nhân viên dùng cookie phiên (không cần vé). Cổng khách công khai phải **ký vé qua `withMediaToken(url)`** cho từng ảnh. Render `<img>` ở trang ĐĂNG NHẬP → `photoSrc(url)` như cũ; ở trang CÔNG KHAI → `withMediaToken(url)`.
- Hiển thị qua `components/ui/photo-gallery.tsx`: thu nhỏ tải lười + bấm xem lớn (◀▶/Esc/Tải về) + xóa (nếu có quyền). Khi render `<img>` thủ công thì bọc `src={photoSrc(p.url)}`.
- **Lưu trữ thực tế**: thư mục `public/uploads` được mount vào **volume Docker `zenith_uploads`** (compose GỐC) → KHÔNG mất khi `build --no-cache`/cập nhật. `windows/Sao-Luu.ps1` sao lưu cả DB lẫn `uploads`.
- **Ảnh đại diện (avatar)**: lưu PHẲNG vào `public/uploads` (giống ảnh hồ sơ/giấy tờ, KHÔNG còn thư mục con `avatars/` — thư mục con từng khiến avatar bị lộ công khai qua đường tĩnh Next.js, xem mục 9). Định dạng nhận diện qua **magic bytes** (`lib/upload.ts` `sniffImageExt()`), KHÔNG tin `file.type`/đuôi tên tệp do trình duyệt gửi. Cài cũ nâng cấp lên: `scripts/migrate-avatar-storage.mjs` tự chạy 1 lần lúc container khởi động (idempotent) để chuyển avatar cũ ra thư mục phẳng + cập nhật `User.avatarUrl`.

### 8.7. Múi giờ
VN (`TZ` trong docker-compose). Ngày chấm công dùng `vnDateOnly()`.

### 8.8. Migration
Đổi schema → **viết tay** file trong `prisma/migrations/<timestamp>_<tên>/migration.sql` + commit. Entrypoint chạy `prisma migrate deploy` khi khởi động. ⚠️ Trong sandbox: `prisma migrate dev` lỗi "non-interactive", `migrate reset` BỊ CHẶN cho AI. Sau khi đổi schema phải chạy `npx prisma generate` để tsc không lỗi. `ALTER TYPE ... ADD VALUE IF NOT EXISTS` cho việc thêm giá trị enum (idempotent).

## 9. Bảo mật (RÀNG BUỘC — phải giữ)
- **SĐT khách**: luôn mã hoá **AES-256-GCM**. Số đầy đủ chỉ lộ cho **ADMIN + MANAGER** qua server action `revealPhone(customerId)` (ghi audit `REVEAL_PHONE`) — chỉ giải mã KHI BẤM, KHÔNG giải mã lúc render. Nhân sự khác chỉ thấy 5 số cuối (`maskPhone`).
- **Ảnh y khoa** (A1): route `/media/[file]` có xác thực (đăng nhập hoặc vé ký `?t=`) — KHÔNG còn công khai. Xem mục 8.6.
- **Đường tĩnh `/uploads/*` cũng được chặn** (không chỉ route `/media`): `proxy.ts` có matcher riêng cho `/uploads/:path*`, trả 401 nếu không có phiên hợp lệ — chặn việc Next.js tự phục vụ file tĩnh trong `public/uploads` bỏ qua hoàn toàn xác thực của `/media`. Xem mục 2.
- **SĐT lịch hẹn đặt online**: `dat-lich/actions.ts` mã hoá `Appointment.phoneEnc` như Customer (KHÔNG còn nhét chữ thường vào `note`). Xem qua nút "Liên hệ" ở `/lich-hen` (`revealAppointmentPhone`, cùng cơ chế `phone.full` + audit `REVEAL_PHONE`).
- **Khoá mã hoá**: `lib/security-status.ts` cảnh báo (banner đỏ cho ADMIN) khi `PHONE_ENC_KEY` còn là khoá demo. Đổi khoá thật rồi `npm run rotate:phone`.
- **Mật khẩu demo**: đăng nhập bằng đúng mật khẩu seed `123456` → JWT được đánh dấu `weakPw:true` (xem `login/actions.ts`) → banner đỏ **"Tài khoản của bạn vẫn dùng mật khẩu mặc định"** hiện cho CHÍNH người đó (mọi vai trò, không riêng ADMIN) ở `(app)/layout.tsx`, link thẳng `/tai-khoan`. Đổi mật khẩu (`changePassword`) tự làm mới session với `weakPw:false` ngay, không cần đăng xuất lại.
- **Toán tiền nguyên tử** (A3): mọi thao tác động tới tiền trong hồ sơ chạy qua `withCaseLock` (`$transaction` + `FOR UPDATE`). Toán đặt ở `lib/case-math.ts` (thuần, có test) — sửa logic tiền thì sửa ở đó + cập nhật test.
- **`AUTH_SECRET`**: tự sinh ngẫu nhiên mỗi máy, lưu trong volume `zenith_secrets` (KHÔNG commit). Có thể đặt riêng qua `.env`.
- **`PHONE_ENC_KEY`**: hiện dùng khoá DEMO tương thích cũ (trong `docker-entrypoint.sh`). Đổi khoá cần **mã hoá lại** dữ liệu (`prisma/rotate-phone-key.ts`) — KHÔNG tự đổi. **Repo phải để PRIVATE.**
- **Khi đóng gói code gửi ra ngoài**: che `PHONE_ENC_KEY` demo, loại trừ `.env`/secrets.
- **Audit**: `lib/audit.ts` — đã gắn DELETE_PAYMENT, UPDATE_PAYMENT, DELETE_CASE, APPLY_VOUCHER, DELETE_CARE, REVEAL_PHONE, EDIT_CASE_DATE, EDIT_ATTENDANCE… Trang xem ở `/nhat-ky`.
- **Tải ảnh**: chỉ nhận ảnh bitmap (JPG/PNG/WEBP/HEIC), KHÔNG nhận SVG. Giới hạn 8MB.
- **Cổng khách — action CÔNG KHAI (D3)**: `khach/[token]/actions.ts` (`portalConfirmAppointment`/`portalRequestReschedule`) chạy KHÔNG đăng nhập → bảo mật dựa HOÀN TOÀN vào kiểm token → khách → lịch hẹn thuộc đúng khách + rate-limit (`bump`). KHÔNG tự đổi giờ (chỉ ghi nhận yêu cầu). Khi thêm action public mới ở cổng khách, BẮT BUỘC theo đúng khuôn này.
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
  - ⭐ **`Chay-Zenith.bat`** — **NÚT CHÍNH chủ hay bấm** (cài / cập nhật / sửa lỗi / chạy — tất cả trong 1 cú đúp). Tự xin quyền admin, tự cài Git/Docker qua winget nếu thiếu, rồi: **`git fetch` + `git reset --hard origin/<nhánh>`** (cập nhật SẠCH, không kẹt conflict; KHÔNG đụng `.env`/khoá vì chúng untracked) → **`docker compose up -d --build --force-recreate --remove-orphans`** → `docker image prune`. Migration **tự chạy** khi container khởi động (`docker-entrypoint.sh` gọi `prisma migrate deploy`). ⇒ Bấm file này là chủ có ngay bản mới nhất + schema mới + app chạy. Mở sẵn `http://localhost:3000`.
  - **`Sua-Loi.bat`** — CẬP NHẬT SẠCH (`git reset --hard origin` + `build --no-cache app` + `up -d --force-recreate` + `migrate deploy`). Dùng khi cập nhật lỡ dở / đổi schema. Tự xin quyền admin.
  - **`Mo-App.bat`** (mở), **`Phat-Hanh-Mang`/`Dia-Chi-Co-Dinh`** (Cloudflare Tunnel ra Internet), **`Sao-Luu`/`Cai-Sao-Luu-Tu-Dong`** (sao lưu DB + uploads), **`Cai-Tu-Dong-Cap-Nhat`/`Tu-Dong-Cap-Nhat`** (tự động cập nhật hằng ngày — xem bên dưới), **`Cai-AI-Key`** (trình chọn nhà cung cấp AI — DeepSeek/Qwen/Gemini/OpenAI/Claude/tự host — rồi ghi `AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL`/`AI_PROVIDER` vào `.env`), **`Doi-Khoa-SDT`** (tự động đổi `PHONE_ENC_KEY`: sao lưu → tạo khoá → mã hoá lại Customer+Lead → cập nhật `.env` → restart; tự dừng + giữ khoá cũ nếu lỗi), **`Xem-Loi`** (xuất log).
  - **`Cai-Tu-Dong-Cap-Nhat.bat`** (chạy 1 lần) — hẹn lịch Windows Task Scheduler (`ZenithTuDongCapNhat`) chạy **`Tu-Dong-Cap-Nhat.ps1`** mỗi ngày lúc 02:00 sáng: `git fetch` so `HEAD` với `origin/<branch>` — NẾU có bản mới mới `reset --hard` + `docker compose build app` (có cache, KHÔNG `--no-cache` để nhanh) + `up -d --force-recreate` + `migrate deploy`; build lỗi thì GIỮ NGUYÊN bản đang chạy (không gián đoạn). Ghi nhật ký vào `%USERPROFILE%\zenith-tu-dong-cap-nhat.log`. Tắt bằng Task Scheduler (Windows) → tìm `ZenithTuDongCapNhat` → Disable/Delete.
- **docker-compose.yml GỐC** (dùng khi vận hành): service `db` (Postgres, volume `zenith_db`) + `app` (build `./web`, cổng 3000, volumes `zenith_uploads:/app/public/uploads` + `zenith_secrets:/app/.runtime`). Env qua `.env` cạnh file (xem `.env.example`): `AUTH_SECRET`, `PHONE_ENC_KEY`, `APP_ORIGINS` (tên miền sau Cloudflare), AI: `AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL`/`AI_PROVIDER` (hoặc `ANTHROPIC_API_KEY` cách cũ)…
- ⚠️ `web/docker-compose.yml` CHỈ là DB cho lập trình (không có service app, không volume ảnh) — script Windows luôn chạy compose ở thư mục GỐC nên không đụng tới nó.
- Đăng nhập lần đầu: `admin / 123456` (đổi ngay).

## 12. Git & quy trình bàn giao
- 🔴 **CỰC KỲ QUAN TRỌNG cho phiên/AI sau:** chủ vận hành bằng cách bấm **`Chay-Zenith.bat`**, mà file này kéo code từ nhánh **`claude/lucid-cori-fg136w`**. ⇒ **Mọi thay đổi đã hoàn tất BẮT BUỘC phải có mặt trên nhánh `claude/lucid-cori-fg136w`** (đẩy thẳng, hoặc fast-forward từ nhánh dev của phiên sang nhánh này). Nếu chỉ đẩy lên nhánh khác, **chủ bấm nút sẽ KHÔNG thấy gì mới**. Sau khi push xong, chủ chỉ cần bấm `Chay-Zenith.bat` là cập nhật + chạy.
- **Nhánh phát triển**: `claude/lucid-cori-fg136w`. Develop + commit + push CHỈ lên nhánh này. (PR #3 đã tồn tại — KHÔNG tạo PR mới trừ khi chủ yêu cầu.)
- **Push**: `git push -u origin claude/lucid-cori-fg136w`, retry 4 lần (2s,4s,8s,16s) nếu lỗi mạng.
- **Footer commit** (bắt buộc) — dạng:
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  Claude-Session: <URL session của PHIÊN HIỆN TẠI>
  ```
  ⚠️ Dòng `Claude-Session` lấy theo **chỉ dẫn của phiên đang chạy** (mỗi phiên một URL khác), KHÔNG chép URL trong tài liệu này.
- Commit message tiếng Việt, rõ ràng. KHÔNG ghi định danh model.
- GitHub thao tác qua tool `mcp__github__*` (không có `gh` CLI). Repo scope: `ledinhlam23032000/zenithtasks`.

## 13. Cạm bẫy đã gặp (đọc để khỏi lặp lại)
1. **"Không mở được hồ sơ điều trị" (P2002)**: mã sinh bằng `count()+1` trùng sau khi xóa → đổi sang `nextSeq` (max+1) + retry. (Mục 8.5)
2. **Ảnh không hiện ở production**: `next start` không phục vụ file ghi lúc chạy trong `public/` → route `/media/[file]`. (Mục 8.6)
3. **Lưu "xoay mãi dù đã lưu"**: `revalidatePath` trong action gộp render lại cả trang vào phản hồi → `useFormAction`. (Mục 8.1)
4. **vitest không resolve `@/`**: test dùng import tương đối; tách logic thuần (vd `seq.ts`) khỏi code import db.
5. **`migrate reset`/`migrate dev` không chạy được trong sandbox** → viết migration tay + `migrate deploy`.
6. **Forge JWT phải chạy từ `web/`** để resolve `jose`.
7. **`cd` không giữ giữa các lần gọi Bash; `sleep` foreground bị chặn** → dùng vòng `until`/`run_in_background`.
8. Sau đổi schema mà quên `prisma generate` → tsc báo lỗi kiểu.
9. **React 19 tự RESET `<form action={fn}>` sau mỗi lần gửi** → mất dữ liệu input không kiểm soát khi action trả về (lỗi/cảnh báo, không đóng modal). Nếu cần GIỮ dữ liệu sau khi gửi (vd cảnh báo trùng lịch B4 để bấm "Vẫn đặt"), dùng `onSubmit` + `e.preventDefault()` rồi gọi action thủ công (KHÔNG dùng prop `action`). Lưu ý: field thêm bằng `formData.set()` ở client BỊ Next/React lược bỏ khi gọi server action → muốn truyền "biến thể" thì tạo **action server riêng** (vd `createAppointmentForced`) thay vì cờ trong FormData.
10. **`Dockerfile` thiếu `pg_dump`** → `scripts/backup.mjs` gọi `pg_dump` lỗi ENOENT trong container, sao lưu tự động im lặng thất bại dù trang Hệ thống báo "đã bật sao lưu". Đã thêm `postgresql-client-16` (khớp major version với service `db` trong compose) qua kho APT chính thức apt.postgresql.org — Debian bookworm mặc định chỉ có client v15, dùng CŨ hơn server không được Postgres đảm bảo tương thích.
11. **`docker-entrypoint.sh` coi lỗi đếm User = "0 người dùng" rồi chạy seed** → seed mở đầu bằng loạt `deleteMany()` → mất kết nối/quyền truy vấn thoáng qua lúc khởi động có thể xoá sạch dữ liệu thật. Đã sửa: lỗi đếm → DỪNG hẳn (`exit 1`), KHÔNG bao giờ suy ra "trống" từ lỗi. Lưu ý viết dạng `if ! COUNT=$(...)` (không gán trần) vì script chạy `set -e` trên `dash` (`/bin/sh`) — gán trần thất bại khiến shell thoát NGAY tại dòng đó, không kịp in cảnh báo.
12. **`proxy.ts` cũ chỉ kiểm tra cookie có tồn tại** (không xác thực JWT) → cookie hỏng (đổi `AUTH_SECRET`, hết hạn) vẫn bị coi "đã đăng nhập", trang tự phát hiện sai rồi đá về `/login`, `/login` lại thấy cookie "có" nên đá ngược lại → `ERR_TOO_MANY_REDIRECTS`. Next 16 chạy proxy bằng Node.js runtime nên xác thực JWT thật ngay trong proxy (dùng `jose`) là an toàn; cookie hỏng bị xoá thẳng trên response trước khi redirect.
13. **File trong `public/uploads` lộ công khai qua đường TĨNH dù route `/media` đã có xác thực**: Next.js tự phục vụ mọi file nằm trong `public/` theo đúng đường dẫn khớp (kể cả file ghi lúc chạy, ngoài build) — HOÀN TOÀN BỎ QUA logic auth viết trong `route.ts`. Route `/media/[file]` chỉ là CÁCH HIỂN THỊ đúng quy ước (qua `photoSrc()`), không phải "cổng duy nhất" — ai biết đúng tên tệp vẫn tải được qua `/uploads/<f>` thẳng nếu không tự chặn. Phát hiện khi kiểm avatar (Đợt 1.2) nhưng ảnh hưởng CẢ ảnh hồ sơ/giấy tờ. Sửa: thêm matcher `"/uploads/:path*"` riêng trong `proxy.ts` + chặn 401 nếu không có phiên. Bài học: `matcher` mặc định có `.*\\..*` (loại trừ path có dấu chấm) nên chỉ bỏ tên "uploads" khỏi danh sách loại trừ KHÔNG đủ — pattern chấm vẫn tự loại `/uploads/<f>.jpg`; phải thêm entry matcher RIÊNG.
14. **Đóng closure quanh Server Action rồi truyền làm prop cho Client Component KHÔNG hoạt động**: `reveal={() => revealPhone(id)}` truyền cho component `"use client"` → lỗi runtime "Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with 'use server'" (tsc KHÔNG bắt được, chỉ lộ ra khi chạy thật). Cách đúng: dùng `.bind()` — `reveal={revealPhone.bind(null, id)}` (đây là pattern chính thức Next.js hỗ trợ cho "truyền thêm tham số vào Server Action khi dùng làm prop").

## 14. TODO / lộ trình
- **Zalo OA (GĐ2)** + **AI tự trả lời (GĐ3)**: cần lập Zalo OA lấy token (khách đang dùng Zalo cá nhân, không có API) — TẠM GÁC.
- Sửa giờ **Shift** (ca làm việc) — chưa có.
- (Cân nhắc) cờ "nhân sự bệnh viện điều động: lương cố định, không trừ ngày công".
- (Cân nhắc) xuất Word/Excel cho từng hoá đơn (hiện chỉ In/PDF).
- (Cân nhắc) ảnh cận lâm sàng độ phân giải cao hơn (hiện nén chung 1920px).

## 15. Trỏ tới tài liệu khác
- **`ROADMAP.md`** (gốc repo) — KẾ HOẠCH nâng cấp dài hạn (nhóm A→E) + bảng theo dõi trạng thái từng mục. Đọc để biết việc tiếp theo nên làm.
- **`DU-AN.md`** — changelog chi tiết theo từng đợt (đọc để biết lịch sử + lý do từng quyết định).
- **`AGENTS.md`** — lưu ý Next.js 16 (đọc docs trong node_modules trước khi viết).
- **`PROJECT-OVERVIEW.md`** — bản giới thiệu dự án (để gửi người/AI khác review).
- **`CLAUDE.md`** — tự nạp các tài liệu trên vào ngữ cảnh mỗi phiên.
