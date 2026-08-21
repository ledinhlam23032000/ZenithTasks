# Backlog ưu tiên nâng cấp UX và giải phóng sức lao động

## Nguyên tắc ưu tiên

P0 là vấn đề có thể gây sai hồ sơ y tế, sai tiền, lộ dữ liệu hoặc khiến một nhiệm vụ cốt lõi bị chặn. P1 là vấn đề lặp lại hàng ngày, làm mất nhiều thời gian hoặc tạo chuyển ngữ cảnh không cần thiết. P2 là vấn đề làm giảm khả năng tìm hiểu, theo dõi hoặc quản trị nhưng chưa chặn nghiệp vụ. P3 là cải thiện thẩm mỹ/tiện nghi sau khi các luồng cốt lõi đã gọn.

## Top 10 việc nên làm trước

| Ưu tiên | Việc cần làm | Người hưởng lợi | Tác động | Độ khó |
|---|---|---|---|---|
| P0 | Tạo **Customer 360 / Next Action rail**: trên mọi điểm tìm khách hiển thị trạng thái hôm nay, lịch gần nhất, hồ sơ, công nợ, CTV, người phụ trách và nút tiếp theo | Lễ tân, tư vấn, CSKH, kế toán | Giảm mở nhiều route và giảm bỏ sót | L |
| P0 | Tự động kiểm tra trước khi khóa hồ sơ: dịch vụ, vật tư/BOM, thanh toán, cảnh báo y khoa, phiếu đồng ý và follow-up | Tư vấn, bác sĩ, admin | Giảm chốt thiếu dữ liệu hoặc không thể sửa sai | M |
| P0 | Mở rộng global search sang lịch hẹn, chứng từ, nhân sự, CTV, công nợ và mã hoa hồng; kết quả có trạng thái + hành động | Tất cả vai trò | Biến Ctrl/Cmd+K thành công cụ tra cứu thật | M |
| P1 | Hợp nhất `Tiếp nhận khách` + `Lịch hẹn` thành một **Reception Flow**: tìm khách → khách mới/cũ → đặt lịch → phân công → mở hồ sơ | Lễ tân/telesale | Bỏ quyết định “vào màn nào trước” | L |
| P1 | Thay `sourceDetail` text bằng combobox CTV/chiến dịch có ID, cảnh báo trùng và tạo nhanh | Lễ tân, admin, CTV | Chấm dứt lỗi gõ tên CTV và dữ liệu phân mảnh | M |
| P1 | Tự động áp BOM vật tư khi thêm dịch vụ; chỉ mở chỉnh vật tư khi có ngoại lệ | Bác sĩ, điều dưỡng, kho | Giảm một thao tác lặp trên mỗi dịch vụ | M |
| P1 | PaymentRequest cập nhật tại dòng, giữ filter/scroll, không `window.location.reload()`; tạo đề nghị từ nguồn gốc lương/CTV/chi phí | Kế toán, admin | Giảm mất vị trí và nhập lại | M |
| P1 | Hộp thư có action rail: gắn khách, phân công, SLA, trạng thái, follow-up/call task nằm cạnh thread và tự chuyển trạng thái khi gửi | CSKH | Tăng tỷ lệ xử lý một lần | L |
| P1 | Tách workspace hồ sơ theo vai trò: clinical, lễ tân/thu tiền, kế toán; không bắt mọi vai trò nhìn toàn bộ tab/cột | Tư vấn, bác sĩ, lễ tân, kế toán | Giảm quá tải thông tin và nhầm thao tác | L |
| P1 | Nhân sự/CTV có trang profile hợp nhất, preset quyền theo chức danh, preview quyền và nhóm hành động nguy hiểm | Admin | Giảm quản trị mang tính kỹ thuật | M |

## Backlog chi tiết theo nhóm

### A. Reception Flow — tiếp nhận một lần, không nhập lại

1. Thay hai CTA “Tạo hồ sơ khách mới” và “Lưu lịch hẹn” bằng một flow có bước đầu tiên là **Tìm khách** theo tên/mã/5 số cuối.
2. Nếu tìm thấy khách, hiển thị Customer 360 mini-card với lịch sắp tới, trạng thái đến hôm nay, hồ sơ mở gần nhất, công nợ và nút `Đặt lịch`, `Mở hồ sơ`, `Ghi đến`.
3. Nếu không tìm thấy, cho tạo khách mới ngay trong cùng flow; sau khi lưu, giữ lại ngày giờ và dịch vụ đã nhập để chuyển thẳng sang đặt lịch, không bắt nhập lại.
4. Tách trường bắt buộc tối thiểu khỏi thông tin bổ sung bằng logic nghiệp vụ: tên + phương thức tra cứu + mục đích tiếp nhận trước; ngày sinh/địa chỉ/nguồn/ghi chú thu sau hoặc nhắc theo checklist.
5. Khi nguồn là CTV, dùng combobox theo `collaboratorId`; khi nguồn là chiến dịch, dùng danh mục chiến dịch; không cho lưu CTV bằng text không khớp.
6. Khi xung đột lịch, hiển thị các lịch trùng theo nhân sự/phòng/khách, đề xuất 3 thời điểm trống gần nhất và cho phép xác nhận override một lần trong cùng hộp thoại.
7. Sau khi hoàn tất, hiển thị một màn hình “Đã tiếp nhận” với 3 nút rõ ràng: `Gọi khách`, `Mở hồ sơ`, `Đặt lịch tiếp theo`.

**Tiêu chí nghiệm thu:** một khách cũ có thể được tìm, đặt lịch và mở hồ sơ mà không nhập lại tên/số/nguồn; khách mới chỉ nhập số điện thoại một lần; CTV được chọn bằng tên hiển thị nhưng lưu ID; conflict có ngữ cảnh đủ để quyết định mà không cần quay lại lịch.

### B. Customer 360 và Next Action

1. Chuẩn hóa một component dùng chung cho search result, danh sách khách, dashboard, lịch hẹn, work queue, inbox và portal CTV.
2. Mỗi kết quả hiển thị: tên, mã, 5 số cuối, trạng thái hồ sơ, lịch gần nhất, nợ, CTV/người phụ trách và tuổi dữ liệu.
3. Gắn một nhãn hành động ưu tiên như `Chưa đến`, `Đang tư vấn`, `Còn nợ`, `Cần follow-up`, `Chưa gắn CTV`, `Cần đối soát`.
4. Cho phép action trực tiếp theo quyền: `Ghi đến`, `Mở hồ sơ`, `Thu nợ`, `Ghi chăm sóc`, `Đặt lịch`, `Gắn hội thoại`.
5. Giữ nguyên audit và server-side permission; UI chỉ hiển thị action khi server cho phép.

### C. Hồ sơ điều trị theo workspace

1. Tách phần header thành trạng thái + cảnh báo + next action; đưa `Xóa hồ sơ` vào menu nguy hiểm riêng.
2. Tạo tab/section preset theo vai trò: clinical không mở mặc định finance rail; lễ tân mở finance + lịch; kế toán mở finance + chứng từ; admin có chế độ toàn cảnh.
3. Gộp thao tác thêm dịch vụ + áp BOM + chọn người thực hiện vào một modal có preview tổng tiền và vật tư sẽ trừ.
4. Thêm checklist trước khóa và chỉ cho khóa khi lỗi blocking đã được xử lý hoặc admin xác nhận ngoại lệ có lý do.
5. Trên mỗi tab hiển thị badge trạng thái cần làm, ví dụ `Tư vấn 2 mục thiếu`, `Dịch vụ 1 dòng chưa trừ VT`, `Tài chính còn nợ`, `Tái khám chưa đặt`.
6. Cho phép chuyển từ tab này sang tab khác bằng next action, không bắt người dùng tự nhớ phải kiểm tra phần nào.
7. Thêm “activity log” ngắn cho case: ai sửa gì, lúc nào, lý do; giữ timeline dài cho audit nhưng không dùng timeline thay cho trạng thái hành động.

### D. Tài chính và kế toán

1. Dùng một state machine hiển thị rõ `Nháp → Chờ duyệt → Đã duyệt → Đã chi / Từ chối`, cùng người thực hiện và thời gian.
2. Thay reload toàn trang bằng revalidate/refresh vùng bảng; giữ page, filter, month, sort và scroll.
3. Khi tạo từ lương/CTV/chi phí, tự điền loại, tháng, người nhận, số tiền và hạng mục; người dùng chỉ xác nhận/bổ sung lý do.
4. Hiển thị liên kết hai chiều giữa PaymentRequest, CashTransaction, PayrollEntry, CommissionPayout và hồ sơ gốc.
5. Cho phép xử lý hàng loạt các phiếu cùng trạng thái với review summary trước khi commit; vẫn audit từng phiếu.
6. Trên case, dùng cùng payment rail với kế toán để tránh người thu tiền và người chốt sổ nhìn hai phiên bản trạng thái.

### E. CSKH và inbox

1. Sau khi gắn khách, tự tải Customer 360 mini-card ngay trong thread; không bắt mở route mới để xem lịch/công nợ/hồ sơ.
2. Cho phép “gửi và chuyển trạng thái” trong một lần: gửi tin → tự ghi thời điểm phản hồi → chuyển `IN_PROGRESS` hoặc `DONE` theo lựa chọn.
3. Tự phân công theo kênh/ca/queue, chỉ cho override khi cần; hiển thị lý do SLA quá hạn.
4. Khi ngoài khung phản hồi, đưa action thay thế: tạo task gọi, ghi chú nội bộ, tạo follow-up hoặc chuyển người phụ trách.
5. Lưu draft trả lời theo từng hội thoại và cảnh báo khi rời trang có nội dung chưa gửi.
6. Tạo bộ lọc “cần gắn khách”, “SLA sắp quá hạn”, “không có người phụ trách”, “khách đã có nợ” và “chờ khách trả lời”.

### F. Nhân sự và CTV

1. Trang nhân sự dùng profile workspace với 4 tab: Hồ sơ, Quyền, Vòng đời, Bảo mật; bảng chỉ giữ các action thường dùng.
2. Thêm preset quyền `Lễ tân`, `Tư vấn`, `Bác sĩ`, `CSKH`, `Kế toán`, `Quản lý`; admin có thể xem phần khác biệt so với preset.
3. Trước khi nghỉ việc, hiển thị checklist: khóa phiên đăng nhập, chuyển khách/lịch/hội thoại, xử lý ca đang mở, bàn giao tài sản/quyền; sau đó mới xác nhận.
4. Khi thăng chức, cho chọn chức danh mới + preset quyền + ngày hiệu lực + ghi chú; hiển thị diff quyền trước khi lưu.
5. Profile CTV hợp nhất hồ sơ, tài khoản, khách, hoa hồng, tháng gần nhất, ngày hết phạm vi 6 tháng và lịch sử đổi tên.
6. Trong danh sách CTV, lọc nhanh `Chưa đăng ký`, `Đang hoạt động`, `Sắp hết phạm vi`, `Có hoa hồng chưa chi`, `Có dữ liệu tên cần rà soát`.

### G. Search, menu và mobile

1. Mở rộng search contract: Customer, Case, Appointment, FollowUp, PaymentRequest, CashTransaction, User, Collaborator, Plan, Material, Service và mã chứng từ.
2. Search result phải trả `entityType`, `status`, `subtitle`, `nextAction`, `permissionScope`; không chỉ trả title/href.
3. Tăng giới hạn kết quả theo bucket hoặc thêm pagination/“xem tất cả”; ưu tiên exact code/phone last5 trước fuzzy name.
4. Hiển thị alias nhiệm vụ: “đề nghị thanh toán” tìm thấy cả Kế toán; “CTV” tìm thấy Cộng tác viên; “lịch tái khám” tìm thấy Lịch hẹn và hồ sơ.
5. Mobile bottom bar nên tùy biến theo workload trong ngày, không chỉ theo role; vẫn giữ một shortcut cố định cho `Việc cần làm` hoặc `Tìm khách`.
6. Khi một module bị hidden/gộp tab, search result phải nói rõ đường đi: `Chăm sóc → Hộp thư`, `Kế toán → Đề nghị thanh toán`, `Khách hàng → Hồ sơ điều trị`.

## Cơ hội tự động hóa

| Cơ hội | Trigger | Hệ thống làm | Người duyệt/ngoại lệ |
|---|---|---|---|
| Tự tạo next action sau tiếp nhận | Khách mới hoặc khách cũ đặt lịch | Tạo task/gợi ý lịch, gắn người phụ trách, hiện ở đầu ca | Lễ tân chỉnh nếu khách yêu cầu |
| Tự áp BOM | Thêm dịch vụ vào case | Trừ vật tư theo định mức, ghi audit, cảnh báo thiếu kho | Điều dưỡng sửa ngoại lệ |
| Tự phân công inbox | Hội thoại mới | Chọn queue theo kênh/ca/tải hiện tại | Admin override |
| Tự nhắc SLA | Sắp quá hạn | Push/in-app task cho người phụ trách và quản lý | Người phụ trách snooze có lý do |
| Tự tạo đề nghị chi | Payroll/CommissionPayout/CashTransaction đủ dữ liệu | Dựng request nháp, điền type/month/payee/amount | Admin duyệt |
| Tự kiểm tra trước khóa | User bấm khóa case | Chạy checklist blocking/warning | Admin override warning có lý do |
| Tự gợi ý thời gian lịch | Xung đột lịch | Đề xuất slot trống gần nhất theo người/phòng/dịch vụ | Lễ tân xác nhận |
| Tự phát hiện dữ liệu CTV lỗi | Source CTV không match ID hoặc tên gần giống | Đưa vào hàng chờ rà soát, không tự gán mù | Admin xác nhận |
| Tự tạo follow-up | Case hoàn tất dịch vụ | Gợi ý lịch chăm sóc theo dịch vụ/BS | Nhân sự điều chỉnh |
| Tự nhắc công nợ | Nợ đến hạn/quá hạn | Đưa vào work queue + gợi ý kịch bản liên hệ | CSKH/lễ tân thực hiện |

## Lộ trình đề xuất

### 0–2 tuần: Quick wins

Mở rộng alias/search cho các module bị hidden; bỏ reload toàn trang ở PaymentRequest; thêm ngày hết phạm vi 6 tháng trong portal CTV; thêm badge next action ở Customer 360; đổi sourceDetail CTV sang combobox; thêm cảnh báo before-lock đơn giản; tách action nguy hiểm trong bảng nhân sự.

### 2–6 tuần: Nâng cấp luồng

Xây Reception Flow; xây Customer 360 mini-card dùng chung; tự áp BOM; payment rail hai chiều; action rail cho inbox; preset quyền và promotion diff; lọc CTV theo trạng thái và dữ liệu lỗi.

### 6–12 tuần: Nền tảng tự động hóa

Xây task/queue engine theo sự kiện; phân công inbox theo tải; state machine chứng từ dùng chung; checklist khóa hồ sơ có override/audit; workflow follow-up theo dịch vụ; đo thời gian và số bước trước/sau bằng event telemetry không chứa dữ liệu nhạy cảm.

## Tiêu chí đo sau triển khai

Đo median số bước hoàn tất một khách mới có lịch; thời gian tìm khách và mở đúng hồ sơ; tỷ lệ lịch bị nhập trùng/xung đột; số lần mở route để thu một khoản; thời gian xử lý PaymentRequest; tỷ lệ hội thoại được gắn khách trong lần đầu; tỷ lệ case khóa nhưng thiếu checklist; số lỗi CTV không match; và số thao tác/giờ của từng vai trò. Chỉ coi một nâng cấp thành công khi giảm friction mà không làm tăng lỗi tiền, lỗi hồ sơ y tế hoặc vi phạm quyền.
