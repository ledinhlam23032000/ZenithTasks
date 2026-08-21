# Quyết định

## D1 — Sổ Thu chi là nguồn nhập liệu duy nhất cho khoản chi vận hành
Khi `type=EXPENSE`, `createCashTransaction` tạo `PaymentRequest` và `CashTransaction` trong cùng một Prisma transaction. CashTransaction giữ `paymentRequestId`; PaymentRequest giữ metadata nguồn `THU_CHI`. Lý do: loại bỏ nhập lại và bảo đảm rollback đồng thời nếu một bước lỗi.

## D2 — Khoản chi được ghi vào sổ ngay, phiếu vẫn chờ duyệt
Yêu cầu người dùng mô tả giao dịch mua phát sinh phải xuất phiếu ngay. Vì vậy dòng chi được ghi ngay cùng phiếu ở trạng thái `PENDING`; Kế toán/ADMIN duyệt và xác nhận trạng thái chứng từ, không tạo thêm dòng chi. Các phiếu tạo thủ công từ Kế toán không có cash row vẫn giữ luồng cũ: chỉ tạo dòng chi khi đánh dấu đã thanh toán.

## D3 — Số tiền bằng chữ tạo tự động phía server
Dùng helper thuần `amountInVietnameseWords` để bản xem trước/Word/in có cùng một giá trị, không placeholder và không phụ thuộc trình duyệt.

## D4 — In bằng HTML A4, Lưu PDF qua trình duyệt
Không thêm thư viện PDF nặng vào production. Trang xem trước có nút `Mở bản in`; route `/print` trả HTML có CSS `@page A4`, nút `In / Lưu PDF`, hỗ trợ ký tay sau khi in. Route `/export` vẫn tải `.doc` tương thích Word.

## D5 — Giữ menu Kế toán, ẩn menu chứng từ riêng
Mục Đề nghị thanh toán được đánh dấu hidden trong navigation để người dùng chính đi từ Thu chi; route và Trung tâm chứng từ Kế toán vẫn tồn tại cho tra cứu, duyệt và in.

## D6 — Khóa sau duyệt/thanh toán, đồng bộ trước duyệt
Dòng đã liên kết được sửa từ Thu chi khi PaymentRequest còn `PENDING`; thay đổi đồng bộ sang request. Khi `APPROVED` hoặc `PAID`, sửa bị chặn để bảo toàn chứng từ. Xóa linked cash row vẫn bị chặn.
