# Sources and evidence

| Mã | Nguồn | Nội dung sử dụng | Mức độ |
|---|---|---|---|
| S1 | `/home/ubuntu/upload/Đềnghịthanhtoán.pdf` | Mẫu 2 trang A4: tiêu đề, Kính gửi, Họ và Tên, Địa chỉ, Lý do, Số tiền, Bằng chữ, ngày Hải Phòng và bốn vị trí ký. | Đã xem trực quan |
| S2 | `web/prisma/schema.prisma` | `CashTransaction.paymentRequestId` và relation một-một; `PaymentRequest` có status, requester, approver, details, amount, reason, month. | Đã kiểm chứng bằng mã nguồn |
| S3 | `web/src/app/(app)/thu-chi/actions.ts` | Luồng tạo Thu chi và kiểm tra kỳ đóng sổ/audit; điểm tích hợp mới. | Đã kiểm chứng bằng mã nguồn |
| S4 | `web/src/app/(app)/ke-toan/de-nghi-thanh-toan/actions.ts` | Luồng duyệt/từ chối/ghi sổ đã có; đã bổ sung nhánh tái sử dụng CashTransaction. | Đã kiểm chứng bằng mã nguồn |
| S5 | `web/src/app/(app)/ke-toan/accounting-document-center.tsx` | Trung tâm chứng từ Kế toán để truy cập phiếu và Thu chi. | Đã kiểm chứng bằng mã nguồn |
| S6 | Kết quả lệnh `./node_modules/.bin/tsc --noEmit --pretty false` | Không có lỗi TypeScript. | Đã chạy |
| S7 | Kết quả lệnh `./node_modules/.bin/eslint <changed files>` | Không có lỗi/cảnh báo trên các tệp đã thay đổi. | Đã chạy |
| S8 | Kết quả lệnh `./node_modules/.bin/vitest run` | 51 test files, 326 tests passed. | Đã chạy |
| S9 | Kết quả lệnh `./node_modules/.bin/next build` | Production build pass; routes preview, print, export được nhận. | Đã chạy |
