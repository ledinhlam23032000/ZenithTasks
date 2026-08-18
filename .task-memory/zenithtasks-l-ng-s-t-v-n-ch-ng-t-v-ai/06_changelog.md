# Changelog nhiệm vụ

- 2026-08-17T17:32:52.524945+00:00: initialized task memory workspace.

## 2026-08-18 — Khởi tạo và chốt quy tắc

Đã đọc bốn tài liệu anh gửi về cơ chế lương, sổ tư vấn, bảo mật và không cạnh tranh. Đã ghi nhận quy tắc hoa hồng theo tiền thực thu, sổ tư vấn chỉnh sửa 24 giờ và AI phải có approval.

## 2026-08-18 — Schema/migration nền

Đã thêm model `PaymentRequest`, `ConsultationRecord`, `StaffAgreement`, `AssistantFile`, `AssistantFeedback`, các enum liên quan và `PayrollEntry.commissionOverride`. Đã tạo migration additive `20260818100000_finance_consultation_hr_ai/migration.sql`.

Trong quá trình validate, phát hiện quan hệ PaymentRequest bị thiếu tên hai chiều và một lần chèn nhầm đoạn schema; đã sửa lại, sau đó `npx prisma validate` đạt.

## 2026-08-18 — Lương theo thực thu

Đã viết lại `commission-data.ts` để lấy `Payment` theo `paidAt`, phân bổ theo `CaseRevenueAllocation` khi có, fallback theo vai trò cũ, phân bổ tiền cho dòng dịch vụ, và tính phí điều dưỡng một lần cho mỗi hồ sơ có thực thu trong tháng. Đã cập nhật `payroll.ts`, actions và UI để tách hoa hồng tự động khỏi phần điều chỉnh.

## Kiểm tra đã đạt

- `npx prisma validate`: đạt.
- `npx prisma generate`: đạt.
- `./node_modules/.bin/tsc --noEmit`: đạt sau các chỉnh sửa hiện tại.

## Việc chưa hoàn tất

PaymentRequest UI/export, sổ tư vấn UI/print/actions, StaffAgreement UI, AI file/feedback/voice, test nghiệp vụ sâu, build, migration staging/production, cập nhật docs và máy Windows.


## 2026-08-18 — Ghi nhận workstream bắt buộc AI ADMIN và trung tâm chứng từ

Anh Lam xác nhận Trợ lý AI mặc định phải hiểu đầy đủ cơ chế vận hành của hệ thống và có thể tra cứu dữ liệu nghiệp vụ cần thiết theo quyền ADMIN để hỗ trợ như một trợ lý quản trị thực thụ. Yêu cầu này được đưa thành workstream W1 bắt buộc, không được quên khi chuyển sang phần kế toán.

Đồng thời ghi nhận workstream W2/W3: mọi khoản chi, kể cả gói tăm 3.000đ, có thể lập Đề nghị thanh toán; sau duyệt và thanh toán chỉ tạo đúng một dòng Thu–chi liên kết; khu vực Kế toán trở thành trung tâm xem và in Đề nghị thanh toán, bảng lương, phiếu thu/chi và file xuất theo tháng/trạng thái.

Checkpoint đã cập nhật tại `02_state.md`, kế hoạch chi tiết tại `01_plan.md`, brief tại `00_brief.md` và quyết định tại `03_decisions.md`. Trạng thái vẫn `active`; chưa đánh dấu hoàn tất khi chưa có code và bằng chứng kiểm thử.


## 2026-08-18 — Release r4 AI Admin Gateway trên production

Đã push code release `efce179` và tài liệu release `4089825`. Trên máy Windows đã tạo backup `F:\6.Sao lưu hệ thống\zenith-2026-08-18_1901.zip` dung lượng 299.196.021 bytes, đồng bộ repo lên `4089825`, build image mới `sha256:b2e76120668593cacef58773e8cd6e3dc3bb2c92be0a129b714ed30d8dba2481`, recreate app và giữ database container healthy.

Migration `20260818120000_ai_admin_gateway` đã được Prisma áp dụng thành công lúc `2026-08-18 12:21:44 UTC`; `prisma migrate status` báo 49 migrations và schema up to date. Login endpoint trả HTTP 200.

Kiểm tra bằng phiên ADMIN tại `/tro-ly`: AI nhận đúng lệnh chấm công Đào Ngọc Trang từ 02/08 đến 18/08/2026, 08:00–17:00, đủ 17 ngày; tạo preview rõ ràng và chưa ghi Attendance vì chưa bấm xác nhận. Browser extension bị timeout khi thử nút Hủy; không kết luận thao tác Hủy đã chạy. Cần kiểm tra lại approval PENDING hoặc chờ hết hạn trước khi test ghi thật.