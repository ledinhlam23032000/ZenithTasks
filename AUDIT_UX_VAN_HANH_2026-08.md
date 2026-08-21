# Audit UX và giải phóng sức lao động — ZenithTasks

> **Kết luận thẳng:** Ứng dụng không thiếu nghiệp vụ; vấn đề chính là **quá nhiều nghiệp vụ cùng tồn tại nhưng chưa được đóng gói thành luồng công việc ngắn**. Người dùng đang phải nhớ chức năng nằm ở module nào, hồ sơ nào chứa thao tác nào và trạng thái nào cần cập nhật sau mỗi bước. Vì vậy phần mềm có thể “đủ tính năng” nhưng vẫn khiến nhân sự mệt, hỏi nhau nhiều và dễ bỏ sót.

## 1. Tóm tắt điều hành

Audit tĩnh trên mã nguồn master cho thấy ba điểm nghẽn lớn. Thứ nhất là **phân mảnh điểm vào**: một việc của khách có thể bắt đầu từ Tiếp nhận, Lịch hẹn, Đầu ca, Việc cần làm hôm nay, Global Search, Hồ sơ khách hoặc Hồ sơ điều trị. Thứ hai là **hồ sơ điều trị quá dày**: clinical, kho, ảnh, giấy tờ, tài chính, thanh toán, tái khám và phân bổ doanh số cùng xuất hiện trong một case. Thứ ba là **nhiều action đã làm đúng nghiệp vụ nhưng chưa làm đúng nhịp làm việc**: modal nối modal, submit lại khi xung đột, reload toàn trang sau khi duyệt chứng từ, nhập lại dữ liệu giữa các module và chọn quyền bằng thuật ngữ kỹ thuật.

Điểm đáng giữ là `Việc cần làm hôm nay` và `Đầu ca`: hai khu vực này đã gần với mô hình vận hành tốt vì gom việc theo trạng thái, có số lượng, có hành động inline và giảm việc mở nhiều trang. Hướng nâng cấp nên lấy hai pattern này làm chuẩn, sau đó đưa Customer 360, Next Action, queue và state machine sang các luồng tiếp nhận, CSKH, kế toán và hồ sơ điều trị.

## 2. Top vấn đề cần xử lý

| Ưu tiên | Vấn đề | Vì sao nghiêm trọng | Việc nên làm |
|---|---|---|---|
| P0 | Hồ sơ điều trị dồn clinical, tài chính, kho, ảnh, giấy tờ và tái khám | Dễ bỏ sót cảnh báo y khoa, chứng từ hoặc trạng thái khóa | Tạo workspace theo vai trò + checklist trước khóa + next action |
| P0 | Global Search không tìm lịch, chứng từ, nhân sự, CTV, công nợ, hoa hồng | Nhân sự tưởng tìm toàn hệ thống nhưng vẫn phải biết route thủ công | Mở rộng search contract theo entity/status/action |
| P1 | Tiếp nhận và lịch hẹn là hai flow rời | Nhân sự phải tự chọn cửa vào và có thể nhập lại thông tin | Hợp nhất thành Reception Flow tìm khách trước |
| P1 | CTV vẫn nhập bằng text ở form nguồn khách | Dễ sai tên, lỗi đồng bộ và tạo dữ liệu không chuẩn | Combobox theo `collaboratorId`, cảnh báo trùng, tạo nhanh có kiểm soát |
| P1 | Thêm dịch vụ và trừ vật tư là hai bước | Tạo việc nhớ thủ công trên mỗi dịch vụ | Tự áp BOM, chỉ mở chỉnh vật tư khi ngoại lệ |
| P1 | PaymentRequest reload toàn trang sau action | Mất filter, scroll, ngữ cảnh và chậm xử lý hàng loạt | Cập nhật tại dòng, giữ state bảng |
| P1 | Inbox tách thread, gắn khách, phân công và SLA | CSKH phải chuyển ngữ cảnh và dễ quên bước | Action rail + tự chuyển trạng thái + task thay thế |
| P1 | Quản trị quyền bằng kéo thả key kỹ thuật | Admin khó biết tác động thực tế của quyền | Preset chức danh + preview quyền + cảnh báo dữ liệu nhạy cảm |
| P1 | Bảng nhân sự có quá nhiều action ngang hàng | Khóa, nghỉ việc, reset, 2FA, xóa dễ bị nhầm | Profile workspace; action nguy hiểm vào menu riêng |
| P1 | CTV portal chưa có ngày hết phạm vi và next action | CTV khó biết khách nào sắp chuyển về trung tâm | Hiển thị ngày hết hạn, lọc sắp hết hạn, trạng thái khách |

## 3. Đánh giá theo vai trò

### Lễ tân / Telesale

Điểm khó nhất là phải quyết định nên vào **Tiếp nhận khách**, **Lịch hẹn**, **Đầu ca**, **Việc hôm nay** hay **Tìm kiếm**. Form lịch hẹn còn giấu nguồn khách, CTV, người tư vấn và ghi chú trong `Thông tin thêm`; form khách mới lại có luồng khác và redirect sang hồ sơ. Đề xuất quan trọng nhất là bắt đầu bằng tìm khách, sau đó chọn khách cũ/khách mới, đặt lịch, phân công và mở hồ sơ trong cùng flow.

Cần thay `sourceDetail` bằng combobox CTV/chiến dịch. Khi trùng lịch, phải hiển thị ai đang bận, xung đột ở đâu và slot trống gần nhất; không chỉ đổi nút thành “Vẫn đặt lịch này”.

### Tư vấn viên / Bác sĩ / Điều dưỡng

Hồ sơ điều trị hiện rất mạnh nhưng quá dày. Tab Tư vấn có phiếu điện tử, sinh hiệu, checklist và chỉ định; tab Dịch vụ có giá, giảm, BOM; tab Vật tư có nhập/sửa/xóa; cột phải có tài chính, QR, thanh toán, voucher, nợ, lịch sử thu và tái khám. Đây là “trung tâm dữ liệu” tốt nhưng chưa phải “trung tâm quyết định”.

Cần tách chế độ hiển thị theo vai trò, tự áp BOM khi thêm dịch vụ, thêm badge việc còn thiếu ở từng tab và checklist trước khi khóa. Hành động xóa nên tách khỏi nhóm thao tác thường.

### Chăm sóc khách hàng

Hộp thư đã có thread, customer link, phân công và SLA nhưng chưa phải one-screen resolution. Với hội thoại chưa gắn khách, CSKH phải tìm khách, gắn, phân công, đổi trạng thái rồi mới trả lời. Cần action rail cạnh thread, tự chuyển trạng thái sau khi gửi, tự phân công theo queue và nút thay thế khi ngoài khung phản hồi như tạo task gọi hoặc follow-up.

### Kế toán

PaymentRequest đang là luồng nhiều modal và reload toàn trang. Tạo phiếu yêu cầu nhiều phân loại; duyệt, từ chối, thanh toán là các trạng thái đúng nhưng nhịp thao tác chưa gọn. Nên tạo request trực tiếp từ bảng lương/CTV/chi phí để tự điền người nhận, tháng, loại và số tiền; người dùng chỉ kiểm tra và bổ sung lý do. Bảng cần cập nhật tại chỗ và giữ nguyên bộ lọc.

### Quản trị viên

Admin có quá nhiều quyền nhưng công cụ lại mang tính kỹ thuật. Modal phân quyền chỉ cho thấy danh sách module/capability và kéo thả giữa hai cột, chưa trả lời câu hỏi “nhân sự này thực tế sẽ nhìn thấy và làm được gì”. Cần preset theo chức danh, diff quyền trước/sau, preview navigation và cảnh báo khi bật quyền nhạy cảm.

Bảng nhân sự đang đặt sửa hồ sơ, phân quyền, tắt 2FA, reset mật khẩu, khóa, nghỉ việc, khôi phục và xóa trên cùng một hàng. Nên chuyển sang profile nhân sự có các tab Hồ sơ, Quyền, Vòng đời và Bảo mật; xóa/khóa tài khoản phải nằm trong khu vực nguy hiểm riêng.

### Cộng tác viên

Cổng CTV đã đúng hướng bảo mật và phạm vi, nhưng vẫn thiên về báo cáo hơn là công việc. CTV cần thấy khách nào sắp có lịch, khách nào đang ở bước nào, khách nào sắp hết 6 tháng và hoa hồng nào chưa chi. Mỗi dòng nên có ngày hết phạm vi và next action, không chỉ tên khách và ngày phụ trách.

## 4. Danh sách tự động hóa nên làm

1. **Customer 360:** mỗi kết quả tìm khách phải có trạng thái hôm nay, lịch gần nhất, công nợ, CTV, người phụ trách và nút tiếp theo.
2. **Reception Flow:** tìm khách trước, tạo khách mới hoặc chọn khách cũ, giữ dữ liệu đã nhập khi chuyển sang đặt lịch.
3. **Tự áp BOM:** thêm dịch vụ tự trừ vật tư theo định mức; chỉ yêu cầu người dùng xử lý ngoại lệ.
4. **Tự phân công inbox:** gán theo kênh, ca và tải hiện tại; cho admin override.
5. **Tự nhắc SLA:** cảnh báo sắp quá hạn, tạo task và hiển thị người chịu trách nhiệm.
6. **Tự dựng PaymentRequest:** sinh request nháp từ PayrollEntry, CommissionPayout hoặc CashTransaction đủ dữ liệu.
7. **Checklist trước khóa hồ sơ:** chặn hoặc cảnh báo thiếu dịch vụ, vật tư, thanh toán, phiếu đồng ý, cảnh báo y khoa và follow-up.
8. **Gợi ý slot lịch:** khi trùng lịch, đề xuất thời gian trống gần nhất theo người, phòng và loại dịch vụ.
9. **Hàng chờ dữ liệu CTV lỗi:** gom source CTV không match hoặc tên gần giống để admin xác nhận, tuyệt đối không tự gán mù.
10. **Tự tạo follow-up:** sau khi hoàn tất dịch vụ, gợi ý lịch chăm sóc theo dịch vụ và chỉ định.

## 5. Thứ tự triển khai đề xuất

### 0–2 tuần: quick wins

Mở rộng alias và entity cho Global Search; bỏ `window.location.reload()` ở PaymentRequest; hiển thị ngày hết phạm vi CTV; đổi nguồn CTV sang combobox; thêm badge next action ở Customer 360; tách action nguy hiểm ở Nhân sự; thêm checklist cảnh báo trước khóa hồ sơ.

### 2–6 tuần: nâng cấp luồng

Xây Reception Flow, Customer 360 dùng chung, payment rail hai chiều, action rail cho inbox, preset quyền theo chức danh, promotion diff và tự áp BOM.

### 6–12 tuần: nền tảng tự động hóa

Xây task/queue engine theo sự kiện, phân công inbox theo tải, state machine chứng từ, checklist khóa hồ sơ có override/audit, follow-up theo dịch vụ và telemetry đo số bước/thời gian mà không lưu thêm dữ liệu nhạy cảm.

## 6. Tiêu chí nghiệm thu nên đo

Đo median số bước để tiếp nhận một khách có lịch; thời gian tìm đúng hồ sơ; số lần nhập lại tên/số/nguồn; tỷ lệ lịch xung đột; thời gian xử lý một PaymentRequest; tỷ lệ hội thoại được gắn khách ngay lần đầu; số case khóa thiếu checklist; số CTV không match; và số route phải mở để hoàn thành một việc. Nâng cấp chỉ được coi là thành công khi giảm thời gian và bước thao tác mà không làm tăng lỗi tiền, lỗi hồ sơ y tế, lỗi định danh CTV hoặc vi phạm phân quyền.

## 7. Phạm vi chưa thể xác minh

Audit hiện là audit tĩnh trên mã nguồn, chưa có đo đạc bằng tài khoản nhân sự thật, chưa có quan sát trực tiếp tại quầy, chưa có log thời gian thao tác và chưa chạy production. Vì vậy các mục P0/P1 cần được kiểm chứng bằng 15–30 phút phỏng vấn hoặc shadowing cho từng nhóm vai trò trước khi ước lượng chính thức.

## Tài liệu chi tiết

- [Bản đồ sản phẩm và bằng chứng phase 1](.task-memory/ux-operational-audit/01_product_map.md)
- [Phát hiện theo vai trò](.task-memory/ux-operational-audit/02_role_findings.md)
- [Backlog và cơ hội tự động hóa](.task-memory/ux-operational-audit/03_prioritized_backlog.md)

## References

[1]: https://github.com/ledinhlam23032000/ZenithTasks/blob/master/web/src/components/layout/app-shell.tsx "App shell và điều hướng"
[2]: https://github.com/ledinhlam23032000/ZenithTasks/blob/master/web/src/lib/search-actions.ts "Global search server action"
[3]: https://github.com/ledinhlam23032000/ZenithTasks/blob/master/web/src/app/(app)/ho-so/%5Bid%5D/page.tsx "Hồ sơ điều trị"
[4]: https://github.com/ledinhlam23032000/ZenithTasks/blob/master/web/src/app/(app)/lich-hen/new-appointment.tsx "Form lịch hẹn"
[5]: https://github.com/ledinhlam23032000/ZenithTasks/blob/master/web/src/app/(app)/ke-toan/de-nghi-thanh-toan/request-forms.tsx "Form đề nghị thanh toán"
[6]: https://github.com/ledinhlam23032000/ZenithTasks/blob/master/web/src/app/(app)/cham-soc/hop-thu/%5Bid%5D/page.tsx "Hội thoại CSKH"
[7]: https://github.com/ledinhlam23032000/ZenithTasks/blob/master/web/src/app/(app)/nhan-su/permission-editor.tsx "Modal phân quyền"
