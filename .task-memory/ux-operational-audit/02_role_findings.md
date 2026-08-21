# Audit sơ bộ theo vai trò

## Mức độ đánh giá

| Nhãn | Ý nghĩa |
|---|---|
| Đã xác minh | Có bằng chứng trực tiếp trong route/component/action đã đọc. |
| Cần kiểm chứng | Có dấu hiệu mạnh nhưng cần tài khoản test hoặc phỏng vấn để đo tần suất/tác động. |
| Giữ làm chuẩn | Pattern hiện tại nên nhân rộng, không nên phá khi refactor. |

## 1. Lễ tân / Telesale — đường đi của khách mới chưa phải một luồng duy nhất

**Đã xác minh — P1: Có hai cửa vào gần nhau cho cùng một nhu cầu.** Nhân sự có thể bắt đầu từ `Tiếp nhận khách`, `Lịch hẹn`, `Đầu ca`, `Việc cần làm hôm nay`, tìm kiếm toàn cục hoặc danh sách khách. Form lịch hẹn thu tên + 5 số cuối + giờ + dịch vụ, nhưng `Nguồn khách`, `Chi tiết nguồn`, người tư vấn và ghi chú lại ẩn trong `Thông tin thêm`. Form khách mới lại thu họ tên + số điện thoại đầy đủ + giới tính + ngày sinh + nguồn + chi tiết nguồn + địa chỉ + ghi chú rồi redirect thẳng sang hồ sơ. Nhân sự phải tự quyết định trước nên “lập khách”, “đặt lịch” hay “mở hồ sơ”; đây là gánh nặng phân loại công việc.

**Đã xác minh — P1: Dữ liệu CTV/nguồn còn dễ nhập sai.** Form tiếp nhận vẫn dùng input text `sourceDetail`, trong khi backend mới yêu cầu tên CTV khớp hồ sơ đã tạo. Người dùng không có combobox chọn CTV nên dễ gõ sai tên, tạo lỗi “hãy chọn đúng cộng tác viên” hoặc tạo dữ liệu legacy khó thống nhất. Cần chuyển sang chọn thực thể bằng ID, đồng thời cho phép tạo nhanh CTV nếu admin cho phép.

**Đã xác minh — P1: Xử lý trùng lịch là submit hai lần.** Khi có xung đột lịch, nút đổi từ lưu sang `Vẫn đặt lịch này`; người dùng phải đọc cảnh báo rồi bấm lại. Đây là đúng về an toàn nhưng tăng thao tác và dễ khiến lễ tân không biết lần đầu đã lưu hay chưa. Cần hiển thị danh sách xung đột ngay cạnh lịch đang chọn, cho nút “Đổi sang giờ trống gần nhất” và một xác nhận rõ ràng có tên người/khách.

**Cần kiểm chứng — P1: Tìm khách chưa chắc đủ nhanh.** Global search có tìm tên/mã/5 số cuối, nhưng chỉ tối đa 6 khách và không tìm lịch hẹn, công nợ hoặc trạng thái đến. Với lễ tân, kết quả nên trả về một “customer card” có lịch sắp tới, trạng thái hôm nay, nợ và nút hành động tiếp theo, thay vì buộc mở từng route.

## 2. Tư vấn viên / Bác sĩ / Điều dưỡng — hồ sơ điều trị quá giàu tính năng nhưng dồn quyết định

**Đã xác minh — P0/P1: Một hồ sơ điều trị chứa quá nhiều lớp nghiệp vụ.** Trang `ho-so/[id]` có tab Phối hợp DS, Tư vấn, Dịch vụ, Vật tư, Hình ảnh, Giấy tờ; cột phải luôn hiện Tài chính và Tái khám; header có in hóa đơn, sửa ngày, xóa hồ sơ, khóa hồ sơ. Trong tab Tư vấn lại có CaseInfoForm, phiếu tư vấn điện tử, sinh hiệu, checklist tiền sử và chỉ định. Người dùng phải hiểu cả clinical, kho, ảnh, chứng từ, phân bổ doanh thu, thanh toán và follow-up trên cùng một case.

**Đã xác minh — P1: Dịch vụ và vật tư đang tách thành hai thao tác dù có quan hệ BOM.** Thêm dịch vụ xong có thể phải bấm tiếp `Trừ VT` theo định mức; bảng dịch vụ còn có sửa, xóa và trạng thái đã trừ vật tư. Nếu mục tiêu là giải phóng sức lao động, default nên tự áp BOM trong cùng transaction và chỉ đưa nút “điều chỉnh vật tư” khi có ngoại lệ, thay vì biến bước hệ thống thành việc người dùng phải nhớ.

**Đã xác minh — P1: Tài chính nằm cố định cạnh clinical nhưng không theo vai trò.** Cột phải luôn có tổng, thanh toán, QR, voucher, lịch sử thu và kế hoạch nợ. Bác sĩ/tư vấn nhìn thấy quá nhiều thông tin tài chính không cần dùng; kế toán lại phải đi vào case để hiểu thanh toán. Nên có chế độ workspace theo vai trò: clinical ưu tiên tư vấn/dịch vụ/ảnh; lễ tân ưu tiên lịch/đến/thu; kế toán ưu tiên thanh toán/chứng từ.

**Đã xác minh — P1: Khóa hồ sơ là quyết định lớn nhưng đặt chung với các hành động thường.** Header có xóa, in, sửa ngày và khóa; banner giải thích nhưng thao tác khóa có thể ảnh hưởng tất cả nhân sự. Cần thêm checklist trước khóa: dịch vụ đủ, thanh toán đối soát, vật tư đã ghi, ảnh/tài liệu đã lưu, follow-up đã đặt; sau đó cho thấy rõ ai khóa và cách yêu cầu mở lại.

**Cần kiểm chứng — P0: Dữ liệu y khoa và tài chính có thể bị che khuất bởi tab.** Audit cần test với một ca thật/ca mẫu để xem nhân sự có bỏ qua cảnh báo y khoa, phiếu đồng ý hoặc khoản nợ vì chúng nằm ở tab/cột khác hay không. Đây là rủi ro không nên chỉ giải quyết bằng đổi màu UI.

## 3. Chăm sóc khách hàng — inbox chưa phải one-screen resolution

**Đã xác minh — P1: Một hội thoại chưa gắn hồ sơ buộc CSKH thực hiện chuỗi phụ.** Trang hội thoại có thread/composer ở cột chính, còn hồ sơ khách, kênh, phân công/SLA và khối “Gắn hồ sơ khách” nằm ở sidebar. Để xử lý khách mới, nhân sự phải tìm theo tên/5 số cuối, chọn kết quả, gắn, phân công, đổi trạng thái và sau đó mới trả lời. Các hành động nằm ở nhiều block và trạng thái sau submit cần được hiểu bằng mắt.

**Đã xác minh — P1: Phân công và SLA là form riêng, dễ lưu thiếu.** `assignedToId` và `status` được lưu cùng nút `Lưu phân công`, nhưng deadline SLA chỉ hiển thị sau đó. Nên tự phân công theo kênh/ca/queue, tự chuyển trạng thái khi gửi trả lời và hiển thị “việc tiếp theo” ngay trên thread.

**Đã xác minh — P2: Cảnh báo ngoài khung phản hồi chưa biến thành hành động thay thế.** Hệ thống nói có thể thử gửi nhưng nền tảng có thể từ chối. Nên có nút chuyển sang cuộc gọi/ghi chú nội bộ/tạo follow-up hoặc tạo task, thay vì chỉ cảnh báo.

## 4. Kế toán / Người xử lý thanh toán — nhiều bước xác nhận và mất vị trí

**Đã xác minh — P1: PaymentRequest có modal-heavy workflow và reload toàn trang.** Tạo thủ công mở modal; duyệt/từ chối/thanh toán mở modal hoặc inline action; sau mutation dùng `window.location.reload()`. Reload làm mất vị trí scroll, bộ lọc và ngữ cảnh dòng đang xử lý. Cần optimistic/update tại chỗ, giữ query/filter, chuyển dòng sang trạng thái mới ngay và chỉ báo lỗi tại dòng.

**Đã xác minh — P1: Form tạo đề nghị yêu cầu người dùng phân loại quá sớm.** Người dùng phải chọn type, month, payee, amount, category, note và reason. Có thể tự suy type/category từ mẫu chi hoặc người nhận, để người dùng chỉ bổ sung trường thiếu; với lương/hoa hồng nên tạo trực tiếp từ bảng lương/CTV thay vì nhập tên và tiền lại.

**Cần kiểm chứng — P1: Thu tiền hiện nằm trong case và work queue, còn chứng từ nằm ở kế toán.** Cần đo xem nhân sự có phải mở case → mở payment modal → sang kế toán → kiểm tra request hay không. Nếu có, nên có “payment rail” dùng chung và mã chứng từ click-through hai chiều.

## 5. Quản trị viên — nhiều quyền nhưng công cụ quản trị mang tính kỹ thuật

**Đã xác minh — P1: Phân quyền bằng kéo thả hai cột không nói rõ tác động nghiệp vụ.** Modal hiển thị module/capability dưới dạng danh sách kỹ thuật, mỗi quyền chỉ có nhãn; admin phải biết `mod:*`, capability và quan hệ mặc định/grant/deny. Không có preset theo chức danh, không có preview “nhân sự này sẽ nhìn thấy gì”, không có cảnh báo khi quyền mở dữ liệu nhạy cảm.

**Đã xác minh — P1: Nhân sự có nhiều hành động ngang hàng trong một bảng.** Mỗi dòng có sửa hồ sơ, phân quyền, tắt 2FA, reset mật khẩu, khóa/mở, nghỉ việc, khôi phục, xóa. Mật độ hành động cao và xóa nằm cùng vùng với thao tác thường. Nên chuyển sang trang chi tiết nhân sự có nhóm “Hồ sơ”, “Quyền”, “Vòng đời”, “Bảo mật”, đặt hành động nguy hiểm vào menu riêng và yêu cầu lý do/audit rõ hơn.

**Đã xác minh — P1: Nhân sự và CTV đã tách module nhưng chưa tách hoàn toàn cách làm việc.** CTV page vẫn là bảng hiệu suất theo range, CTV cũ có thể hiện “Chưa đăng ký”, còn portal CTV là route khác. Admin muốn xử lý một CTV phải chuyển giữa hiệu suất, hồ sơ và tài khoản; nên có một profile CTV hợp nhất gồm thông tin, khách, hoa hồng, tài khoản, lịch sử đồng bộ và trạng thái.

## 6. Cộng tác viên — cổng mới đúng quyền nhưng cần giảm tra cứu

**Đã xác minh — P1: CTV chỉ xem được khách theo phạm vi nhưng chưa có “next action”.** Portal có số khách, tổng hoa hồng, đã chi, danh sách khách và lịch sử payout. Người dùng vẫn phải mở từng khách để biết khách đang ở bước nào; nên thêm trạng thái hồ sơ, lịch hẹn gần nhất, công nợ/đã thanh toán nếu chính sách cho phép và nút liên hệ/follow-up phù hợp.

**Đã xác minh — P1: Quy tắc 6 tháng cần hiển thị cụ thể.** Portal nói sau 6 tháng khách tự chuyển khỏi danh sách, nhưng chưa cho người dùng biết ngày hết phạm vi trên từng dòng. Nên có cột “Còn thuộc phạm vi đến”, bộ lọc “sắp hết hạn”, và giải thích rõ khách đã ẩn vẫn có thể còn trong lịch sử hoa hồng.

## 7. Toàn hệ thống — tìm kiếm, điều hướng và trạng thái

**Đã xác minh — P0/P1: Global search bỏ sót các đối tượng nghiệp vụ quan trọng.** Không tìm Appointment, PaymentRequest, User, Collaborator, công nợ, hoa hồng hoặc mã chứng từ; mỗi bucket giới hạn 6. Tên ô tìm kiếm hứa “khách hàng, hồ sơ, vật tư, menu” nhưng người dùng vận hành cần tìm theo mã phiếu, nhân sự, lịch hẹn và CTV. Cần mở rộng index/search contract theo vai trò và hiển thị loại đối tượng + trạng thái + hành động.

**Cần kiểm chứng — P1: Menu gộp tab và module hidden làm tăng trí nhớ phải có.** `ho-so`, `hộp thư`, `kho`, `đề nghị thanh toán`, `lịch làm việc` và `phân tích` không luôn xuất hiện như module độc lập. Người mới sẽ cần hỏi người khác “chức năng này ở đâu”. Cần dùng alias/shortcut theo nhiệm vụ và search command có thể gợi ý route ngay cả khi module bị gộp.

**Giữ làm chuẩn — Work queue và đầu ca.** `Việc cần làm hôm nay` gom nhóm theo trạng thái, có anchor count và thao tác inline thu nợ/xác nhận đã đến. `Đầu ca` gom khách chưa đến/đang chờ/tồn đọng và auto-refresh. Đây là pattern nên nhân rộng sang CSKH, lịch hẹn và chứng từ.
