# Changelog — Tích hợp Thu chi–Đề nghị thanh toán

## 2026-08-21 — v0.1 local implementation

Đã chuyển khoản Chi vận hành sang luồng ghi một lần trong Sổ thu chi. Server action tạo PaymentRequest trạng thái `PENDING` và CashTransaction gắn `paymentRequestId` trong cùng transaction; metadata lưu hạng mục, ngày, hình thức, nhà cung cấp, ghi chú và kính gửi mặc định.

Đã bỏ checkbox “lập giấy đề nghị trước” khỏi form Thu chi. Khi nhập khoản Chi, giao diện thông báo phiếu sẽ tự tạo và liên kết. Sổ Thu chi desktop/mobile mở trực tiếp trang xem trước phiếu; mục Đề nghị thanh toán riêng được ẩn khỏi menu, còn Trung tâm chứng từ Kế toán vẫn là điểm tra cứu.

Đã thêm helper dữ liệu in, đổi số tiền VND sang chữ tiếng Việt, HTML mẫu A4 có header bệnh viện, kính gửi, người nhập, địa chỉ, lý do, số tiền, ngày lập và bốn vị trí ký. Thêm trang `[id]`, route `/print` có nút In/Lưu PDF và route `/export` tải Word dùng cùng mẫu.

Đã sửa luồng Kế toán: phiếu đã có dòng Thu chi chỉ cập nhật trạng thái `PAID`, không tạo CashTransaction thứ hai. Khi phiếu còn `PENDING`, sửa từ Thu chi đồng bộ PaymentRequest; sau `APPROVED`/`PAID` thì khóa sửa. Thêm kiểm thử helper và kiểm tra HTML in.

## Verification

TypeScript pass; ESLint các tệp thay đổi pass; Vitest 51 files/326 tests pass; Next production build pass với routes `[id]`, `[id]/print`, `[id]/export`.
