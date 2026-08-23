# Project State

- Updated: 2026-08-23 GMT+7
- Goal: Vòng đời CTV–nhân viên không mất dữ liệu và có chuyển đổi hai chiều an toàn.
- Current phase: P6 bàn giao hoàn tất.
- Overall status: completed
- Verified facts: Collaborator có trạng thái active/suspended/archived; không còn hard-delete User/Collaborator trong mã nguồn ứng dụng. Referral mới chỉ nhận profile active và chưa archived. Chuyển role dùng cùng `User.id`, profile Collaborator được tái sử dụng theo userId hoặc tên legacy.
- Decisions: Giữ `User` và `Collaborator` bằng soft archive; không cascade-delete dữ liệu nghiệp vụ. Chuyển đổi role có audit/StaffRoleHistory, do ADMIN thao tác, và không tính lại tiền/hoa hồng.
- Open questions: Migration `20260823133000_collaborator_lifecycle` chưa chạy production; cần backup, `prisma migrate deploy` và smoke test sau khi cập nhật Windows.
- Next 3 actions: chạy migration production; smoke test suspend/archive/restore và hai chiều conversion; xác nhận referral của nhân viên tạo đúng collaboratorId.
- Files to read first: `web/prisma/schema.prisma`, `web/src/app/(app)/cong-tac-vien/actions.ts`, `web/src/app/(app)/nhan-su/actions.ts`, `web/src/app/(app)/tiep-nhan/actions.ts`, `web/src/app/(app)/nhan-su/page.tsx`.
- Quality risks: user role và collaborator active cùng ảnh hưởng portal; phải giữ `collaboratorId`/`collaboratorAssignedAt`; không để nhân viên có profile CTV bị ẩn khỏi cả hai nơi; không thay đổi công thức hoa hồng.
