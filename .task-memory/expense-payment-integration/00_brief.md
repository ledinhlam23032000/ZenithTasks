# Brief — Tích hợp Thu chi với Giấy đề nghị thanh toán

## Mục tiêu
Khi nhân viên nhập một khoản **Chi** trong Sổ thu chi, hệ thống tạo ngay một **PaymentRequest** liên kết cùng khoản chi, tự điền các trường của mẫu Giấy đề nghị thanh toán và đưa chứng từ sang phân hệ Kế toán. Không được yêu cầu người dùng nhập lại cùng một thông tin ở màn hình Đề nghị thanh toán.

## Quy tắc nghiệp vụ đã xác nhận

| Quy tắc | Cách hiểu triển khai |
|---|---|
| Kính gửi | Tự động điền “Ban lãnh đạo Bệnh viện” theo yêu cầu người dùng. |
| Họ và tên | Lấy từ tài khoản của người nhập (`requester.fullName`). |
| Khoản chi | Lấy từ ngày, hạng mục, số tiền, hình thức, nhà cung cấp và ghi chú của giao dịch Thu chi. |
| Liên kết kế toán | Một giao dịch chi có thể mở tới đúng một chứng từ; Kế toán xem, duyệt, từ chối và cập nhật trạng thái từ danh sách kế toán. |
| In ký | Có trang xem trước theo mẫu PDF đã gửi, nút in trình duyệt / Lưu PDF và tải Word tương thích; bố cục có đủ các vị trí ký. |
| Đồng bộ | Chứng từ và sổ Thu chi phải có liên kết hai chiều, không tạo dữ liệu nhập lặp. |
| An toàn | Giữ kiểm soát quyền, audit, kỳ kế toán đã chốt và không làm lệch các luồng lương/hoa hồng hiện có. |

## Phạm vi dự kiến
Sửa schema/metadata nếu cần, action tạo khoản chi, giao diện form và bảng Thu chi, trang danh sách Kế toán, route xem/in và route tải tài liệu, helper đổi số tiền sang chữ, kiểm thử unit/integration/build.

## Ngoài phạm vi hiện tại
Ký điện tử, gửi email tự động, OCR hóa đơn đầu vào, tích hợp chữ ký số hoặc phát hành hóa đơn VAT điện tử. Các phần này có thể mở rộng sau khi quy trình in–ký tay ổn định.

## Tiêu chí thành công
1. Nhập một khoản chi một lần tạo được giao dịch và phiếu liên kết.
2. Phiếu hiển thị đúng người nhập, kính gửi, lý do, số tiền bằng số/chữ, ngày tháng và các cột ký.
3. Từ Thu chi mở được xem trước/in; từ Kế toán mở được cùng chứng từ và truy ngược về dòng Thu chi.
4. Chạy được `pnpm exec prisma generate`, `pnpm exec tsc --noEmit`, `pnpm test` và `pnpm build` trong thư mục `web`.
