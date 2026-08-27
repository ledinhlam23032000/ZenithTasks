# Decisions — Multi-company + AI phân cấp

## D-01 — Identity cấp hệ thống, quyền cấp company

`User` là identity duy nhất của hệ thống. Một user có thể là nhân viên của một hoặc nhiều company qua membership; `role/capability` của membership được kiểm tra theo project context. Không tạo bảng user song song cho từng company.

## D-02 — Tenant boundary là server-side

Mọi page/action/query/export/AI tool nhận project context đã được server xác minh từ session + membership. Không tin `projectId` từ form, URL hoặc prompt. Missing, stale, archived, revoked hoặc foreign project phải fail closed trước khi query domain records.

## D-03 — AI con không phải superuser

AI con có `projectId`, profile, prompt, knowledge, model policy và tool allowlist riêng. Nó kế thừa capability của người gọi và không được đọc Internal/company khác, không được tự đổi quyền, deploy, hard-delete, quyết định y khoa hoặc ghi tiền/lương không qua approval.

## D-04 — AI Tổng là control-plane có giới hạn

AI Tổng có Global context và các aggregate được whitelist; được xem health, policy, usage, audit summary của AI con theo quyền Admin. Nếu điều phối AI con, target phải explicit, trace được child/source/result, có timeout/idempotency và không truyền dữ liệu thừa. AI Tổng không được biến thành đường vòng để đọc raw tenant data hoặc bypass child RBAC.

## D-05 — Company lifecycle ưu tiên archive

Tạo mới ở DRAFT; chỉ ACTIVE mới nhận nghiệp vụ. ARCHIVED/DEACTIVATED không nhận ghi mới nhưng dữ liệu giữ để audit/restore. “Xóa” trên UI ban đầu là archive/soft-delete, preview dependency và restore; hard-delete chỉ là quy trình R3 riêng, cần owner + backup + rollback drill.

## D-06 — Employee separation

Nhân sự có thể dùng cùng User identity nhưng mỗi company có profile/position/membership riêng. Không dùng một `User.role` toàn cục để suy ra quyền company nếu membership không xác nhận.

## D-07 — Không mở rộng nghiệp vụ trước isolation

Không thêm payroll payout, AI tool write, permission editor hoặc delete thật trước khi MC-04/MC-05 có synthetic isolation evidence. Không trộn thay đổi money/permissions/schema/delete vào một PR không cùng risk scope.

## D-08 — Canonical uncertainty

Workbook `ZENITH_PLAN_DUY_NHAT_2026.xlsx` chưa có trong sandbox. Kế hoạch Workspace V4 trong repo là nguồn tham chiếu tạm thời; mọi task mới phải gắn crosswalk và giữ trạng thái `review` cho tới khi workbook/owner decision được phục hồi.

## D-09 — Additive AI hierarchy migration, archive-safe

Migration `20260827190000_ai_agent_hierarchy` chỉ thêm enum/table/agentId/index/foreign key cho AI hierarchy. Constraint `ZAiAgent_scope_check` buộc CHILD có `projectId` và GLOBAL không có `projectId`; partial unique indexes bảo đảm tối đa một CHILD ACTIVE mỗi project và một GLOBAL ACTIVE toàn hệ thống, trong khi vẫn giữ lịch sử DRAFT/SUSPENDED/ARCHIVED. Migration chưa được apply trên clinic; chỉ được apply trên QA cô lập sau review và backup gate.
