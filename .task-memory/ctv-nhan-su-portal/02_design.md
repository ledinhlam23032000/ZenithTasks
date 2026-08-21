# Thiết kế — Nhân sự, CTV và cổng CTV

## 1. Mô hình định danh

`Collaborator` tiếp tục là hồ sơ đối tác nhưng được liên kết 1–1 với `User` qua `userId` nullable để hỗ trợ migrate dữ liệu cũ trước, sau đó admin có thể tạo tài khoản. `Customer`, `Lead` và `Appointment` thêm `collaboratorId` nullable. Các bản ghi cũ được backfill theo `sourceDetail` khi khớp duy nhất với `Collaborator.name`; trường `sourceDetail` vẫn giữ làm snapshot hiển thị tương thích, nhưng các truy vấn mới dùng `collaboratorId`.

`CaseRecord` thêm `collaboratorId` nullable để giữ ownership theo hồ sơ tại thời điểm tạo/tiếp nhận. `CommissionPayout` thêm `collaboratorId` nullable và unique theo `(collaboratorId, month)` cho dữ liệu mới; `name` vẫn giữ snapshot kế toán. `PaymentRequest` thêm `payeeCollaboratorId` nullable để liên kết chứng từ, nhưng `payeeName` vẫn là snapshot không tự đổi sau khi đã chốt.

## 2. CTV cũ và đồng bộ

Khi admin đổi tên/điện thoại/ngân hàng của `Collaborator`, dữ liệu live hiển thị lấy từ `Collaborator`; các bản ghi nghiệp vụ chỉ cần backfill `sourceDetail`/snapshot ở transaction. Không cập nhật số tiền, tỷ lệ hoặc `commissionAmount`. Các payout/chứng từ đã chốt giữ `name` snapshot kế toán; giao diện hồ sơ/hiệu suất dùng quan hệ CTV để hiển thị tên hiện tại.

Nếu dữ liệu cũ có nhiều CTV trùng `name`, migration không tự đoán; tạo report/flag để admin xử lý, không gán sai khách.

## 3. Mốc chuyển quyền sau 6 tháng

Mặc định dùng `Customer.createdAt` làm mốc `collaboratorAssignedAt` khi backfill. Thêm `collaboratorAssignedAt` trên Customer và CaseRecord để từ nay không phụ thuộc ngày đổi tên hay ngày cập nhật hồ sơ. CTV chỉ thấy khách/case khi `collaboratorId = CTV.id` và `collaboratorAssignedAt >= now - 6 months`; lịch sử hoa hồng và payout vẫn hiển thị theo dữ liệu của CTV, không bị xóa.

## 4. Role và quyền

Thêm enum `Role.COLLABORATOR`. Role này không nằm trong nhóm nhân sự nội bộ và không được grant quyền bằng cách cho vào `ALL` mặc định. CTV chỉ có module `mod:cong-tac-vien-cua-toi` và `mod:khach-hang` dạng đọc; không có `mod:ho-so`, `mod:nhan-su`, `mod:luong`, `mod:cong-tac-vien` quản trị hay năng lực ghi. CTV không có quyền `phone.full`; mọi số điện thoại dùng `phoneLast5`.

Server-side access helper kiểm tra `User.role === COLLABORATOR`, tìm `Collaborator.userId`, kiểm tra `Collaborator.active`, `collaboratorId` và cửa sổ 6 tháng. Không dựa vào menu hoặc URL để bảo vệ.

## 5. Nhân sự nghỉ việc và thăng chức

Thêm `employmentStatus` (ACTIVE/RETIRED) và `retiredAt`/`retiredById` trên User. `active` vẫn là cờ khóa đăng nhập kỹ thuật. Chuyển nghỉ việc trong transaction: status RETIRED, active=false, ghi audit. Khu vực Nhân sự có tab Đang làm/Đã nghỉ; tài khoản retired không qua `getCurrentUser` và không thể đọc route.

Thăng chức cập nhật `role`, `position`, `department`, `permissions` trên cùng userId và thêm `StaffRoleHistory` (fromRole/toRole, snapshot chức danh/phòng, changedBy, changedAt, note). Không đổi userId, username, lịch sử nghiệp vụ hay số liệu cũ.

## 6. Đường đi giao diện

Quản trị: `/nhan-su` hiển thị hai tab nhân sự đang làm/đã nghỉ; `/cong-tac-vien` được đưa vào nhóm Quản trị và dùng cho hồ sơ/tài khoản CTV. CTV đăng nhập sẽ vào `/cong-tac-vien-cua-toi`, gồm danh sách khách còn trong cửa sổ 6 tháng và tổng hoa hồng/payout của mình; nhấn khách mở hồ sơ đọc đầy đủ nhưng không có nút ghi.

## 7. Migration và kiểm thử

Migration SQL additive có backfill an toàn, không `db push`, không reset. Test bắt buộc: role catalog; retired login denial; promotion same userId; rename keeps money; legacy name backfill; CTV scope/6-month; masked phone; payout relation; customer detail direct URL denial. Chạy Prisma generate, TypeScript, Vitest và build.
