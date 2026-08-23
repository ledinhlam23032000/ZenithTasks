# Project State

- Updated: 2026-08-23 GMT+7
- Goal: Vòng đời CTV–nhân viên không mất dữ liệu và có chuyển đổi hai chiều an toàn.
- Current phase: P1 audit hoàn tất, chuẩn bị P2 thiết kế/schema.
- Overall status: active
- Verified facts: Collaborator hiện chỉ có `active`; `deleteCollaborator` đang hard-delete. User có `active`/`employmentStatus`; `deleteStaff` có thể hard-delete nếu không đếm thấy lịch sử. Nhân viên bị loại khỏi list bằng role `COLLABORATOR`. Referral hiện chỉ có `CustomerSource.COLLABORATOR` và `collaboratorId`; không có profile CTV tự động cho staff.
- Decisions: Giữ `User` và `Collaborator` bằng soft archive; không cascade-delete dữ liệu nghiệp vụ. Chuyển đổi role dùng cùng `User.id`, profile CTV optional nhưng nếu cần referral phải có `Collaborator` liên kết.
- Open questions: Cần quyết định UI chi tiết cho chuyển CTV thành nhân viên và ngược lại; bản vá mặc định chỉ cho ADMIN thao tác.
- Next 3 actions: thêm trạng thái archive/suspend; thêm actions chuyển role/link profile; cập nhật UI và tests.
- Files to read first: `web/prisma/schema.prisma`, `web/src/app/(app)/cong-tac-vien/actions.ts`, `web/src/app/(app)/nhan-su/actions.ts`, `web/src/app/(app)/tiep-nhan/actions.ts`, `web/src/app/(app)/nhan-su/page.tsx`.
- Quality risks: user role và collaborator active cùng ảnh hưởng portal; phải giữ `collaboratorId`/`collaboratorAssignedAt`; không để nhân viên có profile CTV bị ẩn khỏi cả hai nơi; không thay đổi công thức hoa hồng.
