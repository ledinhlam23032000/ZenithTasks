# Dự án: Ứng dụng nội bộ quản trị — Trung tâm Phẫu thuật Tạo hình Thẩm mỹ, BVĐK Hồng Phúc

> Tài liệu bàn giao để các phiên Claude Code sau tiếp tục hiệu quả. Đọc file này + mã nguồn là nắm được bối cảnh.
> **Kế hoạch nâng cấp dài hạn (A→E) + theo dõi tiến độ: xem `ROADMAP.md` ở gốc repo.**

## Sửa lỗi: đặt lịch tái khám cho khách cũ không hiện ở Lịch hẹn — "Đợt 33"
> Chủ phản ánh: "đặt lịch tái khám cho khách cũ sẽ không hiện lên trên phần lịch hẹn".
- **Nguyên nhân**: `/lich-hen` chỉ truy vấn bảng `Appointment`, trong khi nút "Hẹn tái khám" ở hồ sơ điều trị (`AddFollowUpButton` → `addFollowUp`) ghi vào bảng **`FollowUp`** — 2 model tách biệt từ đầu dự án (dễ nhầm vì `Appointment.type` có sẵn giá trị `FOLLOW_UP`, nhưng đó chỉ dùng khi TỰ TẠO thủ công 1 lịch hẹn loại tái khám ngay tại `/lich-hen`, không liên quan tới tái khám đặt từ hồ sơ). Dữ liệu vẫn lưu đúng và hiện đủ ở thẻ Tái khám của hồ sơ + trang khách hàng + "Việc cần làm hôm nay" — chỉ riêng `/lich-hen` chưa từng đọc bảng này nên "mù" hoàn toàn với tái khám đặt từ hồ sơ, dù đặt cho khách cũ hay dặn tái khám cho khách mới đều vậy.
- **Vì sao không gộp chung 1 bảng**: `Appointment.caseId` đặt `@unique` (1 lịch hẹn ứng đúng 1 hồ sơ — dùng cho lúc tiếp nhận tạo hồ sơ mới), trong khi 1 hồ sơ điều trị có thể có NHIỀU lần hẹn tái khám theo thời gian (kiểm tra kết quả nhiều đợt) — không đổi được ràng buộc này mà không ảnh hưởng luồng tiếp nhận hiện tại.
- **Cách sửa**: `lich-hen/page.tsx` giờ truy vấn CẢ `Appointment` LẪN `FollowUp` cho ngày/tháng đang xem, gộp thành 1 danh sách `rows` (`{kind:"appointment"|"followup"}`) sắp xếp chung theo giờ — dùng cho cả khung ngày, khung tháng (đếm theo ô lịch), 3 thẻ tóm tắt (hôm nay/ngày mai/đã đến) và bảng+thẻ hiển thị (cả di động lẫn desktop). Tái khám hiện badge tím "Tái khám" (cùng tông màu `APPT_TYPE.FOLLOW_UP` đã dùng khi tạo lịch tái khám thủ công, để nhất quán), nút "Đã đến"/xóa dùng lại nguyên `FollowUpArriveButton`/`deleteFollowUp` đã có sẵn (không viết action mới, không đổi logic nghiệp vụ nào).
- **Kiểm thử THẬT**: TSC sạch, 198/198 test không đổi (không sửa logic thuần nào). Dựng lại đúng kịch bản chủ mô tả — đặt 1 lịch tái khám cho hồ sơ khách cũ (`HS00011`) — xác nhận `/lich-hen` hiện ngay ở khung Ngày (đúng giờ, đúng badge, đúng ghi chú) LẪN khung Tháng (đúng số đếm ô ngày); thẻ tóm tắt "Hôm nay"/"đã đến" cộng đúng cả 2 nguồn. Kiểm tra thêm ngày có SẴN cả lịch hẹn thường lẫn tái khám (chèn tạm 1 tái khám vào giữa 3 lịch hẹn có sẵn) — xác nhận xếp đúng theo giờ, không lẫn lộn cột. Kiểm tra vai trò Telesale (không có quyền `case.clinical`, không phải Admin/Quản lý): thấy đúng nút "Đã đến" (được phép xác nhận khách đến) nhưng KHÔNG thấy nút xóa (đúng thiết kế phân quyền, giống mọi nơi khác dùng `case.clinical`). Dọn sạch dữ liệu test sau khi kiểm tra xong (không để sót trong DB).

## Sửa lỗi: modal "Thêm dịch vụ" bị thanh tab đè lên ở Hồ sơ điều trị — "Đợt 32"
> Chủ gửi ảnh chụp cho thấy nút "Thêm dịch vụ vào hồ sơ" (mở từ tab "Dịch vụ" ở Hồ sơ điều trị)
> bị thanh tab (Tư vấn/Dịch vụ/Vật tư/Hình ảnh/Giấy tờ) đè ngang qua giữa modal, che mất nút
> "Hủy"/"Thêm dịch vụ". Đây là hệ quả của Đợt 31 (chuyển trang Hồ sơ sang tab dùng `position:sticky`).
- **Nguyên nhân**: CÙNG BẢN CHẤT với lỗi nút "Xuất file" ở Đợt 30 — `Modal` (`components/ui/modal.tsx`) render TẠI CHỖ trong cây component (không portal), nên khi mở từ bên trong 1 khối có anh em là `position:sticky` (thanh tab `CaseSectionTabs`), thứ tự chồng lớp không tuân theo z-index đơn giản (modal `z-50` > thanh tab `z-20` nhưng thanh tab vẫn đè lên) — đã kiểm chứng bằng Playwright thật (chụp màn hình + hit-test), không chỉ đọc code.
- **Cách sửa**: `Modal` giờ LUÔN render qua `createPortal(document.body)`, giống `DropdownPortal` đã làm ở Đợt 30 — áp dụng CHUNG cho mọi modal trong app (không cần sửa từng nơi gọi `<Modal>`), nên tự động ngăn lỗi này tái diễn ở bất kỳ trang nào có `position:sticky`/`fixed` khác trên cùng cây component.
- **Kiểm thử THẬT**: chụp lại đúng thao tác trong ảnh chủ gửi (mở tab Dịch vụ → bấm Thêm dịch vụ) — xác nhận modal hiện sạch, nút bấm được bình thường. Test thêm 5 modal khác (Kế hoạch mới, sửa nhân sự, thêm khách hàng, thu tiền hồ sơ) không bị ảnh hưởng bởi thay đổi. TSC sạch, 198/198 test.
- **Rà soát riêng về phản ánh "khoản thu chưa vào doanh thu nhân sự"**: dựng lại đúng kịch bản chủ mô tả (thêm khoản thu nợ cũ cho 1 hồ sơ có tư vấn viên) — xác nhận số liệu "Thực thu" ở `/luong` cập nhật ĐÚNG NGAY LẬP TỨC, có tách rõ "nợ cũ". Logic tính đúng; nếu vẫn thấy thiếu, nguyên nhân nhiều khả năng là hồ sơ đó CHƯA gán Tư vấn viên/Bác sĩ (khoản thu chỉ được cộng vào đúng người được gán trên hồ sơ) — cần chủ xác nhận lại hồ sơ cụ thể + trang đang xem để tra tiếp nếu vẫn còn thiếu.

## Nâng cấp Lương + rà soát trải nghiệm tổng thể (rườm rà/kém mượt) — "Đợt 31"
> Chủ phản hồi 2 việc: (1) khó tính lương nhân sự cuối tháng / xem lại lâu dài, và (2) cảm giác
> ứng dụng "rườm rà, kém mượt mà" so với app khác nhưng không diễn tả được cụ thể. Nghiên cứu kỹ
> (đọc trực tiếp code, không đoán) trước khi sửa — xác nhận với chủ nên làm cả 2 việc trong 1 đợt,
> chọn đủ 4 cải tiến cho Lương + đồng ý chuyển trang Hồ sơ điều trị sang dạng tab.
- **Lương & hoa hồng** (`lib/payroll.ts`, `lib/payroll-pure.ts`, `luong/*`) — nguyên nhân gốc: hoa hồng/thưởng/điều chỉnh phải gõ tay lại TỪ ĐẦU mỗi tháng (không có gì được nhớ/gợi ý), Chấm công và Lương hoàn toàn tách rời (không cảnh báo khi công có thể sai/thiếu), không có cách xem xu hướng nhiều tháng trong app. Sửa cả 4:
  1. **Mang số tháng trước sang làm mốc**: `PayrollRow` thêm `hasEntry`/`prevCommission`/`prevBonus`/`prevAdjustment` — form sửa từng người tự điền sẵn số tháng liền trước khi tháng này chưa nhập, kèm chú thích để sửa lại.
  2. **Sửa nhanh cả bảng**: `payroll-bulk-edit.tsx` + action `saveBulkPayroll` (JSON trong FormData, `$transaction`) — sửa hoa hồng/thưởng/điều chỉnh nhiều người 1 lúc, lưu 1 lần.
  3. **Xu hướng nhiều tháng**: `getPayrollTrend(monthsBack=6)` + 2 biểu đồ (Tổng chi lương, Hoa hồng) ngay dưới bảng — dùng lại `MultiChart` sẵn có.
  4. **Cảnh báo công chưa chốt**: `missingAttendanceStaff()` (tách file riêng vì `payroll.ts` import `@/lib/db` không unit-test được) — banner vàng liệt kê nhân sự 0 ngày công trong THÁNG ĐÃ QUA, kèm link `/cham-cong`.
- **Hiệu ứng chuyển động** — trước đây MỌI modal/dropdown/toast/bottom-sheet bật/tắt tức thì (0 hiệu ứng trong toàn bộ code, xác nhận qua rà soát) — nguyên nhân lớn nhất gây cảm giác "kém mượt". Thêm 5 lớp CSS dùng chung trong `globals.css` (`animate-fade-in/scale-in/slide-up-in/menu-in/toast-in`, tự tắt khi `prefers-reduced-motion`), áp dụng cho `modal.tsx`, `dropdown-portal.tsx`, `toast.tsx`, mobile sheet + menu tài khoản trong `app-shell.tsx`, `command-palette.tsx`, lightbox ảnh, hộp cài PWA.
- **Màn chờ khi chuyển trang** — trước đây MỌI trang dùng chung 1 khung chờ hình "bảng tổng quan" (`(app)/loading.tsx`) dù trang thật là danh sách/chi tiết, gây "giật" lúc tải xong. Thêm `components/ui/skeleton.tsx` (`SkeletonListPage`/`SkeletonDetailPage`) + `loading.tsx` riêng cho ~17 trang danh sách và 4 trang chi tiết (`[id]`, Next.js tự ưu tiên khung của segment gần nhất). Thêm `components/layout/route-progress.tsx` (`<RouteProgress>`) — thanh tiến trình mỏng phía trên báo "đã bấm, đang xử lý" ngay lập tức (bắt sự kiện click link + theo dõi đổi route), vì mọi trang `force-dynamic` không có cache client.
- **Hồ sơ điều trị chuyển sang tab**: trang mở nhiều nhất mỗi ngày trước đây có 8 khối xếp chồng cuộn dài + thanh neo riêng chỉ để tự điều hướng trong chính nó. `case-section-tabs.tsx` (`<CaseSectionTabs>`) gộp Tư vấn/Dịch vụ/Vật tư/Hình ảnh/Giấy tờ (Giấy tờ = gộp 2 card "Phiếu đồng ý" + "Giấy tờ hành chính" từng tách rời) thành tab xem từng phần một. Cột Tài chính + Tái khám bên phải giữ nguyên luôn hiện sẵn (không đưa vào tab) vì cần xem cùng lúc lúc thao tác dịch vụ/thanh toán.
- **Kiểm thử THẬT**: TSC sạch, 198/198 test (thêm `payroll.test.ts`). Playwright thật qua đăng nhập tài khoản seed: bảng lương tải đúng + biểu đồ xu hướng hiện đúng; sửa nhanh cả bảng lưu đúng giá trị (đối chiếu lại trong bảng chính + modal sửa từng người sau đó hiện đúng số vừa lưu làm mốc); trang Hồ sơ điều trị xác nhận đủ 5 tab, chuyển tab đúng nội dung, Tài chính/Tái khám luôn hiện, vai trò không có `case.clinical` (lễ tân) không thấy tab "Tư vấn" và mặc định vào thẳng tab "Dịch vụ"; rà soát 22 trang chính không phát sinh lỗi console sau khi thêm hiệu ứng/skeleton; menu tài khoản, Ctrl/Cmd+K, bottom-sheet di động, modal thêm khách hàng đều đóng/mở mượt bình thường.

## Sửa lỗi nghiêm trọng: nút "Xuất file" hoàn toàn không bấm được — "Đợt 30"
> Chủ phản ánh nút "Xuất file" (Sổ thu chi và mọi mục khác) 100% không hoạt động dù trước đó báo
> đã sửa xong (Đợt 28). Kiểm tra kỹ mới phát hiện ĐÂY LÀ LỖI THẬT, không phải do triển khai/docker.
- **Nguyên nhân thật** (mất nhiều vòng kiểm thử Playwright thật mới lần ra — gọi thẳng route qua `curl`/`goto` vẫn 200 bình thường nên dễ nhầm là "đã xong"): `ExportMenu`/`ScopedExportMenu` render dropdown `position:absolute` LỒNG bên trong nút kích hoạt, mà nút này nằm trong khối `actions` của `PageHeader` — khối này có `overflow-x-auto` (để cuộn ngang nút trên di động). CSS quy định: đã đặt `overflow-x` khác `visible` thì `overflow-y` TỰ ĐỘNG thành `auto` theo (không cách nào giữ `overflow-y:visible`) → dropdown mở RỘNG XUỐNG DƯỚI (cao hơn hẳn khối actions) bị **cắt mất hoàn toàn** — không hiện, không bấm được, dù DOM/route đều đúng 100%. Tăng z-index lên 99999 hay thêm `isolation:isolate` đều KHÔNG sửa được vì bản chất là bị cắt (overflow-clipping), không phải chồng lớp (z-index/stacking).
- **Cách sửa**: dựng `components/ui/dropdown-portal.tsx` (`<DropdownPortal>`) — render nội dung dropdown qua React Portal thẳng ra `document.body`, tự tính toạ độ `position:fixed` theo `getBoundingClientRect()` của nút kích hoạt, né hẳn mọi ancestor có `overflow`/stacking-context bất thường. Áp dụng cho cả `ExportMenu` và `ScopedExportMenu`. Nhân tiện sửa luôn 1 lỗi tương tự (nhẹ hơn) ở menu tài khoản trên `AppShell` (lớp phủ "bấm ra ngoài để đóng" `fixed inset-0` từng có thể chặn nhầm click vào chính các mục trong menu — đổi sang dùng `document.addEventListener("mousedown", ...)` với `ref`, đúng khuôn `Combobox` đã dùng sẵn).
- **Kiểm thử THẬT**: TSC sạch, 194/194 test. Playwright thật (đăng nhập tài khoản seed, click qua giao diện thật + xác nhận sự kiện `download` thật): xác nhận bấm được + tải đúng file ở CẢ 7 trang có nút xuất file (Chi phí đầu tư, Kho, Chấm công, Thu chi, Công nợ, Hồ sơ điều trị, Nhật ký), CẢ màn hình desktop lẫn di động (375px) — trước đây các bài kiểm thử cũ chỉ gọi thẳng route hoặc kiểm tra DOM tồn tại nên bỏ lọt lỗi này. Xác nhận khối cuộn ngang của `PageHeader` trên di động vẫn hoạt động bình thường (không bị ảnh hưởng bởi thay đổi). Ghi bài học vào `BAN-GIAO.md` mục 8.9 + cạm bẫy #16 (mục 13) để không lặp lại cho các menu thả xuống mới.

## Trợ Lý — Lập kế hoạch (task app) + AI tự soạn kế hoạch — "Đợt 29"
> Chủ muốn mở rộng "Trợ lý AI" (trước chỉ hỏi-đáp) thành khu vực **"Trợ Lý"** rộng hơn: (1) công cụ
> lập kế hoạch kiểu task app — kế hoạch → nhiệm vụ chính → nhiệm vụ phụ, mỗi nhiệm vụ có ghi chú chi
> tiết; (2) AI có thể **tự tay soạn kế hoạch** (không chỉ trả lời chữ) từ 1 câu mô tả mục tiêu; (3)
> chỉ Quản trị viên/Quản lý/Cổ đông dùng được, Cổ đông được ngoại lệ **toàn quyền** tạo/sửa/xóa
> (khác quy ước "cổ đông chỉ xem" mọi nơi khác — quyết định có chủ đích của chủ); (4) AI soạn xong
> phải hiện bản nháp để xem/sửa rồi mới lưu thật, không tự lưu.
- **Schema mới** (`Plan` + `PlanTask`, enum `PlanTaskStatus`): nhiệm vụ tự tham chiếu **CHỈ 2 CẤP** qua `parentId` (ép ở tầng server action, không dựa schema), `planId` denormalize lên mọi dòng để lấy cả cây bằng 1 câu truy vấn phẳng. Sắp xếp bằng nút lên/xuống đổi `order` giữa 2 phần tử liền kề cùng cấp (không dùng thư viện kéo-thả — repo chưa có, danh sách ngắn, kéo-thả rủi ro hơn trên di động).
- **Phân quyền**: đổi `NavGroup` `"Trợ lý AI"` → `"Trợ Lý"` (đã kiểm tra an toàn — chỉ dùng trong `permissions.ts`), thêm module `ke-hoach` cùng nhóm sidebar với `tro-ly`. Ranh giới cứng RIÊNG trong `userCan()` cho `mod:ke-hoach` (ADMIN+MANAGER+SHAREHOLDER — khác tập vai trò của `tro-ly`/`chi-phi-dau-tu` nên không gộp chung điều kiện, không gộp `nav-tabs.ts`). Mọi action mutation (`createTask`, `updateTask`, `deleteTask`, `setTaskStatus`, `reorderTask`…) đều cho SHAREHOLDER đi qua `requireUser([...PLAN_ROLES])` — ngoại lệ toàn quyền có chủ đích.
- **AI soạn bản nháp** (`lib/plan-ai.ts`): ép AI chỉ trả về 1 khối JSON đúng cấu trúc, parse phòng thủ nhiều tầng (trích khối có/không rào chắn → JSON.parse try/catch → zod validate → tự cắt bớt nếu vượt giới hạn 12 nhiệm vụ chính/8 nhiệm vụ phụ rồi thử lại → gọi lại AI 1 lần với prompt mạnh hơn trước khi báo lỗi) — không bao giờ throw ra ngoài. `generatePlanDraft` CHỈ trả bản nháp, KHÔNG lưu DB; wizard 2 bước (`ai-plan-wizard.tsx`) cho xem/sửa thoải mái (đổi tiêu đề, xóa nhiệm vụ, thêm nhiệm vụ) bằng đúng component hiển thị dùng chung với trang thật (`task-row.tsx`, chỉ khác là sửa/xóa đổi state cục bộ chưa gọi server) — bấm "Lưu kế hoạch" mới thật sự gọi `createPlanFromDraft` (validate lại toàn bộ, tạo nguyên tử, đánh dấu `aiGenerated: true`). Khuôn mẫu này ghi vào BAN-GIAO.md mục 8.10 để tái dùng cho tính năng AI-sinh-dữ-liệu-có-cấu-trúc sau này.
- **Giao diện**: `/ke-hoach` (lưới thẻ + tab lọc trạng thái + thanh tiến độ, phân trang trong bộ nhớ vì "trạng thái" là giá trị suy ra chứ không phải cột DB), `/ke-hoach/[id]` (cây nhiệm vụ: checkbox hoàn thành, sửa tiêu đề tại chỗ, ghi chú mở rộng dạng markdown, nút lên/xuống, thêm nhiệm vụ phụ/chính nhanh). Tìm kiếm Ctrl/Cmd+K (`globalSearch`) thêm nhóm "Kế hoạch", tự lọc theo quyền qua `moduleCan`.
- **2 lỗi thật phát hiện qua kiểm thử Playwright thật (đăng nhập bằng tài khoản seed có sẵn, không giả JWT) và đã sửa trước khi bàn giao**:
  1. Nút xóa nhanh trên thẻ kế hoạch (`/ke-hoach`) bọc trong `<button onClick={(e) => e.stopPropagation()}>` viết trực tiếp trong Server Component → lỗi runtime "Event handlers cannot be passed to Client Component props" (crash toàn trang danh sách). Sửa: bỏ wrapper `<button>` (đổi thành `<span>` chỉ có className, không handler), chuyển `stopPropagation()` vào ngay bên trong `DeleteButton` (Client Component) — an toàn áp dụng chung cho MỌI nơi dùng `DeleteButton`, không chỉ riêng kế hoạch.
  2. Ghi chú nhiệm vụ mặc định ĐÓNG (`noteOpen = false`) kể cả khi nhiệm vụ đã có ghi chú từ trước → tải lại trang là ghi chú "biến mất" khỏi màn hình (dữ liệu vẫn còn trong DB, chỉ là UI thu gọn) — dễ khiến người dùng tưởng nhầm là mất ghi chú. Sửa: `noteOpen` khởi tạo theo `!!task.note` — nhiệm vụ đã có ghi chú thì hiện sẵn, nhiệm vụ trống thì vẫn thu gọn như cũ.
- **Kiểm thử THẬT đã chạy**: TSC sạch, 194/194 test (thêm 20 test mới cho `plans.ts`/`plan-ai.ts`), Playwright thật qua đăng nhập tài khoản seed (admin/quanly/letan — không giả JWT): ADMIN tạo kế hoạch → thêm nhiệm vụ chính+phụ → tích hoàn thành → sửa ghi chú → đổi thứ tự → xóa nhiệm vụ → xóa kế hoạch, TẤT CẢ đều xác nhận đúng sau khi tải lại trang (không chỉ tin vào phản hồi tức thời); MANAGER xác nhận có toàn quyền y hệt ADMIN; RECEPTION (vai trò bị chặn) xác nhận bị đá sang `/khong-co-quyen` khi vào thẳng URL VÀ sidebar ẩn mục "Kế hoạch"; tìm kiếm Ctrl+K xác nhận ra đúng kết quả cho ADMIN, không ra gì cho RECEPTION. Test quyền `mod:ke-hoach` cho SHAREHOLDER (không có tài khoản Cổ đông sẵn trong DB mẫu) xác nhận qua unit test `permissions.test.ts` (đã có, kiểm cả trường hợp bị cấp `grant` nhầm vẫn chặn cho vai trò ngoài `PLAN_ROLES`). Luồng AI (soạn nháp → sửa → lưu) mới kiểm chứng được qua test đơn vị `plan-ai.test.ts` (parse/validate/tự cắt/tự thử lại) và nút AI hiện đúng trạng thái "chưa bật" khi sandbox chưa có khoá AI — chưa gọi được AI thật (sandbox không có `AI_API_KEY`), cần chủ tự thử ở máy thật đã bật `Cai-AI-Key`.

## Rà soát 100% xuất file phục vụ kiểm toán + tính năng Chi phí đầu tư (chủ yêu cầu) — "Đợt 28"
> Chủ phản ánh Sổ thu chi chưa xuất được file phục vụ kiểm toán, yêu cầu rà soát toàn bộ hạng mục
> còn thiếu xuất file, và thêm tính năng Chi phí đầu tư chỉ Cổ đông + Quản trị viên xem được. Tự
> kiểm thử THẬT: TSC pass, 171/171 test, tải thật cả 13 file xuất (đủ 3 định dạng), tạo tài khoản
> Cổ đông tạm thời để xác nhận quyền xem/không-quản-lý, dựng khoản đầu tư đánh dấu để đối chiếu
> Sổ thu chi hiện/ẩn đúng theo vai trò (kể cả qua route export gọi thẳng, không chỉ qua giao diện),
> đối chiếu số liệu xuất ra khớp COUNT() trong DB cho từng vai trò (kể cả giới hạn tư vấn/bác sĩ
> chỉ xuất được hồ sơ của mình).
- **Sổ thu chi thực ra ĐÃ có xuất file** (`/thu-chi/export`) nhưng chỉ xuất được ĐÚNG 1 THÁNG đang xem — với kiểm toán (thường cần cả năm/toàn bộ) phải bấm xuất từng tháng một, không thực tế. Thêm `?scope=month|year|all` vào route + component mới `components/ui/scoped-export-menu.tsx` (`ScopedExportMenu`) cho phép chọn "Tháng này / Cả năm / Toàn bộ" ngay trong 1 nút "Xuất file", mỗi phạm vi có Excel/Word/CSV.
- **Thêm CSV** vào `components/ui/export-menu.tsx` (tuỳ chọn `csvHref`, không phá callers cũ) — dùng chung cho mọi trang xuất file mới.
- **Rà soát 100%**: kiểm tra toàn bộ page.tsx dưới `(app)/`, tìm ra 5 hạng mục có dữ liệu quan trọng cho kiểm toán/kế toán nhưng CHƯA có xuất file, thêm route + nút cho từng nơi:
  - `/cong-no` (Sổ công nợ) — xuất đúng bộ lọc đang xem (nhóm tuổi nợ + tư vấn viên).
  - `/ho-so` (Hồ sơ điều trị) — xuất TOÀN BỘ hồ sơ khớp bộ lọc (không giới hạn theo trang phân trang); **giữ đúng ranh giới phân quyền của trang** (tư vấn/bác sĩ chỉ xuất được hồ sơ mình phụ trách, đã kiểm chứng số dòng xuất ra khớp `count()` DB theo `consultantId`).
  - `/kho` (Kho vật tư) — xuất 2 phần: tồn kho hiện tại (giá trị tồn theo giá vốn bình quân) + toàn bộ lịch sử nhập/xuất.
  - `/cham-cong` (Chấm công) — xuất tổng hợp ngày công + chi tiết theo ngày CẢ trung tâm trong tháng, CHỈ vai trò quản lý (trùng điều kiện `isManagerial` của trang).
  - `/nhat-ky` (Nhật ký hệ thống) — xuất đúng bộ lọc hành động/người thực hiện/khoảng ngày đang áp dụng, không giới hạn theo trang.
  - Bài học ghi vào BAN-GIAO.md mục 8.9: route export PHẢI tự lặp lại đúng điều kiện phân quyền/lọc dữ liệu của trang tương ứng — gọi thẳng URL export bỏ qua hoàn toàn UI, nên lọc thiếu ở route là lộ dữ liệu dù trang hiển thị đúng.
- **Tính năng mới: Chi phí đầu tư** (`/chi-phi-dau-tu`) — mua sắm tài sản lớn/cải tạo mặt bằng, tách khỏi chi phí vận hành ngày thường. Thiết kế:
  - Vẫn dùng chung bảng `CashTransaction` (thêm mã hạng mục `INVESTMENT` ở `lib/finance.ts`, KHÔNG tách model riêng — tránh phá vỡ luồng ghi sổ thu chi sẵn có), nhưng có trang riêng tổng hợp (tổng từ trước tới nay, tổng năm nay, danh sách + form thêm/sửa riêng `investment-forms.tsx`) + xuất file riêng.
  - **Ranh giới cứng CHỈ ADMIN + SHAREHOLDER** (đúng yêu cầu chủ — không có MANAGER dù MANAGER vẫn quản lý được Sổ thu chi thường): thêm vào `userCan()` cùng chỗ đã áp dụng cho Trợ lý AI (`mod:tro-ly`), chặn dù bị cấp `grant` nhầm qua giao diện Phân quyền.
  - **Ẩn khỏi Sổ thu chi thường với người khác** (kể cả Quản lý): `/thu-chi` + `/thu-chi/export` đều lọc `category: { not: "INVESTMENT" }` ở CẢ danh sách LẪN số liệu tổng (Tổng chi, hạng mục chi nhiều nhất) khi người xem không phải Admin/Cổ đông — đã kiểm thử thật: tạo 1 khoản đầu tư đánh dấu bằng Admin, xác nhận Quản lý KHÔNG thấy trong danh sách/tổng/export, Admin vẫn thấy đầy đủ ở cả 2 nơi.

## Sửa lỗi tái khám + gộp "khách chưa làm" vào Khách tham khảo (chủ phản ánh) — "Đợt 27"
> Chủ phản ánh 2 việc sau khi dùng bản Đợt 2: (1) hẹn tái khám bấm vào được nhưng không tích được
> xác nhận khách đã đến; (2) muốn khách hàng chưa làm dịch vụ hiện chung màn hình với Khách tham
> khảo cho dễ quản lý. Tự kiểm thử THẬT: TSC pass, 171/171 test, Playwright thật xác nhận "Đã đến"
> ở cả 3 nơi hiển thị tái khám + đối chiếu dữ liệu 2 khách hàng "chưa làm" khớp giữa 2 trang.
- **Lỗi tái khám không xác nhận được "đã đến"**: model `FollowUp` có sẵn `status`/`doneAt` và
  `lib/workqueue.ts` ĐÃ LỌC theo 2 trường này ("Tái khám đến hạn" chỉ hiện ca chưa xong) — nhưng
  KHÔNG CÓ NƠI NÀO trong toàn bộ code từng ghi giá trị mới cho 2 trường đó (chỉ `addFollowUp` set
  mặc định lúc tạo). Cả 3 nơi hiển thị tái khám (thẻ "Tái khám" trong hồ sơ điều trị, thẻ "Lịch hẹn
  & tái khám" trong hồ sơ khách hàng, mục "Tái khám đến hạn" ở `/viec-hom-nay`) đều chỉ hiện chữ,
  không có nút nào — nên việc nhắc tái khám tồn đọng MÃI MÃI dù khách đã đến. Thêm action
  `markFollowUpArrived` (`ho-so/actions.ts`, set `status: "ARRIVED"` + `doneAt: now()`) + component
  dùng chung `components/ui/follow-up-arrive-button.tsx` (1 chạm, `useTransition` + toast +
  `router.refresh()` — đúng quy ước Đợt 2.4), gắn vào cả 3 nơi trên; nơi đã xác nhận thì đổi thành
  Badge trạng thái (tái dùng `APPT_STATUS` vì `FollowUp.status` dùng chung enum `AppointmentStatus`).
- **Gộp "khách chưa làm dịch vụ" vào Khách tham khảo**: hỏi lại chủ trước khi làm vì có 2 cách hiểu
  (gộp màn hình hay chuyển hẳn dữ liệu) — chủ chọn **gộp màn hình, giữ nguyên dữ liệu** (an toàn,
  không đổi cấu trúc). Thêm khối "Khách hàng chưa làm dịch vụ" ở cuối trang `/khach-tham-khao`,
  liệt kê Customer thật có `cases: { none: { status: { in: DONE_CASE_STATUSES } } }` — CÙNG định
  nghĩa với tab lọc "Chưa làm dịch vụ" ở `/khach-hang` (đã kiểm chứng: cả 2 trang cho ra đúng cùng
  2 khách hàng). Tách hằng số `DONE_CASE_STATUSES` ra `lib/status.ts` dùng chung 2 nơi thay vì định
  nghĩa lặp lại, tránh sau này sửa 1 chỗ mà quên chỗ kia. Có phân trang riêng (`?cpage=`, dùng lại
  `lib/pagination.ts` của Đợt 2.1) vì danh sách này sẽ dài dần theo thời gian.

## Đợt sửa trải nghiệm & ổn định (kiểm định QA — Đợt 2/6) — "Đợt 26"
> "Đợt 2" trong kế hoạch đại tu 6 đợt (sau "Đợt 1" = "Đợt 25" ở dưới). Tự kiểm thử bằng dữ liệu/kịch
> bản THẬT: TSC pass, 171/171 test, Playwright thật cho toast + đặt lịch (kể cả bỏ qua validation
> phía trình duyệt để ép server tự chặn), curl với JWT forge để so sánh trang hóa đơn có/không dịch vụ.
- **Phân trang danh sách dài**: `lib/pagination.ts` (`PAGE_SIZE=30`, `parsePage`, `totalPagesOf`) + `components/ui/pagination.tsx` (`<Pagination>`, tự ẩn khi ≤1 trang). Áp dụng cho Khách hàng, Hồ sơ, Chăm sóc (sửa luôn thẻ "Tổng hiển thị" đang hiện nhầm `messages.length` thay vì tổng thật), lịch sử Kho (chỉ phân trang lịch sử xuất/nhập, KHÔNG phân trang danh mục vật tư), Nhật ký.
- **Nhật ký hệ thống có bộ lọc**: viết lại `/nhat-ky` — lọc theo hành động/người thực hiện/khoảng ngày + phân trang, tái dùng `getConsultants()` cho danh sách nhân sự (tên hàm dễ hiểu nhầm — thực trả MỌI nhân sự đang hoạt động, không riêng tư vấn viên).
- **Sửa tràn ngang trên điện thoại**: dò tự động bằng Playwright trên cả 24 trang (đo `getBoundingClientRect` mọi phần tử, không chỉ lọc theo `width` mà còn `right`/`left` để bắt cả phần tử bị đẩy lệch ngoài khung nhìn), tìm ra 5 nguyên nhân: (1) **`Card` thiếu `min-w-0`** — lỗi CSS Grid/Flex kinh điển (item không có `min-width:auto` mặc định sẽ ép cha tràn thay vì tự cuộn bên trong) ảnh hưởng 12+ trang có bảng/grid trong Card, sửa 1 chỗ (`components/ui/card.tsx`) là hết; (2) Tổng quan: khối "Việc hôm nay" lệch padding (`-mx-4` không khớp `px-3` của `<main>`) + danh sách lịch hẹn thiếu `min-w-0`; (3-4) Lịch hẹn + Thu chi: thanh điều hướng ngày/tháng thiếu `flex-wrap`. Sau sửa: 23/24 trang đúng 0px tràn, 1 trang (Báo cáo) còn 3px không đáng kể (bảng rộng có chủ đích).
- **Hệ thống toast phản hồi thao tác**: `components/ui/toast.tsx` (`ToastProvider`/`useToast`, đã bọc ở `(app)/layout.tsx`) — báo "Đã lưu"/"Lỗi mạng, thử lại" cho các select tự lưu khi đổi mà trước đây im lặng (`AppointmentStatusControl` ở Lịch hẹn, `LeadStatusSelect` ở Khách tham khảo). Đổi luôn 2 nơi này từ `<form action>` tự `requestSubmit()` sang gọi thẳng action qua `useTransition` + `router.refresh()` (đúng quy ước `DeleteButton` — tránh treo ở production) → action không còn cần `revalidatePath` (mục 8.1 BAN-GIAO.md).
- **Đặt lịch online chuẩn hơn** (3 phần):
  1. **Validate tiếng Việt**: nối `handleVnInvalid`/`clearVnValidity` (`lib/form-validation.ts`) vào `onInvalid`/`onInput` mặc định của `Input`/`Textarea`/`Select` (`components/ui/field.tsx`) → hết "Please fill out this field" trên TOÀN BỘ form dùng 3 component này (không riêng đặt lịch — sửa 1 chỗ, ăn khắp app, kể cả đăng nhập).
  2. **Chặn giờ ngoài khung làm việc**: `lib/booking-hours.ts` (`BOOKING_HOUR_MIN/MAX` = 08:00–17:00) — chặn CẢ client (`min`/`max` trên input giờ, thông báo riêng qua `onInvalid`) LẪN server (`dat-lich/actions.ts` so `getHours()*60+getMinutes()`), vì test thực tế xác nhận bỏ qua được validation client (xoá thuộc tính `required`/`min`/`max` qua DOM) nên bắt buộc phải chặn ở server mới an toàn. Hằng số phải nằm ở file THƯỜNG riêng (không phải `dat-lich/actions.ts` có `"use server"`) — xem cạm bẫy #15 BAN-GIAO.md (file `"use server"` chỉ được export hàm async).
  3. **Chặn in hóa đơn hồ sơ rỗng**: `/ho-so/[id]/hoa-don` hiện khối cảnh báo "Hồ sơ chưa có dịch vụ nào" (không có nút in) thay vì tờ hóa đơn toàn số 0 khi `record.services.length === 0`.

## Đợt củng cố nền tảng (an toàn & ổn định) — "Đợt 1"
> Mục tiêu: tiền tính đúng & nguyên tử, ảnh y khoa không lộ, có cảnh báo cấu hình kém an toàn. Tự kiểm thử: TSC pass, 40/40 test.
- **A1 — Xác thực ảnh y khoa**: route `/media/[file]` KHÔNG còn công khai. Chỉ phục vụ khi (1) đã đăng nhập (cookie phiên) HOẶC (2) có "vé" ký ngắn hạn `?t=`. Vé = HMAC-SHA256(tên tệp + hạn) ký bằng `AUTH_SECRET`, gắn đúng 1 tệp, hạn 24h — `web/src/lib/media-token.ts` (`signMediaToken`/`verifyMediaToken`/`withMediaToken`). Cổng khách `/khach/[token]` ký vé từng ảnh qua `withMediaToken`. Trang nhân viên không đổi (trình duyệt tự gửi cookie). Đã test dev: không vé→401, vé đúng→200, vé sai/khác tệp→401.
- **A3 — Tiền nguyên tử**: `ho-so/actions.ts` thêm `withCaseLock(caseId, fn)` = `$transaction` + `SELECT … FOR UPDATE` khoá hàng hồ sơ. `recalc(caseId, db)` nhận client giao dịch. Đã bọc add/update/remove dịch vụ, voucher, add/update/delete thanh toán → hai người thao tác cùng lúc không ghi đè số liệu.
- **A4 — Test toán tiền**: tách toán thuần ra `web/src/lib/case-math.ts` (`computeCaseTotals`) + test (`case-math.test.ts` 8, `media-token.test.ts` 7).
- **A2 — Cảnh báo khoá demo**: `web/src/lib/security-status.ts` (`securityWarnings()`) phát hiện `PHONE_ENC_KEY` = khoá demo công khai → banner đỏ cho ADMIN ở `(app)/layout.tsx`. KHÔNG hard-fail (tránh sập app đang chạy bằng khoá demo). 🔑 Chủ cần đổi khoá thật + `npm run rotate:phone`.
- **A6 — CSP**: `next.config.ts` thêm `Content-Security-Policy` (+ object-src none, base-uri, form-action, frame-ancestors).
- ⚠️ **Sandbox/proxy Prisma**: nếu `npm install` lỗi ECONNRESET ở `@prisma/engines` (trình tải bỏ qua proxy), tải engine bằng `curl --proxy http://127.0.0.1:34227 --cacert /root/.ccr/ca-bundle.crt <url schema-engine.gz>` rồi `gunzip` vào `node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x` + `chmod +x`; đặt `CHECKPOINT_DISABLE=1` để tắt telemetry (bị policy chặn 403).

## Đợt chủ động & theo dõi — "Đợt 2"
> Biến app từ "ghi chép" sang "chủ động nhắc việc" + cho quản trị thấy sức khoẻ hệ thống + sao lưu tự động. TSC pass, 40/40 test, smoke test dev server (2 trang mới + hồ sơ đều 200).
- **B1 (lõi) — "Việc cần làm hôm nay"** (`/viec-hom-nay`): `lib/workqueue.ts` `getWorkqueue()` tổng hợp **từ dữ liệu sẵn có, KHÔNG đổi schema, KHÔNG cron**: tái khám đến hạn (≤2 ngày), hẹn hôm nay chưa đến, công nợ quá hạn (>15 ngày), sinh nhật khách hôm nay (raw `EXTRACT`), khách nguội (>60 ngày + không có tái khám sắp tới, raw `make_interval`), kho cảnh báo. Ngưỡng = hằng số đầu file. Module `viec-hom-nay` (icon `ListTodo`) cho hầu hết vai trò vận hành. ⏳ Phần 2 (Web Push + việc có người phụ trách/đánh dấu xong) cần model + cron + VAPID.
- **A7 — Tình trạng hệ thống** (`/he-thong`, ADMIN): `lib/system-status.ts` gom cảnh báo bảo mật + quy mô dữ liệu + kích thước DB (`pg_database_size`) + dung lượng ảnh (quét `public/uploads`) + lần sao lưu gần nhất + 10 audit gần nhất. Icon `ServerCog`.
- **A5 — Sao lưu tự động**: `scripts/backup.mjs` (`pg_dump -Fc` + ảnh `tar.gz` + giữ 14 bản + ghi `backup-status.json`); `npm run backup`; `docker-entrypoint.sh` chạy nền 1 lần lúc khởi động rồi mỗi 24h. Sao lưu OFFSITE vẫn là `windows/Sao-Luu.ps1`.
- Lưu ý kỹ thuật: trong sandbox Postgres có thể tự dừng (stale pid) → `pg_ctlcluster 16 main start`. DB sandbox cần `npm run db:seed` để có dữ liệu thử (admin/123456).

## Đợt vá bảo mật & mặt tiền khách nhìn thấy (kiểm định QA — Đợt 1/6) — "Đợt 25"
> "Đợt 1" trong kế hoạch đại tu 6 đợt lớn hơn (sau "Đợt 0" = "Đợt 24" ở dưới). Tự kiểm thử bằng
> dữ liệu/kịch bản THẬT: TSC pass, 171/171 test, đặt lịch thật qua `/dat-lich` rồi bấm "Liên hệ" ở
> `/lich-hen` xem đúng số, tải avatar thật qua trình duyệt rồi kiểm HTTP status trực tiếp từng
> đường dẫn (có/không đăng nhập), seed lại DB kiểm giới tính khớp tên + không còn ca tài chính
> mâu thuẫn.
- **SĐT đặt lịch online hết lưu thô**: `dat-lich/actions.ts` mã hoá `Appointment.phoneEnc` (thêm cột qua migration tay) như Customer, bỏ hẳn việc nhét chữ thường vào `note`. Xem qua nút "Liên hệ" mới ở `/lich-hen` (`revealAppointmentPhone`, quyền `phone.full` + audit `REVEAL_PHONE`). `components/ui/contact-buttons.tsx` đổi prop `customerId` → `reveal` (callback) để dùng chung được cho cả Customer lẫn Appointment — nhưng phải truyền qua **`.bind(null, id)`**, KHÔNG được đóng closure `() => fn(id)` (lỗi runtime "Functions cannot be passed directly to Client Components", xem cạm bẫy #14 trong BAN-GIAO.md).
- **Avatar hết công khai + phát hiện lỗ hổng sâu hơn dự kiến**: đổi lưu trữ avatar từ `public/uploads/avatars/` (thư mục con) sang PHẲNG `public/uploads/` (giống ảnh hồ sơ) + dò định dạng qua magic bytes (`lib/upload.ts` `sniffImageExt`) thay vì tin `file.type`. Có script `scripts/migrate-avatar-storage.mjs` tự chuyển avatar cũ (idempotent, chạy lúc container khởi động). **Phát hiện thêm khi kiểm thử**: dù avatar đã qua `/media` (có xác thực), file VẪN lộ công khai qua đường TĨNH Next.js `/uploads/<f>` (Next tự phục vụ mọi file trong `public/`, bỏ qua hoàn toàn logic auth của route `/media`) — lỗ hổng này ảnh hưởng CẢ ảnh hồ sơ/giấy tờ, không riêng avatar. Sửa bằng matcher `"/uploads/:path*"` riêng trong `proxy.ts`, trả 401 nếu không có phiên hợp lệ (xem cạm bẫy #13 trong BAN-GIAO.md).
- **Trợ lý AI chào đúng tên**: bỏ chuỗi cứng "Chào anh Lam", dùng `shortName(user.fullName)` (chuyển hàm này từ `dashboard/page.tsx` sang `lib/format.ts` dùng chung).
- **Cổng khách hết lộ ghi chú nội bộ + có trang riêng khi token sai**: `khach/[token]/page.tsx` không còn hiện `chiefComplaint` (đổi câu truy vấn Prisma từ `include` sang `select` tường minh để tránh lặp lại lỗi này); nhãn trạng thái `SERVICED` đổi thành "Đang thực hiện" cho khách (thêm `CASE_STATUS_PORTAL` trong `lib/status.ts`, giữ nguyên `CASE_STATUS` nội bộ). Token không tồn tại → `app/khach/[token]/not-found.tsx` riêng (trước đây rơi vào 404 khu vực quản trị, có nút dẫn tới màn đăng nhập nhân viên — vô nghĩa với khách).
- **Gộp thông báo đăng nhập sai** (chống dò tài khoản): "Tài khoản không tồn tại"/"Sai mật khẩu" → chung 1 câu "Sai tên đăng nhập hoặc mật khẩu." + so sánh với hash giả (`DUMMY_HASH`) khi tài khoản không tồn tại để thời gian phản hồi không lộ qua timing attack (đã đo: ~327ms vs ~329ms, coi như bằng nhau).
- **Làm sạch dữ liệu demo**: `prisma/seed.ts` tách `midLastFemale`/`midLastMale`, chọn GIỚI TÍNH trước rồi mới chọn tên đúng giới tính đó (trước đây random độc lập → "Lê Thị Hương — Nam"). Sửa luôn lỗi `discountAmount` tính cả khi ca KHÔNG chốt (CONSIDERING/DECLINED) trong khi `services`/`totalAmount` chỉ tạo khi chốt → thẻ Tài chính tự mâu thuẫn ("giảm giá X" mà "chưa có dịch vụ") — đây chính là ca cụ thể phát hiện trong báo cáo kiểm định gốc.

## Đợt vá an toàn dữ liệu & hạ tầng (kiểm định QA phát hiện) — "Đợt 24"
> Xuất phát từ 1 vòng kiểm định QA độc lập phát hiện 4 lỗ hổng nghiêm trọng liên quan tới MẤT DỮ LIỆU
> và ĐĂNG NHẬP — ưu tiên cao hơn mọi lỗi UI/UX vì hậu quả không thể đảo ngược. Tự kiểm thử bằng dữ
> liệu/kịch bản THẬT (không chỉ đọc code): TSC pass, 171/171 test, dựng Docker daemon trong sandbox để
> build thật + diễn tập sao lưu/phục hồi, forge JWT thật để tái hiện đúng lỗi vòng lặp đăng nhập,
> Playwright thật cho banner mật khẩu yếu.
- **Sao lưu tự động ĐANG HỎNG THẬT**: `Dockerfile` chỉ cài `openssl ca-certificates` → container KHÔNG có `pg_dump` → `scripts/backup.mjs` lỗi ENOENT âm thầm dù trang Hệ thống báo "đã bật sao lưu tự động". Thêm `postgresql-client-16` (khớp đúng major version với service `db` trong compose, qua kho APT chính thức apt.postgresql.org vì Debian bookworm mặc định chỉ có client v15). Đã diễn tập: sao lưu → `pg_restore` vào DB trống → khôi phục đúng 100% (16 khách, 30 hồ sơ, tài khoản admin) + kiểm cơ chế giữ N bản gần nhất (RETAIN).
- **Nguy cơ seed tự xoá dữ liệu thật**: `docker-entrypoint.sh` cũ coi LỖI đếm bảng `User` (mất kết nối/quyền truy vấn thoáng qua) = "0 người dùng" rồi tự chạy seed (seed mở đầu bằng loạt `deleteMany()`). Sửa: lỗi đếm → DỪNG hẳn (`exit 1`, có thông báo rõ), KHÔNG bao giờ suy ra "trống" từ lỗi. Đã kiểm cả 2 nhánh (DB thật có dữ liệu → bỏ qua seed; DB lỗi kết nối → dừng, không seed) chạy thật qua `dash` (khớp shebang `/bin/sh` + `set -e` của script thật).
- **Vòng lặp đăng nhập vô hạn**: `proxy.ts` cũ chỉ kiểm tra cookie phiên có tồn tại (không xác thực JWT) → cookie hỏng (đổi `AUTH_SECRET`, hết hạn) vẫn bị coi "đã đăng nhập" → trang tự phát hiện sai → đá về `/login` → `/login` lại thấy cookie "có" → đá ngược lại → `ERR_TOO_MANY_REDIRECTS`. Next.js 16 chạy proxy bằng Node.js runtime (không còn giới hạn Edge) nên xác thực JWT thật ngay trong proxy an toàn; cookie hỏng bị xoá thẳng trên response trước khi chuyển hướng. Tái hiện đúng lỗi gốc bằng JWT ký sai khoá + xác nhận đã hết loop, đối chứng phiên hợp lệ vẫn hoạt động bình thường.
- **Cảnh báo mật khẩu demo chưa đổi**: thêm cờ `weakPw` vào JWT khi đăng nhập bằng đúng mật khẩu seed `123456` (`login/actions.ts`) → banner đỏ cho CHÍNH người đó (mọi vai trò, không riêng ADMIN) ở `(app)/layout.tsx`, link `/tai-khoan`. Đổi mật khẩu (`changePassword`) tự làm mới session `weakPw:false` ngay, không cần đăng xuất lại.
- Việc này nằm trong "Đợt 0" của kế hoạch đại tu 6 đợt lớn hơn (an toàn hạ tầng → bảo mật/mặt-tiền-khách → chống-nổ-chậm → tính-năng-mới → đánh-bóng-UI → sản-phẩm-hoá) — các đợt sau xem tiếp trong hội thoại/PR liên quan.

## Đợt thiết kế lại Trợ lý AI thành màn chat + render markdown — "Đợt 23"
> TSC pass, **157/157 test** (+7 test `markdown`). E2E THẬT (Playwright + mock AI trả markdown):
> màn chào + gợi ý → hỏi → câu trả lời render **đậm**/danh sách (không còn dấu `**` thô). Theo yêu
> cầu: "giao diện AI như màn chat thường + câu trả lời đặc sắc hơn".
- **Render markdown** (vấn đề chính): trước hiện thô `**Căng da**`. Thêm `lib/markdown.ts` THUẦN
  (có test): `parseInline` (đậm/nghiêng/mã) + `parseBlocks` (tiêu đề/danh sách/đoạn) — KHÔNG dùng
  HTML thô (an toàn). Component `components/ui/markdown.tsx` render thành React (đậm, danh sách…).
- **Thiết kế lại `/tro-ly` thành màn chat đầy đủ** (`assistant-chat.tsx` viết lại): bố cục cao toàn
  màn, bong bóng hỏi (phải) / trả lời (trái, avatar tia sáng), màn chào + ô gợi ý khi trống, hiệu
  ứng "đang gõ" (3 chấm nhún), tự cuộn xuống cuối, ô nhập cố định dưới (Enter gửi/Shift+Enter xuống
  dòng), nút "Cuộc trò chuyện mới". Trang `tro-ly/page.tsx` bỏ PageHeader (chat tự có tiêu đề).

## Đợt mở rộng "Khách tham khảo" gồm khách chưa hoàn tất — "Đợt 22"
> TSC pass, 150/150 test. E2E THẬT (Playwright): trang `/khach-tham-khao` có thêm mục "Đã đến,
> chưa hoàn tất" (22 hồ sơ dở từ seed) + nút "Liên hệ" chăm sóc + badge trạng thái. Theo yêu cầu:
> gộp cả khách hỏi online (chưa đến) VÀ khách đã đến nhưng hồ sơ chưa làm/đang dở.
- Trang `/khach-tham-khao` giờ 2 phần: (1) **Khách tham khảo** (leads online, như cũ) + (2) **Đã đến,
  chưa hoàn tất** — hồ sơ trạng thái OPEN/CONSULTED/SERVICED (chưa COMPLETED/CANCELLED), kèm trạng
  thái + kết quả tư vấn + số dịch vụ + **nút Liên hệ (Gọi/SMS/Zalo + chép số)** mẫu tin "mời quay lại"
  (`tplWinback`) + link mở hồ sơ để chốt. Đổi tiêu đề trang thành "Khách tham khảo & chưa chốt".
- Không đổi schema (chỉ đọc dữ liệu sẵn có).

## Đợt giấy tờ hành chính — tải FILE lên (thay gõ tay) — "Đợt 21"
> TSC pass, **150/150 test** (+6 test `upload`). E2E THẬT (Playwright + DB): tải PDF lên hồ sơ →
> hiện trong danh sách → `/media` phục vụ đúng `application/pdf` (mở xem được). Theo yêu cầu:
> "mẫu phiếu đồng ý gõ tay bất tiện → cho gửi file lên rồi bấm xem".
- **Model `CaseDocument`** (migration `20260627180000_case_document`): tiêu đề + tên tệp gốc +
  url + mime + người tải. `lib/upload.ts` THUẦN (có test): `isAllowedDocMime`/`docExt`/
  `safeStoredName`/`prettyFileSize` (cho PDF, ảnh, Word, Excel; chống path traversal).
- **Giao diện**: thẻ "Giấy tờ hành chính" trên hồ sơ — nút "Tải giấy tờ lên" (tiêu đề + chọn
  file ≤15MB) + danh sách + nút **"Xem"** (mở `/media/<tệp>`, PDF xem ngay trên trình duyệt) +
  xoá. Action `uploadCaseDocument`/`deleteCaseDocument` (quyền `case.clinical`, tôn trọng khoá hồ sơ).
- **Route `/media`**: thêm content-type PDF/Word/Excel (trước chỉ ảnh) — vẫn yêu cầu đăng nhập
  hoặc vé ký (giấy tờ nhạy cảm KHÔNG công khai). Tính năng phiếu đồng ý gõ tay (Đợt 11) vẫn giữ.

## Đợt sửa 2 lỗi: tên CTV + tự trừ kho theo dịch vụ — "Đợt 20"
> TSC pass, 144/144 test. E2E THẬT (Playwright + DB) cho CẢ HAI lỗi: PASS.
- **Lỗi 1 — không sửa được TÊN cộng tác viên:** form sửa CTV để ô tên `readOnly` (khoá cứng vì
  hiệu suất CTV gộp theo TÊN). Sửa: **cho sửa tên**, và khi đổi tên thì `updateCollaborator` tự
  **cập nhật `Customer.sourceDetail`** của mọi khách đã gắn CTV đó (trong 1 giao dịch) → đổi tên
  hoạt động + KHÔNG mất liên kết hiệu suất. E2E: đổi "CTV Bảo Trâm"→"...SUA", khách Huỳnh Ngọc Anh
  tự đổi theo.
- **Lỗi 2 — kho không tự trừ khi khách dùng dịch vụ (vd tiêm botox):** trước đây phải bấm nút
  "Trừ VT" thủ công. Sửa: **`addCaseService` TỰ ĐỘNG trừ kho theo định mức** (BOM) nếu dịch vụ có
  khai báo định mức — tách helper `applyBomTx` dùng chung với nút thủ công (vẫn giữ cho dịch vụ cũ).
  E2E: thêm dịch vụ "Tiêm filler" (định mức 1 Botox) → Botox 54→53 + ghi MaterialUsage, KHÔNG cần bấm gì.
  ⚠️ Điều kiện: phải khai báo ĐỊNH MỨC cho dịch vụ 1 lần ở Danh mục (vd "1 lần tiêm = 1 lọ botox").

## Đợt chất lượng mã nguồn — trọn Nhóm E — "Đợt 19"
> TSC pass, **144/144 test** (+5 test `pnl`). Lint giảm 17→15 (0 cảnh báo biến không dùng).
- **E1** — số liệu THỰC: `PROJECT-OVERVIEW.md` sửa "~15k LOC, 19 model, 22 migration" → con số
  đã kiểm chứng **~21k LOC, 25 model, 25 migration**.
- **E2** — tách tầng domain tiền: thêm `lib/pnl.ts` (`computePnl` THUẦN, có test) — tách toán
  Lãi/Lỗ ra khỏi `getMonthlyPnl` trong `reports.ts` (giờ chỉ truy vấn DB rồi gọi `computePnl`).
  Cùng với `case-math.ts` + `inventory-cost.ts` đã có → logic tiền chính đều ở lib thuần có test.
- **E3** — lint: xác nhận **0 cảnh báo biến không dùng** (đã dọn từ Đợt 13). Sửa `two-factor.tsx`
  bỏ 2 `setState-in-effect` (suy trạng thái bật/tắt ngay khi render — giữ nguyên hành vi). Còn 15
  lỗi `react-hooks` (React Compiler) KHÔNG chặn build: phần lớn false-positive trên Server Component
  (`Date.now()` khi render RSC) + truy cập `window` an toàn-SSR; số còn lại (command-palette,
  permission-editor) cần refactor effect tương tác → để đợt riêng tránh rủi ro.
- **Gom label/enum**: rà soát — nhãn trạng thái đã tập trung ở `lib/status.ts`; nhãn theo miền
  (`leads.ts`, `nps.ts`, `finance.ts`) đặt cùng module domain là HỢP LÝ, không có trùng lặp cần gom.

## Đợt cổng khách: đánh giá NPS + link có hạn (D3 hoàn tất) — "Đợt 18"
> TSC pass, **139/139 test** (+6 test `nps`). E2E THẬT (Playwright, cổng khách CÔNG KHAI):
> mở `/khach/<token>` → mục "Đánh giá trải nghiệm" → chọn điểm 9 + góp ý → gửi → lời cảm ơn;
> kiểm DB có NpsResponse(score=9). Đặt token hết hạn → trang hiện "Liên kết đã hết hạn".
- **NPS (đánh giá trải nghiệm)**: model `NpsResponse` (score 0–10 + comment). `lib/nps.ts`
  THUẦN (có test): `npsCategory` (0–6 chưa hài lòng / 7–8 bình thường / 9–10 hài lòng),
  `npsSummary` (NPS = %hài lòng − %chưa hài lòng, điểm TB, đếm nhóm). Khách tự đánh giá ở
  cổng khách (action công khai `portalSubmitNps`, rate-limit, chỉ hiện khi đã có lịch sử điều
  trị & chưa đánh giá trong 30 ngày). Thẻ "NPS" trên `/phan-tich` (điểm + TB + 3 nhóm).
- **Link cổng khách có HẠN + thu hồi (D3)**: thêm `Customer.portalTokenExpiresAt`. `genPortalLink`
  đặt hạn 90 ngày; cổng khách kiểm hạn → hết hạn hiện thông báo thân thiện (không lộ dữ liệu).
  Thu hồi (`revokePortalLink`) xoá cả token lẫn hạn. (Action công khai `customerByToken` cũng
  từ chối token hết hạn.)

## Đợt trợ lý AI hỏi-đáp số liệu (D1) — "Đợt 17"
> TSC pass, **133/133 test** (+6 test `assistant`). E2E THẬT (Playwright + mock AI OpenAI-compat
> + DB seed): mở `/tro-ly` → gõ câu hỏi → đường getAssistantContext (truy vấn thật) →
> formatAssistantContext → ai.ts gọi chuẩn OpenAI → câu trả lời hiện trên UI. (Cũng là lần đầu
> chạy thực đường OpenAI-compatible của lớp AI Đợt 14.)
- **An toàn theo thiết kế**: AI KHÔNG truy cập thẳng DB. Máy chủ tính sẵn "ảnh chụp" số liệu
  KINH DOANH (doanh thu/công nợ/dịch vụ bán chạy/RFM/churn/tồn kho/leads/ROI) — KHÔNG gồm SĐT
  / dữ liệu y khoa — rồi đưa cho AI trả lời CHỈ dựa trên đó (chống bịa số + rò rỉ).
- **`lib/assistant.ts`** (THUẦN, có test): `formatAssistantContext` (số liệu → văn bản gọn),
  `ASSISTANT_SYSTEM` (lời nhắc), `SUGGESTED_QUESTIONS`.
- **`lib/assistant-data.ts`**: `getAssistantContext()` tái dùng `getBusinessAnalytics(30)` +
  truy vấn doanh thu 30 ngày / khách-hồ sơ mới / lịch hẹn hôm nay / công nợ + top nợ / dịch vụ
  bán chạy / tồn kho thấp / leads.
- **Trang `/tro-ly`** (module mới `tro-ly`, icon `Sparkles`, quyền ADMIN/MANAGER/SHAREHOLDER):
  ô hỏi + câu hỏi gợi ý + lịch sử hỏi-đáp trong phiên. Action `askAssistant` (audit `ASK_ASSISTANT`).
  Chưa cấu hình AI → hiện hướng dẫn bật. 🔑 Cần `AI_API_KEY` (nhà cung cấp bất kỳ — anh đã cắm DeepSeek).
- **Sửa kèm**: `prisma/rotate-phone-key.ts` nay mã hoá lại CẢ `Lead` (Đợt 16 thêm SĐT cho lead) —
  trước chỉ xử lý `Customer`, đổi khoá sẽ làm hỏng SĐT lead.

## Sửa lẻ — nút Liên hệ hiện SỐ + chép số (UX trên máy tính)
> Nút Gọi/SMS là deep-link `tel:`/`sms:` chỉ chạy trên điện thoại; trên MÁY TÍNH bấm
> không có gì. Sau khi "Liên hệ", `ContactButtons` giờ HIỆN SỐ ĐẦY ĐỦ (font mono) + nút
> "Chép số" (clipboard) → nhân viên đọc/sao chép rồi gọi bằng ĐT chăm sóc riêng của PK.
> Nút Gọi/SMS/Zalo vẫn còn cho ai dùng điện thoại. TSC pass.

## Đợt khách tham khảo / leads — "Đợt 16"
> TSC pass, **127/127 test** (+4 test `leads`). Smoke test THẬT (Playwright + DB): mở
> /khach-tham-khao → thêm khách tham khảo (có SĐT) → hiện trong danh sách → "Chuyển khách"
> (modal xác nhận) → điều hướng vào hồ sơ khách → kiểm tra DB: Lead=CONVERTED + Customer
> mới tạo (SĐT mã hoá copy sang, nguồn REFERRAL) → dọn dữ liệu test.
- **Tính năng**: "khách tham khảo" — khách từ nhiều nguồn giới thiệu tới THAM KHẢO dịch vụ
  nhưng CHƯA hẹn, CHƯA đến (theo yêu cầu). Phễu trước khi thành khách/đặt lịch.
- **Model `Lead`** + enum `LeadStatus` (migration `20260627160000_lead`): tên + SĐT mã hoá
  (tuỳ chọn, như Customer) + nguồn/chi tiết nguồn + dịch vụ quan tâm + trạng thái (Mới / Đã
  liên hệ / Đã chuyển khách / Không quan tâm).
- **`lib/leads.ts`** (THUẦN, có test): nhãn/sắc thái trạng thái + `summarizeLeads` (phễu:
  tổng / đang theo đuổi / đã chuyển / tỉ lệ chuyển đổi %).
- **Trang `/khach-tham-khao`** (module mới `khach-tham-khao`, icon `UserSearch`, quyền ADMIN/
  MANAGER/TELESALE/RECEPTION): 4 thẻ thống kê phễu + lọc theo trạng thái + bảng + thêm/sửa/xoá +
  đổi nhanh trạng thái + nút **"Chuyển khách"**.
- **Chuyển đổi** `convertLeadToCustomer`: COPY thẳng SĐT đã mã hoá sang Customer (KHÔNG giải mã),
  chống trùng theo phoneHash, đánh dấu Lead = CONVERTED, mở hồ sơ khách. Audit đầy đủ.

## Đợt hẹn nợ / trả góp công nợ (B3 bổ sung) — "Đợt 15"
> TSC pass, **123/123 test** (+12 test `debt-plan`). Smoke test THẬT (Playwright + DB):
> lập hẹn nợ trên hồ sơ HS00002 → hiện "Ngày 15 hằng tháng" + 3.000.000/tháng → /cong-no
> hiện gợi ý kỳ tới → kiểm tra hàng DebtPlan trong DB (day=15, 3.000.000) → dọn dữ liệu test.
- **Tính năng**: khách công nợ "hẹn nợ" — mỗi tháng vào **ngày X** trả **Y đồng** tới khi hết
  nợ (theo yêu cầu: "ngày bao nhiêu hàng tháng sẽ trả, mỗi tháng trả bao nhiêu").
- **Model `DebtPlan`** (migration `20260627150000_debt_plan`): 1 hồ sơ 1 kế hoạch (caseId unique),
  `dayOfMonth` 1..28, `monthlyAmount`, `startDate`, `note`. KHÔNG sinh từng dòng kỳ — suy ra lịch.
- **`lib/debt-plan.ts`** (THUẦN, có test): `nextDueDate`, `monthsToClear`, `duePeriods`,
  `expectedPaidByNow`, `debtPlanStatus` (kỳ tới + dự kiến hết nợ + đang chậm so với cam kết).
- **Giao diện**: thẻ Tài chính của hồ sơ có khối "Hẹn nợ (trả góp)" — `DebtPlanCard` (modal lập/sửa
  + hủy). `/cong-no` mỗi hàng có nợ + có kế hoạch hiện "Hẹn {tiền}/th · kỳ {ngày}". Quyền `payment.add`.
- **Actions** `cong-no/actions.ts`: `saveDebtPlan` (upsert, cặp `useFormAction` — không revalidate),
  `deleteDebtPlan` (ConfirmButton — revalidate). Audit `SAVE_DEBT_PLAN`/`DELETE_DEBT_PLAN`.

## Đợt AI trung lập nhà cung cấp (chọn model giá rẻ tuỳ ý) — "Đợt 14"
> TSC pass, **111/111 test** (+9 test `resolveAiConfig`). Theo yêu cầu: "cân nhắc AI giá rẻ
> của Trung Quốc như DeepSeek… không thiên vị AI nào".
- **Lớp AI tách khỏi 1 hãng** (`lib/ai.ts`): viết lại để TRUNG LẬP NHÀ CUNG CẤP. Hàm thuần
  `resolveAiConfig(env)` (có test) phân giải `AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL`/`AI_PROVIDER`;
  `generateMessage` gọi đúng 1 trong 2 chuẩn API: **OpenAI-compatible** (`/chat/completions` —
  DeepSeek, Qwen, Gemini-compat, OpenAI, Groq, tự host Ollama/vLLM) hoặc **Anthropic**
  (`/v1/messages` — Claude). Tự suy nhà cung cấp từ base URL nếu không khai báo. Vẫn tương
  thích ngược `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` (cách cũ chạy y nguyên).
- **Cấu hình + vận hành**: `.env.example` thêm khối "AI" với base/model mẫu cho 5 hãng + lưu ý
  CHỦ QUYỀN DỮ LIỆU (DeepSeek/Qwen xử lý ở TQ; muốn dữ liệu không ra ngoài → tự host, trỏ
  `AI_BASE_URL` về máy nội bộ). `docker-compose.yml` (gốc + `deploy/`) truyền `AI_*`.
  `windows/Cai-AI-Key.ps1` đổi thành TRÌNH CHỌN nhà cung cấp (1=DeepSeek 2=Qwen 3=Gemini
  4=OpenAI 5=Claude 6=tự host) — tự điền base/model, chỉ hỏi key.
- **Khuyến nghị (khách quan, tự kiểm chứng giá trước khi chốt)**: tin nhắn chăm sóc rất ngắn
  nên model rẻ nào cũng đáp ứng. Rẻ nhất ≈ DeepSeek/Qwen (~vài nghìn đồng/triệu token); cân
  bằng tiếng Việt + giá ≈ Gemini 2.0 Flash; muốn dữ liệu y tế KHÔNG rời máy phòng khám → tự
  host (mục 6). App vốn chỉ gửi tên khách + tên dịch vụ, KHÔNG gửi SĐT.

## Đợt ROI marketing + dọn lint (C3 + E3) — "Đợt 13"
> TSC pass, **102/102 test** (+2 test `marketingRoi`). Smoke test THẬT (Playwright): `/phan-tich`
> hiện section "ROI Marketing".
- **C3**: `lib/analytics.ts` `marketingRoi(revenue, spend)` (có test). `analytics-data.ts` thêm chi
  phí marketing (Sổ thu chi EXPENSE/MARKETING trong kỳ) + doanh thu thực thu từ khách nguồn marketing.
  Trang `/phan-tich` thêm card "ROI Marketing" (chi phí / doanh thu / ROI). ⚠️ ROI chỉ chính xác khi
  chủ ghi chi phí marketing ở Sổ thu chi (mục "Marketing & quảng cáo").
- **E3**: xóa 5 cảnh báo lint (biến `m`/`PageHeader`/`BarChart` không dùng + sửa vị trí
  `eslint-disable` ở avatar). Còn 15 lỗi `react-hooks/set-state-in-effect` (rule mới áp code cũ —
  sửa cần refactor effect, để đợt riêng; không chặn build).

## Đợt cổng khách tự xác nhận / đổi lịch (D3 gđ1) — "Đợt 12"
> Trên cổng khách công khai (`/khach/[token]`) thêm "Lịch hẹn sắp tới": khách tự xác nhận sẽ đến /
> đề nghị đổi lịch. TSC pass, **100/100 test**. Smoke test THẬT (Playwright, KHÔNG đăng nhập): xác
> nhận → lịch hẹn CONFIRMED; đề nghị đổi → tạo CareMessage (NOTE/IN) + ghi note lịch hẹn.
- **`khach/[token]/actions.ts`** (server action CÔNG KHAI): `portalConfirmAppointment` +
  `portalRequestReschedule`. Mọi thao tác kiểm token → khách → lịch hẹn thuộc đúng khách. Chống
  spam bằng `rate-limit.bump` (theo token). KHÔNG tự đổi giờ — chỉ ghi nhận yêu cầu cho nhân viên.
- **`khach/[token]/appointment-actions.tsx`** (client): nút xác nhận / đề nghị đổi (ô nhập khung giờ).
- ⚠️ Đây là action PUBLIC → bảo mật dựa hoàn toàn vào việc kiểm quyền sở hữu theo token + rate-limit.
- ⏳ Còn (D3): đánh giá NPS; token cổng khách có hạn dùng / tự thu hồi.

## Đợt phiếu đồng ý / consent (B6 hoàn tất) — "Đợt 11"
> Soạn mẫu phiếu → ghi nhận trên hồ sơ (tự điền tên/ngày/dịch vụ) → in cho khách ký tay. TSC pass,
> **100/100 test** (+5 test `consent`). Smoke test THẬT (Playwright + Chromium): /mau-phieu hiện
> mẫu; ghi nhận đồng ý → prefill thay {{ten}} đúng → lưu → phiếu hiện + DB có snapshot; trang in
> render đủ tiêu đề/nội dung/ô ký.
- **Schema** (migration `20260627140000_consent`): `ConsentTemplate` (mẫu) + `CaseConsent` (phiếu đã
  ký — lưu SNAPSHOT title/body + signerName/relationship/signedAt).
- **`lib/consent.ts`** (toán THUẦN, có test): `fillConsentTemplate` thay placeholder
  `{{ten}}/{{ngay}}/{{dichvu}}/{{mahoso}}`.
- **`/mau-phieu`** (module mới ADMIN/MANAGER): CRUD mẫu phiếu (`mau-phieu/actions.ts` + `template-forms.tsx`).
- **Hồ sơ** (`ho-so/[id]`): card "Phiếu đồng ý" + `AddConsentButton` (chọn mẫu → tự điền, sửa được)
  + nút In + xóa. Action ở `ho-so/consent-actions.ts`. Trang in `ho-so/[id]/consent/[consentId]`
  (dùng `.invoice-sheet`, 2 ô ký).
- ⚠️ "Ký số" thực thụ chưa làm — in giấy cho khách ký tay (đúng thực tế); placeholder hỗ trợ ở
  `consent-widgets.tsx` (controlled title/body để chọn mẫu là tự điền).
- ⚠️ Lưu ý dev: route lồng mới `[id]/consent/[consentId]` lần đầu bị Turbopack biên dịch theo yêu
  cầu → request đầu có thể 404 trong dev; `next build` (production) biên dịch sẵn nên không sao.

## Đợt phiếu nhập kho nhiều dòng (B5 hoàn tất) — "Đợt 10"
> Nhập nhiều vật tư trong MỘT phiếu, gửi trong 1 giao dịch. TSC pass, **95/95 test** (+5 test
> `stock-in`). Smoke test THẬT (Playwright + Chromium): nhập 2 dòng → tồn + giá vốn bình quân +
> StockMovement IN đều đúng (Botox 54→64 @515.625; Chỉ Collagen 0→20 @300.000).
- **`lib/stock-in.ts`** (toán THUẦN, có test): `validStockInLines`/`parseStockInLines`/`stockInTotal`.
- **`kho/actions.ts`** `stockInBatch`: mỗi dòng cộng tồn + cập nhật `avgCost` bình quân + ghi
  `StockMovement` IN, trong 1 `$transaction`. Quyền ADMIN/MANAGER. Ghi chú/NCC dùng chung cả phiếu.
- **`kho/stock-in-batch.tsx`**: modal nhiều dòng (thêm/xóa động) + nút "Nhập kho" trên `/kho`
  (ADMIN/MANAGER). Dùng `onSubmit`+`preventDefault` (tránh React 19 reset mất dòng đã nhập — xem B4).
- Lưu ý: nút nhập kho 1-dòng cũ ở Danh mục vẫn giữ; phiếu nhiều dòng ở trang Kho là cách nhanh hơn.

## Đợt chống trùng lịch hẹn (B4 giai đoạn 1) — "Đợt 9"
> Cảnh báo khi đặt/sửa lịch mà người phụ trách (tư vấn) đã có hẹn khác đụng giờ (cửa sổ 30 phút),
> cho ghi đè "Vẫn đặt lịch này". TSC pass, **90/90 test** (+7 test `schedule`). Smoke test THẬT
> (Playwright + Chromium): đặt lịch A 10:00 (người phụ trách X) → đặt B 10:15 cùng X → cảnh báo
> trùng + nút ghi đè → bấm ghi đè tạo được B (DB có cả 2).
- **`lib/schedule.ts`** (toán THUẦN, có test): `slotConflict`, `findConflicts` (bỏ chính lịch đang
  sửa), `minutesApart`, hằng `SLOT_WINDOW_MIN=30`.
- **Action** (`lich-hen/actions.ts`): `consultantConflictMessage` truy vấn lịch khác cùng người phụ
  trách (trạng thái còn hiệu lực) trong ngày → câu cảnh báo. Tách lõi `doCreate/doUpdateAppointment
  (formData, force)` + 2 export: thường (kiểm tra trùng) và **forced** (bỏ qua) cho nút ghi đè.
- **Form** (`new-appointment.tsx`): cảnh báo vàng + nút "Vẫn đặt lịch này" gọi action forced.
- ⚠️ **Cạm bẫy React 19:** `<form action={fn}>` tự reset input không kiểm soát sau mỗi lần gửi →
  mất dữ liệu sau cảnh báo trùng (+ nút ghi đè gửi form rỗng). Khắc phục: chuyển sang `onSubmit` +
  `e.preventDefault()` + gọi action thủ công (không dùng prop `action`). Lý do KHÔNG truyền cờ
  force qua `fd.set()`: Next/React lược bỏ field tự thêm khi gọi server action → phải dùng 2 action
  server riêng (thường / forced).
- ⏳ Còn (B4): tài nguyên phòng/giường; link khách tự xác nhận (gắn D3 cổng khách).

## Đợt an toàn y khoa (B6 giai đoạn 1) — "Đợt 8"
> Thêm thông tin AN TOÀN Y KHOA cho khách (dị ứng / tiền sử / chống chỉ định) + cảnh báo nổi bật để
> bác sĩ thấy TRƯỚC khi làm dịch vụ — rất quan trọng với phòng khám phẫu thuật thẩm mỹ. Không cần
> API/tài khoản. TSC pass, **83/83 test** (schema + UI, không thêm test). Smoke test THẬT (Playwright
> + Chromium): set 3 trường cho 1 khách → banner đỏ "Lưu ý an toàn y khoa" hiện đúng trên cả trang
> khách hàng lẫn trang hồ sơ điều trị.
- **Schema** (migration `20260627130000_customer_medical`, viết tay): thêm 3 cột text nullable vào
  `Customer`: `allergies`, `medicalHistory`, `contraindications`.
- **Nhập liệu**: mở rộng `updateCustomer` (action) + `EditCustomerButton` (form khách hàng) thêm
  mục "An toàn y khoa" 3 ô. Người sửa: ADMIN/MANAGER/RECEPTION/TELESALE (lễ tân ghi khi tiếp nhận).
- **Cảnh báo**: `components/ui/medical-alert.tsx` (mới) — banner đỏ; dị ứng + chống chỉ định tô đỏ
  đậm, tiền sử để nhạt; **ẩn hoàn toàn** nếu trống. Gắn vào `/khach-hang/[id]` (dưới thẻ hồ sơ) +
  `/ho-so/[id]` (bản gọn, nơi bác sĩ thao tác).
- ⏳ Còn (B6): phiếu đồng ý (consent) ký số; mẫu hồ sơ y khoa theo loại dịch vụ; cho bác sĩ
  (DOCTOR/CONSULTANT) tự sửa thông tin y khoa (hiện chỉ ADMIN/MANAGER/RECEPTION/TELESALE sửa được).

## Đợt phân tích kinh doanh (BI — Nhóm C) — "Đợt 7"
> Trang mới `/phan-tich` — chỉ ĐỌC dữ liệu sẵn có, KHÔNG đổi schema, KHÔNG cần API/tài khoản.
> Làm phần lõi C1 (RFM + radar khách rời bỏ), C2 (LTV theo nguồn), C4 (phễu chuyển đổi). TSC pass,
> **83/83 test** (+13 test `analytics`). Smoke test THẬT bằng trình duyệt (Playwright + Chromium):
> ADMIN thấy đủ 4 phần + đổi khoảng thời gian 30 ngày OK; TELESALE (không quyền `mod:phan-tich`) bị
> chặn → `/khong-co-quyen` (xác nhận bằng nội dung trang, vì redirect chạy phía client).
- **`lib/analytics.ts`** (toán THUẦN, có test): `rfmScore` (chấm Recency/Frequency/Monetary theo
  ngưỡng `DEFAULT_RFM` tinh chỉnh được), `rfmSegment` (6 phân khúc: VIP/Trung thành/Mới/Nguy cơ rời
  bỏ/Đang ngủ/Khác), `isChurnRisk`, `funnelRates` (tỉ lệ từng bậc so bậc đầu & bậc trước).
- **`lib/analytics-data.ts`** (truy vấn + lắp ráp): `getBusinessAnalytics(days)` — RFM toàn bộ khách
  (raw SQL gom số lần + tổng chi + lần cuối), đếm phân khúc, lọc khách "nguy cơ rời bỏ" (ưu tiên
  giá trị cao); phễu hồ sơ (mở→tư vấn→chốt→thu) + phễu lịch hẹn (hẹn→đến) trong kỳ; LTV theo nguồn.
- **Trang `/phan-tich`** (module mới — ADMIN/MANAGER/SHAREHOLDER; icon `PieChart`): 4 thẻ tổng quan
  + chọn khoảng thời gian (query string), phễu (thanh ngang), phân bố phân khúc RFM, **radar khách
  rời bỏ** (bảng kèm `ContactButtons` mẫu "mời quay lại" — tái dùng B2 bậc 1), LTV theo nguồn.
- Thêm icon `PieChart` vào `app-shell.tsx` (bản đồ ICONS của thanh điều hướng).
- ⏳ Còn nhóm C: C3 ROI theo nguồn (cần gắn chi phí marketing — nguồn từ Sổ thu chi), dự báo doanh
  thu, cohort theo tháng, tự đẩy danh sách khách rời bỏ vào "Việc cần làm hôm nay" (B1).

## Đợt định mức vật tư theo dịch vụ (BOM) — "Đợt 6"
> Nối tiếp Đợt 4 (giá vốn kho). Khai báo "1 lần làm dịch vụ X tiêu hao mặc định bao nhiêu vật
> tư" (BOM), rồi thêm nút trên hồ sơ để TỰ ghi nhận vật tư + trừ kho theo định mức — chống quên
> ghi vật tư. TSC pass, **70/70 test** (+8 test `service-bom`). Smoke test THẬT bằng trình duyệt
> (Playwright + Chromium): khai báo Botox 2 lọ/lần cho dịch vụ filler → thêm dịch vụ (SL 2) vào
> hồ sơ → bấm "Trừ VT" → kiểm DB: tồn Botox 54→50 (đúng 2×2=4), MaterialUsage 4 lọ, StockMovement
> OUT 4 @ giá vốn 500.000, `bomApplied=true`, nút đổi thành nhãn "Đã trừ VT".
- **Schema** (migration `20260627120000_service_bom`, viết tay): model **`ServiceMaterial`**
  (`serviceId`+`materialId`+`quantity` định mức/lần, unique theo cặp; quan hệ `Service.materials`
  + `Material.serviceMaterials`) + cờ **`CaseService.bomApplied`** (Boolean, chống trừ kho 2 lần).
- **`lib/service-bom.ts`** (toán THUẦN, có test): `scaleBomQty` (định mức × SL dịch vụ phần
  nguyên), `bomNeeds` (quy đổi cả danh sách, đánh dấu `short` khi thiếu tồn, bỏ dòng định mức 0),
  `bomShortages`, `bomCost` (giá vốn ước tính = Σ need × giá vốn bình quân).
- **Danh mục** (`danh-muc`): server action `addServiceMaterial` (upsert) + `removeServiceMaterial`;
  `ServiceBomButton` (modal ở `catalog-forms.tsx`) — mỗi dịch vụ có nút "Định mức vật tư" (huy hiệu
  số dòng) để liệt kê/thêm/xóa định mức (Combobox chọn vật tư + số định mức/lần). Chỉ ADMIN/MANAGER.
- **Hồ sơ** (`ho-so/[id]`): server action `applyServiceBom` — nạp định mức của dịch vụ → tạo
  MaterialUsage (× SL dịch vụ) + trừ kho + StockMovement OUT (đơn giá = giá vốn bình quân → COGS)
  trong **1 giao dịch**, rồi set `bomApplied=true`. Dòng dịch vụ (gắn danh mục + có định mức + chưa
  áp) hiện nút "Trừ VT" (ConfirmButton); đã áp → nhãn "Đã trừ VT". Vật tư khác vẫn ghi tay như cũ.
- ⏳ Còn (B5): phiếu nhập kho nhiều dòng (1 phiếu nhập nhiều vật tư cùng lúc).
- ⚠️ **Cố ý** không tự áp định mức ngay khi thêm dịch vụ (mà để nhân viên bấm nút): vì thêm dịch
  vụ có thể chỉ để báo giá/tư vấn — chưa thực làm → chưa nên trừ kho. Nhân viên chủ động bấm khi
  ca thực sự được làm.

## Đợt công nợ chủ động + liên hệ nhanh — "Đợt 5"
> Làm đồng thời 2 hạng mục theo yêu cầu chủ: B3 (sổ công nợ chủ động) + B2 bậc 1 (nút liên hệ
> Gọi/SMS/Zalo deep-link, không cần tài khoản SMS/Zalo OA). TSC pass, **62/62 test** (+13 test
> mới: `debt-aging` 8, `message-templates` 5). Smoke test thật bằng trình duyệt (Playwright +
> Chromium pre-installed): `/cong-no` hiện 13 hồ sơ nợ, lọc tab "30–60 ngày" → còn 5 (đúng); bấm
> "Liên hệ" trên 1 dòng → gọi `revealPhone` (đã có sẵn, gate quyền `phone.full`) → hiện đủ 3 nút
> Gọi (`tel:`) / SMS (`sms:...?body=` kèm tin nhắn nhắc nợ tiếng Việt đã URL-encode đúng) / Zalo
> (`zalo.me/<số>`); vai trò DOCTOR (không có quyền `mod:cong-no`) vào `/cong-no` bị chuyển hướng
> `/khong-co-quyen` — RBAC đúng.
- **`lib/debt-aging.ts`** (toán THUẦN, có test): `debtAgeDays`, `debtAgingBucket` (4 mốc 0-15/
  15-30/30-60/60+ ngày), `isOverThreshold` (cảnh báo vượt ngưỡng).
- **`lib/message-templates.ts`** (toán THUẦN, có test): sinh sẵn nội dung tin nhắn theo ngữ cảnh
  (nhắc nợ, nhắc tái khám, xác nhận hẹn, sinh nhật, khách nguội) — chỉ tạo TEXT, không tự gửi.
- **`components/ui/contact-buttons.tsx`** (mới): tái dùng `revealPhone` (server action có sẵn ở
  `khach-hang/actions.ts`, đã gate quyền + ghi nhật ký `REVEAL_PHONE`) → sau khi hiện số đầy đủ,
  render nút Gọi/SMS (kèm sẵn tin nhắn mẫu nếu truyền vào)/Zalo. Cũng thêm nút SMS vào
  `khach-hang/[id]/admin-phone.tsx` (trước đã có Gọi + Zalo) cho đồng bộ.
- **Trang Sổ công nợ** (`/cong-no`, module mới — ADMIN/MANAGER/RECEPTION/CONSULTANT/SHAREHOLDER):
  liệt kê hồ sơ còn nợ (`CaseRecord.debtAmount > 0`), tab lọc theo tuổi nợ (query string, không
  cần JS), ô nhập ngưỡng cảnh báo (mặc định 5tr) → hồ sơ vượt ngưỡng tô đỏ. Thẻ tổng công nợ/số hồ
  sơ vượt ngưỡng/nợ lâu nhất. Mỗi dòng có `ContactButtons` kèm sẵn mẫu nhắc nợ (tên + mã hồ sơ +
  số tiền).
- ⏳ Còn: "kế hoạch trả góp" (cần model DB mới — số kỳ + ngày hẹn từng kỳ); tạm dùng `note` có sẵn
  ở hồ sơ để nhân viên ghi tay khi thoả thuận trả góp. Kênh Email (bậc 1) chưa làm vì `Customer`
  hiện chưa có field email — để chủ quyết có cần thêm không trước khi đổi schema. Bậc 2–3 (tự
  động gửi SMS/Zalo OA thật) 🔑 cần chủ cấp tài khoản SMS Brandname/Zalo OA.

## Đợt kho theo chuẩn y tế (giá vốn) — "Đợt 4"
> Bắt nguồn từ lỗi kho không trừ tồn (mục ngay dưới), sau đó nâng kho lên "có giá vốn" để tính giá trị tồn kho & giá vốn vật tư đã dùng (COGS). TSC pass, **49/49 test** (+9 test giá vốn), smoke test thật bằng trình duyệt (Playwright + Chromium pre-installed).
- **Schema** (migration `20260626140000_inventory_costing`, viết tay): `Material.avgCost` (giá vốn bình quân gia quyền) + `StockMovement.unitCost` (đơn giá theo từng giao dịch kho).
- **`lib/inventory-cost.ts`** (toán THUẦN, có test `inventory-cost.test.ts`): `weightedAvgCost` (bình quân gia quyền; nếu CHƯA từng ghi giá vốn → LẤY luôn giá nhập, không pha loãng với tồn "giá 0"; nhập không khai báo giá → giữ nguyên giá cũ), `stockValue`, `totalStockValue`.
- **Nhập kho** (`danh-muc/actions.ts` `stockIn` + form ở `danh-muc/page.tsx`): thêm ô "Giá vốn" → cập nhật `avgCost` bình quân + lưu `unitCost` vào dòng IN. Gói trong `$transaction`.
- **Xuất/hoàn kho cho hồ sơ** (`ho-so/actions.ts`): `addMaterial`/`removeMaterial`/`updateMaterialUsage` ghi `unitCost` = giá vốn bình quân tại thời điểm đó (truy vết COGS).
- **Trang Kho** (`/kho`): thẻ "Giá trị tồn kho" (Σ tồn×giá vốn) + "Giá vốn đã xuất 30 ngày" (COGS); cột "Giá vốn tồn" trong bảng. Cảnh báo FEFO/hạn dùng đã có sẵn từ trước.
- **Smoke test thật**: nhập 10 @ 500.000 cho Botox (tồn 47→57, giá vốn 0→500.000, giá trị tồn 28.500.000, dòng IN unitCost=500.000); thêm 3 vào hồ sơ → OUT ghi unitCost=500.000, tồn 57→54.
- ⚠️ **Cố ý KHÔNG** cộng COGS vật tư vào Lãi/Lỗ (Báo cáo) để tránh **tính trùng** với chi phí mua vật tư chủ có thể đã ghi tay ở Sổ thu chi. Giá vốn ở đây là thông tin tham khảo trên trang Kho. Nếu sau này muốn đưa vào P&L thì phải thống nhất 1 nguồn (kho HOẶC sổ thu chi), không cả hai.

## Sửa lỗi — Kho không trừ tồn khi thêm vật tư vào hồ sơ
> Phát hiện khi chủ test thực tế: thêm vật tư cho khách nhưng tồn kho không giảm.
- **Nguyên nhân**: form "Thêm vật tư" (`ho-so/[id]/case-widgets.tsx`) chọn vật tư qua `Combobox` chỉ điền sẵn TÊN/ĐƠN VỊ, **không gửi `materialId`** (thiếu input ẩn) → server action `addMaterial` luôn nhận `materialId` rỗng → nhánh trừ kho `if (d.materialId)` không bao giờ chạy.
- **Sửa**: thêm state + input ẩn `materialId` vào form (kèm dòng nhắc "Sẽ tự trừ tồn kho khi lưu" / "Nhập tay không trừ tồn"). Đồng thời gói 3 thao tác (ghi usage + trừ/hoàn tồn + nhật ký `StockMovement`) vào **một `$transaction`** ở `addMaterial`/`removeMaterial`/`updateMaterialUsage` → không còn cảnh "đã ghi vật tư nhưng kho chưa trừ"; bỏ `.catch(()=>{})` nuốt lỗi; nếu vật tư đã bị xóa thì lưu như nhập tay (không lỗi FK).
- **Kiểm thử thật (Playwright + Chromium pre-installed)**: mở hồ sơ → chọn Botox từ danh mục → SL 3 → lưu; DB: tồn 50 → **47**, có `StockMovement OUT 3 "Dùng cho hồ sơ"`, `MaterialUsage.materialId` đã có giá trị. TSC pass, 40/40 test.
- **Lưu ý cho chủ**: bản ghi vật tư ĐÃ thêm SAI trước đây (materialId rỗng) sẽ không tự trừ lùi. Cách sửa: vào hồ sơ **xóa** dòng vật tư cũ rồi **thêm lại** bằng cách chọn từ danh mục (lúc này sẽ trừ kho đúng).

## Đợt trải nghiệm & sáng tạo — "Đợt 3"
> Mục tiêu: 3 tính năng "wow factor" trong `ROADMAP.md` nhóm D, tái dùng tối đa hạ tầng sẵn có (không đổi schema trừ 1 dòng quyền). TSC pass, 40/40 test, smoke test dev server thật (forge JWT `zsession` ký bằng `AUTH_SECRET` tự sinh trong `.env` sandbox — xem `web/BAN-GIAO.md` mục 10 — rồi `curl` các trang có quyền: `/dau-ca`, `/khach-hang`, `/khach-hang/[id]` đều 200, đúng nội dung tiếng Việt).
- **D2 — So sánh ảnh trước/sau**: `lib/components/ui/photo-compare.tsx` — nút "So sánh trước/sau" (ẩn nếu hồ sơ có <2 ảnh) mở modal kéo-so-sánh (con trỏ chuột/chạm, `clip-path`, không thư viện ngoài). Gắn ở trang hồ sơ điều trị (`ho-so/[id]`) và hồ sơ khách hàng (`khach-hang/[id]`).
- **D4 — Tìm kiếm toàn cục (Ctrl/Cmd+K)**: `lib/search-actions.ts` (`globalSearch`, server action) tìm khách hàng/hồ sơ/vật tư, lọc theo quyền hiện có (`moduleCan`). `components/layout/command-palette.tsx` (component có điều khiển `open`/`onOpenChange`) + nút "Tìm kiếm…" trên header `app-shell.tsx` + phím tắt toàn trang.
- **D5 — Màn "đầu ca lễ tân"** (`/dau-ca`, module mới ADMIN/MANAGER/RECEPTION/TELESALE): gộp "khách chưa đến hôm nay" + "khách đang chờ" (tính phút chờ từ `Appointment.arrivedAt` đã có sẵn, tô đỏ nếu ≥20 phút) + rút gọn `getWorkqueue()` (B1) cho các việc tồn đọng khác. Nút 1-bấm tái dùng nguyên `updateAppointmentStatus` đã có ở `lich-hen/actions.ts` (chỉ thêm `revalidatePath("/dau-ca")`).
- Lưu ý sandbox: không có `.env` sẵn trong checkout (chỉ `.env.example`) → phải tự tạo `.env` (DATABASE_URL trỏ DB sandbox đã seed, `AUTH_SECRET` + `PHONE_ENC_KEY` sinh mới bằng `openssl rand`) thì `next dev` mới đọc được biến môi trường để test luồng đăng nhập/JWT.

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

## KẾ TOÁN: gộp vào nhánh vận hành + TỰ ĐỘNG NHẮC VIỆC (đợt mới nhất)
Đưa module Kế toán sang nhánh đang chạy thực tế và hoà với các thay đổi đã có ở đây.

**Hợp nhất phép tính Lãi/Lỗ về một nguồn duy nhất**
- `lib/pnl.ts` nay giữ TOÀN BỘ toán thuần: `splitCashflow()` + `computePnl()` **có trừ lương và hoa hồng CTV**.
  Trước đây hàm này chỉ cộng tổng chi từ sổ thu chi → **Lãi/Lỗ chưa hề trừ lương**, số lãi bị thổi phồng.
- `lib/accounting.ts` dùng lại `pnl.ts` (không tự định nghĩa nữa); `getMonthlyPnl(monthDate)` thành vỏ bọc của
  `getMonthlyAccounting` → Báo cáo và Kế toán không bao giờ lệch. Gộp test vào `pnl.test.ts`.

**Sửa 2 lỗi phát hiện khi gộp**
- **Rò rỉ Chi phí đầu tư**: hạng mục `INVESTMENT` vốn chỉ ADMIN/Cổ đông xem, nhưng trang Kế toán (ADMIN+MANAGER)
  lại hiện qua tổng chi + bảng chi theo hạng mục. Thêm cờ `canSeeInvestment` lọc từ truy vấn cho cả `/ke-toan`,
  route xuất file và Lãi/Lỗ ở Báo cáo.
- **`saveBulkPayroll` lách khoá chốt sổ**: hàm sửa nhanh cả bảng lương có sau nên chưa bị chặn — đã thêm
  `isMonthClosed`.

**TỰ ĐỘNG NHẮC VIỆC KẾ TOÁN** (`lib/accounting-tasks.ts` — hàm thuần, 12 test)
- App tự soát và liệt kê việc còn tồn để chốt sổ tháng: thiếu chấm công · còn ai chưa chi lương (kèm số tiền) ·
  CTV chưa chi hoa hồng · sổ thu chi lệch bảng lương · tháng đã qua chưa chốt sổ.
- Không cần cron, không đổi schema: tính từ số liệu trang Kế toán đã tải sẵn → **0 truy vấn phát sinh**.
- Xong hết việc chặn → bảng đổi xanh **"Sẵn sàng chốt sổ"** kèm nút Chốt sổ ngay tại chỗ. Tháng đang chạy không
  bị thúc. Thiếu chấm công chỉ NHẮC chứ không chặn (nghỉ cả tháng vẫn hợp lệ 0 ngày công).
- KHÔNG trộn vào `workqueue.ts` vì trang "Việc cần làm" mở cho cả lễ tân/bác sĩ — không được lộ lương.

## MODULE KẾ TOÁN (`/ke-toan`) — thống kê thu chi & tính lương cuối tháng (đợt trước)
**Vấn đề**: app đã có Sổ thu chi và bảng Lương nhưng **không nối với nhau**. Lương tính ra ở `/luong` rồi
phải **gõ tay lại** vào Sổ thu chi thì dòng tiền mới đúng; không biết đã trả lương cho ai; Lãi/Lỗ ở Báo cáo
**không hề trừ lương** nên sai; không có bước "chốt sổ" nên số liệu tháng cũ vẫn tự đổi khi ai đó sửa hồ sơ.

**Đã làm**:
- **`lib/accounting.ts`** — `getMonthlyAccounting(monthDate, standardDays)` gộp 3 nguồn: thực thu (Payment) +
  Sổ thu chi + bảng Lương. 2 hàm thuần `splitCashflow()` / `computePnl()` có **8 test** (`accounting.test.ts`).
  **Quy tắc chống tính trùng**: lương & hoa hồng CTV luôn lấy từ bảng lương; phiếu chi hạng mục
  `SALARY`/`COMMISSION` trong sổ bị loại khỏi "chi vận hành" → không cộng 2 lần.
- **Trang `/ke-toan`**: bảng **Kết quả kinh doanh** (doanh thu · thu khác · chi vận hành · chi lương · hoa hồng
  CTV · **Lãi/Lỗ** + tỷ suất) · **đối chiếu thực thu theo hình thức** (khớp tiền mặt/quẹt thẻ/chuyển khoản với
  sao kê) · chi theo hạng mục · **bảng lương kèm trạng thái Đã chi/Chưa chi** · hoa hồng CTV · công nợ cần thu.
- **Ghi sổ chi lương 1 chạm**: nút "Chi" từng người hoặc **"Chi lương cả tháng"** → tự tạo phiếu chi trong Sổ
  thu chi (mỗi nhân sự 1 phiếu, ghi rõ họ tên, chọn ngày + hình thức) và đánh dấu đã trả. Có **Hoàn tác**
  (xóa luôn phiếu chi). Tương tự cho **hoa hồng cộng tác viên** (model `CommissionPayout`).
  Xóa phiếu chi ở `/thu-chi` cũng tự bỏ đánh dấu → không bao giờ lệch sổ.
- **Chốt sổ tháng** (`AccountingPeriod`): chụp lại số liệu + **khóa tháng** (không thêm/sửa/xóa thu chi, không
  sửa lương; đổi ngày giao dịch ra/vào tháng đã chốt cũng bị chặn). ADMIN **mở lại sổ** được, có ghi nhật ký.
- **Đồng bộ Báo cáo**: `getMonthlyPnl()` nay gọi chung `getMonthlyAccounting()` → Lãi/Lỗ ở Báo cáo và Kế toán
  **luôn khớp** và đã trừ lương (trước đây chưa trừ).
- **Phân quyền**: mục `mod:ke-toan` (ADMIN + MANAGER, **không** cho Cổ đông vì lộ lương từng người) + năng lực
  `accounting.pay`, `accounting.close` (ADMIN). Icon `Calculator` trong `app-shell.tsx`.
- **Xuất file**: `/ke-toan/export?format=xlsx|doc|csv` — Excel **6 sheet** (Kết quả · Thực thu · Chi theo hạng
  mục · Bảng lương · Hoa hồng CTV · Công nợ).
- **Cảnh báo lệch sổ**: nếu có phiếu lương/hoa hồng nhập tay không gắn bảng lương → banner vàng nêu số lệch.
- Migration `20260727120000_accounting`. `vitest.config.ts` thêm alias `@` (gỡ hạn chế test cũ).

## Lưu mãi/"xoay mãi" + Xem ảnh + Ảnh cận lâm sàng + Lưu trữ ở máy phòng khám (đợt trước)
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

## Tự động cập nhật phiên bản (đợt mới nhất)
- Trước đây chỉ có cập nhật THỦ CÔNG (phải bấm `Chay-Zenith.bat` hoặc `Sua-Loi.bat`). Nay thêm **`windows/Cai-Tu-Dong-Cap-Nhat.bat`** — chạy 1 lần để hẹn lịch Windows Task Scheduler (task `ZenithTuDongCapNhat`, chạy `Tu-Dong-Cap-Nhat.ps1` mỗi ngày 02:00 sáng — giờ phòng khám đóng cửa).
- **`Tu-Dong-Cap-Nhat.ps1`** (chạy ngầm, không cần ai bấm): `git fetch` rồi so `HEAD` với `origin/<branch>` — CHỈ cập nhật khi thật sự có bản mới (tránh rebuild thừa mỗi đêm). Nếu có: `reset --hard` + `docker compose build app` (có cache, nhanh hơn `Sua-Loi.bat` vì không cần `--no-cache` cho việc cập nhật định kỳ) + `up -d --force-recreate` + `migrate deploy` + kiểm tra `http://localhost:3000/login` phản hồi chưa.
- **An toàn**: nếu `docker compose build` lỗi (vd thiếu RAM), script DỪNG NGAY, KHÔNG đụng tới container đang chạy → phòng khám không bị gián đoạn dù cập nhật đêm đó thất bại.
- Ghi nhật ký mỗi lần chạy vào `%USERPROFILE%\zenith-tu-dong-cap-nhat.log` để xem lại (thành công/thất bại/không có gì mới). Tắt tính năng: mở Task Scheduler (Windows) → tìm `ZenithTuDongCapNhat` → Disable hoặc Delete.
- `Sua-Loi.bat` (thủ công, `--no-cache`, xin quyền admin có tương tác) vẫn giữ nguyên làm phương án "sửa lỗi mạnh tay" khi nghi lệch schema — khác mục đích với cập nhật tự động định kỳ này.

## Đợt nâng cấp trải nghiệm sử dụng — 02/07/2026
- **Sidebar theo nhóm công việc**: chia menu thành Hôm nay / Khách hàng / Phân tích / Vận hành / Quản trị. Mục nào không có quyền tự biến mất, tiêu đề nhóm vẫn giữ đúng thứ tự nghiệp vụ.
- **Việc cần xử lý ngay trên Tổng quan**: hiển thị tổng số việc tồn và tối đa 4 nhóm ưu tiên; bấm để mở danh sách `/viec-hom-nay`. Áp dụng cho cả dashboard quản lý và dashboard nhân viên có quyền.
- **Hồ sơ dài dễ di chuyển hơn**: thêm thanh neo cố định để nhảy nhanh tới Tổng quan, Tư vấn, Dịch vụ, Vật tư, Hình ảnh, Giấy tờ, Tài chính, Tái khám; có cuộn ngang trên điện thoại.
- **Đặt lịch công khai dễ dùng trên điện thoại**: tách ngày/giờ, thêm 8 khung giờ chọn nhanh và vẫn cho nhập giờ khác. Nội dung nói rõ đây là giờ mong muốn, trung tâm sẽ xác nhận.
- **Biểu đồ ổn định khi render máy chủ**: truyền kích thước khởi tạo cho `ResponsiveContainer`, tránh cảnh báo `width/height = -1` trước khi trình duyệt đo xong.
- Kiểm tra: TypeScript đạt, 157 test đạt, Docker production build thành công; `/dat-lich`, `/dashboard`, `/ho-so/[id]` trả HTTP 200 và có đúng nội dung mới.

## Đợt nâng cấp trải nghiệm điện thoại — 02/07/2026
- **Thanh truy cập nhanh ở đáy màn hình**: tối đa 4 mục quan trọng, tự chọn theo quyền người dùng. Nội dung trang có thêm khoảng trống đáy để thanh không che nút và dữ liệu.
- **Hồ sơ khách trên điện thoại**: bỏ bảng kéo ngang; mỗi khách là một dòng thông tin rõ tên, trạng thái, số điện thoại đã che, nguồn, lượt khám, giới tính và ngày tạo. Máy tính vẫn giữ bảng đầy đủ.
- **Lịch hẹn trên điện thoại**: mỗi lịch hiển thị giờ, khách, loại hẹn, dịch vụ, nguồn, người phụ trách và trạng thái trong một khối dọc; nút sửa/xóa và đổi trạng thái vẫn dùng được tại chỗ.
- `F:\a\Chay-Zenith.bat` đã đối chiếu SHA-256 và giống hoàn toàn `windows/Chay-Zenith.bat` trong repo. File cập nhật đúng nhánh `claude/lucid-cori-fg136w`, dựng Docker và mở `http://localhost:3000`.

## Đại phẫu: thực thu theo nhân sự · công nợ · báo cáo theo tháng · gộp menu — 03/07/2026
Chủ phản ánh nhiều vấn đề sau khi dùng thật; đã "đóng vai người dùng" trải nghiệm từng trang (chạy app thật + seed data), xác nhận từng vấn đề trước khi sửa. 4 đợt, mỗi đợt 1 commit, kiểm thử thật bằng trình duyệt (Playwright).

### 1) Thực thu theo nhân sự (khách trả nợ tháng nào tính hoa hồng tháng đó)
- **Vấn đề**: chủ tính hoa hồng theo tiền THẬT thu được; công nợ cộng dồn thì tháng sau khách trả bao nhiêu mới tính hoa hồng tháng đó — nhưng app không tách được "doanh số chốt" khỏi "tiền đã thu thật", cũng không biết nợ cộng dồn của từng người bao nhiêu.
- **Giải pháp**: `lib/collections.ts` (thuần, 7 test) gom từng khoản `Payment` trong kỳ về CẢ tư vấn viên lẫn bác sĩ của hồ sơ, tách "ca tháng này" / "thu nợ ca cũ" (hồ sơ tạo trước kỳ). Áp dụng ở `/luong` (cột Thực thu TV/BS + Nợ còn lại), `/hieu-suat` (cột tương tự + trang chi tiết liệt kê từng khoản thu trong tháng), xuất Excel/Word theo.
- Quyết định nghiệp vụ (đã hỏi chủ trước khi làm): khách trả nợ tính thực thu cho CẢ tư vấn viên và bác sĩ (không chỉ 1 bên); hoa hồng vẫn NHẬP TAY, app chỉ hiện số liệu thực thu làm căn cứ (không tự động tính % — chủ chưa muốn khai báo % từng người).

### 2) Công nợ: hẹn nợ tới ngày 31, thu nợ/tất toán ngay
- Hẹn nợ trước đây giới hạn ngày trả 1..28 (vô lý vì tháng có tới 31 ngày) → sửa `lib/debt-plan.ts` nhận **1..31**, tháng thiếu ngày tự lùi về ngày cuối tháng (`dueDateInMonth`), không nhảy nhầm sang tháng sau.
- Thêm nút "Thu nợ" ngay tại `/cong-no` (không cần mở hồ sơ) — mặc định điền đủ số nợ còn lại, bấm là "Thu đủ & tất toán"; sửa số tiền để thu một phần. Dùng lại `addPayment` (nguyên tử, có khoá hồ sơ).
- Hồ sơ có hẹn nợ mà nợ đã về 0 → thẻ hiện đúng "Đã tất toán — hoàn thành" (trước đây hiện sai "Chưa có hẹn nợ" vì điều kiện chỉ xét `debt > 0`).

### 3) Báo cáo xem được theo tháng bất kỳ + sửa lỗi đếm nguồn khách
- `getReports()`/`getMonthlyPnl()` trước đây khoá cứng "tháng hiện tại" → nhận `monthDate` tuỳ chọn, có ô chọn tháng giống Lương/Hiệu suất.
- **Bug đã sửa**: "Phân bổ nguồn khách" đếm khách TOÀN THỜI GIAN dù đang xem báo cáo 1 tháng cụ thể — giờ lọc đúng theo tháng đang xem.
- "Hiệu suất tư vấn viên" trên Báo cáo đổi sang dùng `getStaffPerformance(monthDate)` (trước đây lấy từ dashboard, luôn là tháng hiện tại dù đã chọn tháng khác). Biểu đồ "14 ngày gần nhất" tự ẩn khi xem tháng quá khứ.

### 4) Gộp menu 23 → 18 mục (ADMIN) + "Đầu ca lễ tân" đúng người dùng
- Chủ phản ánh sidebar cồng kềnh, nhiều mục tương tự nhau, và ADMIN thấy "Đầu ca lễ tân" dù không dùng tới.
- Gộp 4 nhóm trang liên quan chung 1 mục menu, điều hướng qua `<PageTabs>` (route/action/quyền riêng của từng trang GIỮ NGUYÊN — chỉ gộp trình bày): Báo cáo⟷Phân tích kinh doanh⟷Trợ lý AI, Hiệu suất nhân sự⟷Cộng tác viên, Danh mục dịch vụ⟷Kho vật tư, Chấm công⟷Lịch làm việc.
- "Đầu ca lễ tân": bớt ADMIN/MANAGER khỏi vai trò mặc định, chỉ còn RECEPTION/TELESALE (2 vai trò thật sự dùng mỗi sáng).
- Sidebar cũng đã đóng/mở theo nhóm (từ đợt trước đó cùng ngày) — 2 thay đổi cộng lại giảm đáng kể độ dài menu nhìn thấy cùng lúc.

### Kiểm thử
- `tsc --noEmit` sạch; `vitest run`: 169/169 (thêm test `collections.ts` + mở rộng test `debt-plan.ts` cho ngày 29/30/31).
- Trải nghiệm thật bằng Playwright: thu nợ 1 phần + tất toán (số liệu DB đổi đúng), chuyển tháng ở `/bao-cao` ra đúng số liệu tháng đó, chuyển qua lại đủ 4 cặp tab gộp, xác nhận lễ tân thấy "Đầu ca lễ tân" còn ADMIN thì không (và vào thẳng URL bị chặn đúng).

## Sửa 2 lỗi công nợ: thu nợ từ "Việc cần làm" + lưu ngưỡng cảnh báo — 06/07/2026
Chủ phản ánh: (1) 2 hồ sơ đã trả nợ nhưng "Việc cần làm hôm nay" vẫn báo công nợ; (2) đổi ngưỡng cảnh báo công nợ (5tr→10tr) bấm "Áp dụng" xong rời trang lại về mặc định (không lưu).

### 1) "Việc cần làm hôm nay" — thu nợ ngay tại chỗ
- Kiểm chứng lại end-to-end (Playwright + DB): nút "Thu nợ"/"Thu tiền" (đều dùng `addPayment` → `recalc`) LÀM ĐÚNG — trả đủ thì `debtAmount` về 0, hồ sơ rời khỏi Sổ công nợ và Việc cần làm. Nên việc 2 hồ sơ vẫn báo nợ là do khoản tiền được ghi ở NƠI KHÁC không chạm tới hồ sơ (nhiều khả năng ghi ở Sổ thu chi — sổ tiền mặt riêng, không trừ công nợ hồ sơ).
- Để dứt điểm: thêm nút **"Thu nợ"** thẳng trên từng dòng ở nhóm "Công nợ cần thu" của `/viec-hom-nay` (và giữ ở `/cong-no`). Bấm là thu tiền vào ĐÚNG hồ sơ → nợ về 0 → cảnh báo tự biến mất. `WorkItem` thêm trường tuỳ chọn `collect` (chỉ nhóm công nợ); dashboard `WorkSummary` chỉ dùng `count` nên không ảnh hưởng.

### 2) Ngưỡng cảnh báo công nợ — LƯU vào DB
- Trước đây ngưỡng chỉ nằm ở URL (`?threshold=`), rời trang là mất → cảm giác "không lưu". Nay lưu ở bảng cấu hình chung **`AppSetting`** (khoá `debt.threshold`), dùng chung mọi máy, giữ nguyên khi điều hướng. Migration `20260706120000_app_setting`.
- `lib/settings.ts`: `getSetting/setSetting`, `getDebtThreshold()` (mặc định 5tr). Action `saveDebtThreshold` (chặn cổ đông, ghi audit `SET_DEBT_THRESHOLD`). `/cong-no` đọc ngưỡng từ DB; thanh lọc chuyển sang client `DebtFilters` (chọn tư vấn viên điều hướng URL + ô ngưỡng lưu DB).

### 3) "Việc cần làm" không nhắc khách đang trả góp ĐÚNG hẹn
- Chủ báo tiếp: 2 khách đã trả tiền kỳ này nhưng vẫn hiện ở "Công nợ cần thu". Soi dữ liệu: đây là khách có HẸN NỢ TRẢ GÓP, đã trả kỳ này nhưng vẫn còn DƯ NỢ (kỳ sau tới 30/07…) → `debtAmount>0` nên vẫn lọt vào danh sách. Không phải lỗi thuật toán tiền (khoản thu đã ghi đúng), mà là "việc cần làm" nhắc thừa với khách đang trả góp đúng hẹn.
- Sửa `lib/workqueue.ts`: nhóm "Công nợ cần thu" nay BỎ QUA ca có hẹn nợ mà ĐÚNG hẹn (dùng `debtPlanStatus.isBehind` từ `lib/debt-plan.ts`, tính `paidSincePlan` = tiền trả kể từ khi lập kế hoạch). Chỉ nhắc ca KHÔNG có hẹn nợ, hoặc có hẹn nợ nhưng ĐANG CHẬM (kèm ghi chú "chậm hẹn X đ"). Sổ công nợ vẫn hiện đủ mọi dư nợ như cũ.
- Kiểm thử thật: ca đúng hẹn (kỳ đầu chưa tới) tự biến mất khỏi "việc cần làm"; ca chậm hẹn vẫn hiện kèm "chậm hẹn".

### Kiểm thử
- `tsc` sạch, `vitest` 169/169. Kiểm thử thật: đặt ngưỡng 10tr → rời trang → quay lại vẫn 10tr (DB `AppSetting.debt.threshold=10000000`); bấm "Thu nợ" trên Việc cần làm → hồ sơ HS00028 `debtAmount` về 0, số dòng công nợ giảm.

## Bản dùng thử mobile-first cài được trên iPhone — 06/07/2026

- **Không tách thành một app thiếu chức năng:** giữ nguyên toàn bộ route, Server Action, dữ liệu và RBAC của web; thay lớp vỏ responsive thành trải nghiệm app. Vì vậy tài khoản đăng nhập trên điện thoại thấy đúng toàn bộ chức năng được cấp quyền như trên máy tính.
- **Thanh điều hướng bằng ngón cái:** 3 module ưu tiên theo quyền + Tìm kiếm + Tất cả. “Tất cả” mở kho chức năng dạng bottom-sheet, chia nhóm và hiển thị mọi module có quyền bằng lưới biểu tượng 3 cột.
- **Cài lên iPhone:** thêm nút “Cài ứng dụng lên điện thoại” ở đăng nhập và kho chức năng; iPhone có hướng dẫn Safari → Chia sẻ → Thêm vào MH chính, các trình duyệt hỗ trợ hộp cài thì mở trực tiếp. Manifest dùng tên ngắn “Hồng Phúc”, chế độ standalone và icon sẵn có.
- **Chuẩn hoá UI mobile toàn hệ thống:** safe-area cho tai thỏ/home indicator, input 16px tránh Safari tự zoom, nút/form có vùng chạm lớn, modal và tìm kiếm thành bottom-sheet, tiêu đề/trang/hành động co giãn, card giảm padding và bảng rộng có chỉ dẫn vuốt ngang nhưng không bỏ cột/chức năng.
- **An toàn dữ liệu:** service worker đổi phiên bản cache nhưng vẫn chỉ precache icon; không cache trang/dữ liệu nghiệp vụ nhạy cảm để tránh hiện dữ liệu cũ hoặc lộ dữ liệu khi máy mất mạng.
- **Kiểm tra:** TypeScript sạch; lint các file thay đổi sạch; 169/169 test đạt. Chạy thật ở viewport iPhone 390×844: đăng nhập → dashboard dữ liệu thật, header/bottom nav/safe-area hiển thị đúng và console không có lỗi.

## Đưa Trợ lý AI ra vị trí riêng cho Cổ đông — 06/07/2026

- Nguyên nhân “mất hút”: đợt gộp menu 23→18 đã đặt `tro-ly` là `hidden: true` và chỉ để lại tab bên trong Báo cáo; chức năng/API key không hề mất.
- Trả **Trợ lý AI** thành nhóm/menu riêng trên desktop và ô riêng trong “Tất cả chức năng” trên mobile; nếu tài khoản có quyền, `/tro-ly` được ưu tiên ngay thanh điều hướng đáy để cổ đông lớn tuổi mở bằng một chạm.
- Bỏ Trợ lý AI khỏi dải tab Báo cáo để không còn hai cách tổ chức chồng chéo.
- Khôi phục ranh giới cứng: chỉ ADMIN + SHAREHOLDER truy cập; MANAGER hoặc vai trò khác vẫn bị chặn dù có `grant` nhầm. Bổ sung test cho cả quyền và mục điều hướng của Cổ đông.

## Kênh giao tiếp: Hộp thư hợp nhất Zalo OA + Facebook Messenger — 29/07/2026

Chủ yêu cầu tích hợp Zalo OA, Fanpage (Messenger), tin nhắn/cuộc gọi "mọi thứ" vào chăm sóc khách hàng — mục này trước đó (B2 bậc 2–3) đang TẠM GÁC vì chủ chỉ có Zalo cá nhân (không có API chính thức). Đã xây xong toàn bộ phần cứng cho Zalo OA + Facebook Messenger; chỉ còn thiếu chủ tự lập tài khoản/app thật rồi kết nối trong app (không cần sửa code thêm).

### 1) Vì sao KHÔNG dùng "công cụ tự động Zalo cá nhân" trên mạng
Có nhiều thư viện GitHub tự động hoá Zalo cá nhân (đăng nhập QR rồi giả lập client) — đây là **bẻ khoá trái phép**, vi phạm điều khoản Zalo, rất dễ khiến số điện thoại của chủ bị khoá vĩnh viễn. Hệ thống CHỈ tích hợp qua API CHÍNH THỨC của **Zalo Official Account** (đăng ký tại oa.zalo.me — khác Zalo cá nhân) — cảnh báo này hiện ngay đầu trang `/cham-soc/ket-noi`.

### 2) Mô hình dữ liệu mới — tách khỏi `CareMessage` cũ
`CareMessage` (nhật ký ghi tay: ghi chú/SMS/gọi điện, LUÔN gắn sẵn 1 khách) giữ nguyên không đổi. Thêm 3 model MỚI cho hội thoại 2 chiều thật: `ChannelAccount` (1 Zalo OA/1 Facebook Page đã kết nối, token mã hoá AES-256-GCM qua `lib/secret-crypto.ts` mới — cùng khoá `PHONE_ENC_KEY`, khác thuật toán chuẩn hoá phone), `Conversation` (1 luồng chat với 1 người dùng ngoài — `customerId` NULLABLE vì tin nhắn đến TRƯỚC khi biết là khách nào, gắn thủ công qua tìm theo tên/5 số cuối), `Message` (từng tin, chống ghi trùng khi webhook gửi lại qua `externalId`).

### 3) Nhận tin (webhook công khai) + gửi tin
- `POST /api/webhooks/zalo` + `POST /api/webhooks/facebook` — nằm dưới `api/` nên KHÔNG qua `proxy.ts` (matcher loại trừ "api"), TỰ kiểm chữ ký mỗi request thay vì đăng nhập: Zalo dùng header `X-ZEvent-Signature` (công thức cộng đồng `sha256(app_id+rawBody+timestamp+secretKey)` — tài liệu chính thức developers.zalo.me chặn crawler 403 nên chưa đối chiếu được bản gốc, xem cạm bẫy #18 BAN-GIAO.md); Facebook dùng `X-Hub-Signature-256` chuẩn Messenger Platform (ổn định, không cần đoán). Sai chữ ký → trả `200 {ok:false}` (không cho nền tảng retry vô hạn) nhưng TỪ CHỐI ghi dữ liệu.
- Gửi tin (`sendChannelReply`) tự làm mới access_token Zalo trước khi hết hạn (`ensureZaloAccessToken`, LƯU LẠI refresh_token mới vì Zalo xoay mỗi lần dùng); Facebook dùng Page Access Token dài hạn không cần refresh. Luôn ghi `Message` dù gửi thành công hay lỗi (status `SENT`/`FAILED` + lý do) — nhân viên thấy ngay tin gửi lỗi trong luồng chat.

### 4) Giao diện — gộp vào "Chăm sóc KH" bằng PageTabs (đúng quy ước có sẵn)
- `/cham-soc/hop-thu`: danh sách hội thoại (lọc kênh/chưa đọc/tìm theo tên-khách) + trang chi tiết từng hội thoại (bong bóng chat, gắn/bỏ gắn hồ sơ khách ngay tại chỗ, AI soạn nháp trả lời theo ngữ cảnh vài tin gần nhất, cảnh báo mềm khi ngoài khung giờ phản hồi 24h/48h — không chặn cứng vì nền tảng luôn là nguồn đúng cuối). Gộp tab với `/cham-soc` cũ (nay đổi tên "Nhật ký chăm sóc") qua `careTabs()` mới trong `nav-tabs.ts`.
- `/cham-soc/ket-noi` (module `ket-noi-kenh`, CHỈ ADMIN, nhóm "Quản trị"): kết nối Zalo OA qua OAuth thật (nút → `/api/integrations/zalo/connect` → Zalo → `/api/integrations/zalo/callback`, có state chống CSRF), kết nối Facebook bằng dán tay Page Access Token (tự nhận diện Page qua Graph API, khuyến khích lấy token qua Meta Business Suite để không hết hạn, có nút gia hạn token ngắn hạn). Có nút Kiểm tra kết nối + Ngắt/Kết nối lại (KHÔNG xoá lịch sử hội thoại) + hướng dẫn từng bước lấy App ID/Secret/token ngay trong trang.
- Trang hội thoại đã gắn khách tái dùng thẳng `ContactButtons` + `revealPhone` có sẵn (không thêm quyền mới) — vừa chat Zalo/Facebook vừa gọi/SMS tay cùng 1 chỗ.

### 5) Biến môi trường — TUỲ CHỌN, phải khai TƯỜNG MINH trong docker-compose
`ZALO_APP_ID`/`ZALO_APP_SECRET`/`ZALO_OA_SECRET_KEY`/`FB_APP_SECRET`/`FB_VERIFY_TOKEN`/`FB_APP_ID`/`FB_GRAPH_API_VERSION` — thêm vào CẢ `web/.env.example`, `.env.example` gốc, `docker-compose.yml` gốc VÀ `deploy/docker-compose.yml` (docker compose không tự truyền biến môi trường host vào container nếu không liệt kê tường minh trong khối `environment:` — bài học lặp lại từ khối AI trước đó).

### Kiểm thử
- `tsc --noEmit` sạch, `eslint` sạch trên toàn bộ file mới/sửa. Thêm test THUẦN: `secret-crypto.test.ts` (roundtrip mã hoá), `conversations.test.ts` (`withinResponseWindow`).
- Migration viết tay `20260729120000_channel_integrations` áp dụng sạch vào DB sandbox (Postgres cục bộ dựng theo mục 10 BAN-GIAO.md), `prisma migrate status` báo "up to date".
- CHƯA kiểm thử được với Zalo OA/Facebook App THẬT (chủ chưa có tài khoản) — logic OAuth/webhook dựa trên tài liệu chính thức (Facebook) + tổng hợp cộng đồng khớp nhau nhiều nguồn (Zalo, vì developers.zalo.me chặn crawler). Cần chủ lập tài khoản thật rồi kết nối thử qua `/cham-soc/ket-noi` để xác nhận lần đầu.
### Kích hoạt Meta thật — trang pháp lý bắt buộc (2026-08-01)
- Meta App `1355889016681500` đã xác minh webhook HTTPS công khai; Fanpage mục tiêu `1103352009535208` đã đăng ký `messages` và `messaging_postbacks`. Token kiểm tra có đủ `pages_show_list`, `pages_messaging` và `pages_read_engagement`; giá trị token/secret chỉ nằm ngoài Git.
- Đã thêm ba trang công khai phục vụ phát hành/App Review: `/chinh-sach-quyen-rieng`, `/dieu-khoan-su-dung`, `/xoa-du-lieu`. Nội dung nêu rõ chỉ nhận tin mới sau thời điểm kết nối, mục đích xử lý, dữ liệu Messenger, quyền xóa và kênh liên hệ bệnh viện.
- TDD trang pháp lý: quan sát RED 3/3 vì route chưa tồn tại, sau triển khai GREEN 3/3. Toàn bộ suite **76/76**, ESLint sạch; production build bằng Webpack nhận diện cả ba route là static.
- App Meta vẫn ở trạng thái chưa đăng cho tới khi các URL trên được đưa lên domain thật, điền vào `Cài đặt ứng dụng → Thông tin cơ bản`, hoàn tất xét duyệt `pages_messaging` và chuyển app sang live. Không bật live bằng URL giả hoặc khi chưa đủ hồ sơ tuân thủ.
- Ba URL pháp lý đã được deploy và lưu bền trong Meta. Khi thêm `pages_messaging` vào App Review, Meta yêu cầu xác định ứng dụng là **Tech Provider**; màn hình cảnh báo lựa chọn này không thể hoàn tác và kéo theo Xác minh doanh nghiệp, Xác minh quyền truy cập cùng bộ câu hỏi Xét duyệt ứng dụng. Chưa bấm `Continue` khi chưa có xác nhận riêng của chủ dự án. Trong thời gian chờ, kết nối thật dùng được cho tài khoản có vai trò app/test; khách đại trà chỉ hoạt động sau khi Meta phê duyệt quyền và app được phát hành.

### Tech Provider và hồ sơ App Review Meta (2026-08-01)
- Chủ dự án đã xác nhận tiếp tục; ứng dụng Meta `1355889016681500` đã được phân loại **Tech Provider**. Meta đã mở các mục Thử nghiệm, Xác minh và Xét duyệt ứng dụng; đây là thay đổi trạng thái bên Meta, không chứa hoặc làm lộ App Secret/Page token trong Git.
- Hồ sơ App Review `1355986550005080` đã được thu gọn đúng phạm vi hộp thư Facebook: giữ `pages_show_list`, `pages_manage_metadata`, `pages_messaging`, `business_management`, `pages_read_engagement`, `public_profile`; đã gỡ hai quyền WhatsApp không liên quan để tránh mở rộng phạm vi xét duyệt.
- Ứng dụng đã kết nối đúng hồ sơ doanh nghiệp `873415778937392`. Quy trình xác minh được khai báo tại Việt Nam, loại hình **Tổ chức** (bệnh viện), dùng pháp nhân công khai `CÔNG TY CỔ PHẦN BỆNH VIỆN HỒNG PHÚC`, mã số thuế `0200806774` và địa chỉ đăng ký tại số 5 Hồ Xuân Hương, Hải Phòng; các dữ liệu này được đối chiếu với văn bản công khai của Sở Y tế Hải Phòng và hồ sơ thuế, không tự suy đoán.
- Meta đã chuyển tới cổng **Giúp chúng tôi xác nhận đó là bạn**. Cần chủ tài khoản hoàn thành xác thực cá nhân trong khung Facebook (mật khẩu/2FA nếu được yêu cầu); sau đó mới tiếp tục xác nhận quan hệ với doanh nghiệp, tải giấy tờ nếu Meta không tự khớp, rồi hoàn thiện cài đặt, cách sử dụng hợp lệ, xử lý dữ liệu và hướng dẫn cho người xét duyệt.

### Gửi xác minh doanh nghiệp Meta (2026-08-01)
- Chủ tài khoản đã hoàn tất bước xác thực cá nhân và mã xác nhận do Meta gửi. Hồ sơ doanh nghiệp `873415778937392` đã được gửi thành công dưới pháp nhân **HONG PHUC HOSPITAL JOINT STOCK COMPANY**; Trung tâm bảo mật hiển thị trạng thái **Đang xem xét** và thông báo thời gian xử lý dự kiến khoảng 2 ngày làm việc.
- Hồ sơ App Review `1355986550005080` đã lưu hạng mục **Bot Messenger dành cho doanh nghiệp**, URL chính sách quyền riêng tư và người liên hệ chính. Ứng dụng chưa được gửi App Review vì Meta vẫn yêu cầu biểu tượng ứng dụng và hồ sơ doanh nghiệp phải được phê duyệt.
- Biểu tượng dự kiến là tài sản thương hiệu chính thức `hong-phuc-mark.png` kích thước 512×512 từ mã nguồn website bệnh viện. Không ghi mã OTP, số điện thoại đầy đủ, token, App Secret hoặc dữ liệu xác thực vào Git.
