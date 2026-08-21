# Product map — khảo sát phase 1

## Nguồn và phạm vi

Audit đang đọc mã nguồn trên `master` hiện tại của repository ZenithTasks. Đây là audit tĩnh, không ghi dữ liệu, không chạy migration và không đánh giá chất lượng UI bằng cảm nhận hình ảnh nếu chưa có browser evidence.

| Lớp | Nguồn sự thật | Nhận xét |
|---|---|---|
| Điều hướng | `web/src/lib/permissions.ts`, `web/src/components/layout/app-shell.tsx` | Menu sinh theo module + role; group có thể thu gọn; mobile có bottom bar 3 route + Tìm kiếm + Tất cả. |
| Tìm kiếm | `web/src/components/layout/command-palette.tsx`, `web/src/lib/search-actions.ts` | Ctrl/Cmd+K; tìm khách, hồ sơ, vật tư, kế hoạch; mỗi bucket tối đa 6 kết quả. |
| Trang mặc định | `web/src/lib/role-home.ts` | Role được đưa vào workspace khác nhau; CTV vào cổng riêng. |
| Quyền | `web/src/lib/permissions.ts`, `web/src/lib/auth.ts` | Module gate và capability; một số hard barrier cho CTV/cổ đông/kế hoạch/AI. |
| Tiếp nhận/lịch | `tiep-nhan`, `lich-hen`, `dau-ca`, `viec-hom-nay` | Có nhiều điểm vào khác nhau cho khách, lịch và việc hôm nay. |
| Hồ sơ | `khach-hang`, `ho-so` | Hồ sơ khách, hồ sơ điều trị và lịch hẹn liên kết nhưng người dùng vẫn phải chuyển route. |
| Tài chính | `ke-toan`, `de-nghi-thanh-toan`, `thu-chi`, `luong` | Nhiều trạng thái và chứng từ liên quan, cần audit transition. |
| Nhân sự/CTV | `nhan-su`, `cong-tac-vien`, `cong-tac-vien-cua-toi` | Có mô hình ID CTV mới, retirement và promotion history. |

## Bằng chứng đã xác minh

### EVID-UX-001 — Menu nhiều tầng và route ẩn

`MODULES` chia thành 6 nhóm (`Hôm nay`, `Khách hàng`, `Phân tích`, `Trợ Lý`, `Vận hành`, `Quản trị`). Sidebar desktop cho phép thu gọn group và lưu trạng thái vào localStorage. Một số module bị `hidden: true` rồi gộp qua tab hoặc chỉ đi qua quyền, ví dụ `ho-so`, `cham-soc-hop-thu`, `phan-tich`, `de-nghi-thanh-toan`, `kho`, `lich-lam-viec`. Điều này giúp menu bớt dài nhưng tạo rủi ro người dùng biết chức năng tồn tại mà không biết đường vào.

### EVID-UX-002 — Mobile có ba lớp điều hướng

Mobile dùng bottom bar 3 shortcut theo role, nút `Tìm kiếm` và nút `Tất cả`; nút `Tất cả` mở drawer nhóm toàn bộ module; drawer lại có ô tìm kiếm mở command palette. Người dùng có thể cần biết mình đang ở shortcut, drawer hay command palette trước khi tìm một chức năng. Đây là dấu hiệu cần kiểm tra bằng walkthrough trên điện thoại.

### EVID-UX-003 — Global search chưa phải trung tâm tra cứu toàn hệ thống

Command palette quảng bá tìm khách hàng, hồ sơ, vật tư, menu nhưng server action chỉ tìm 4 nhóm: Customer, CaseRecord, Material và Plan. Không tìm được Appointment, PaymentRequest, User/nhân sự, Collaborator, công nợ, hoa hồng hoặc mã chứng từ. Mỗi nhóm chỉ lấy 6 dòng. Đây là vấn đề rõ ràng nếu nhân sự dùng Ctrl/Cmd+K như công cụ tra cứu chính.

### EVID-UX-004 — Lịch hẹn có hai tầng thông tin và đường xử lý xung đột riêng

Form lịch hẹn yêu cầu tên, 5 số cuối, ngày giờ; dịch vụ quan tâm; nguồn, chi tiết nguồn, người tư vấn và ghi chú lại nằm trong khối `Thông tin thêm`. Khi phát hiện trùng lịch, nút submit đổi thành `Vẫn đặt lịch này` và người dùng phải hiểu cảnh báo rồi submit lần hai. Cấu trúc này bảo vệ dữ liệu nhưng tạo friction cho lễ tân ở thao tác tần suất cao.

### EVID-UX-005 — Đề nghị thanh toán nhiều modal và reload toàn trang

Tạo đề nghị thanh toán mở modal, sau đó duyệt/từ chối/thanh toán lại mở modal hoặc action inline; callback dùng `window.location.reload()`. Form yêu cầu phân loại loại khoản chi, tháng, người nhận, số tiền, hạng mục, ghi chú và lý do. Chưa kết luận đây là sai nghiệp vụ, nhưng rõ ràng có cơ hội gom ngữ cảnh và cập nhật tại chỗ thay vì làm người dùng mất vị trí trong bảng.

## Điểm tốt cần giữ làm chuẩn

`viec-hom-nay` và `dau-ca` là các pattern tốt để đối chiếu: chúng gom việc theo trạng thái thực tế, có thao tác inline và đưa thông tin chờ/đến hạn lên một mặt. Audit cần tìm cách đưa các module nhiều bước về cùng mô hình “một hàng — một trạng thái — một thao tác tiếp theo” thay vì chỉ thêm menu hoặc modal.

## Nhận định tạm thời, chưa phải kết luận cuối

Ứng dụng đang mạnh về phân quyền server-side, audit và bao phủ nghiệp vụ, nhưng nguy cơ chính là **phân mảnh điểm vào**: cùng một đối tượng công việc có thể xuất hiện ở dashboard, việc hôm nay, lịch hẹn, hồ sơ khách, hồ sơ điều trị, chăm sóc hoặc tài chính. Phần tiếp theo phải đo xem nhân sự có phải mở nhiều route để hoàn thành một việc hay không, và đề xuất một “next best action” theo từng vai trò.
