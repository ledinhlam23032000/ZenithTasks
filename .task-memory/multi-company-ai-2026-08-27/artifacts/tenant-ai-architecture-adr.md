# ADR-001 — Tenant, Account và AI phân cấp

**Trạng thái:** proposed for implementation  
**Ngày:** 2026-08-27 GMT+7  
**Baseline:** `origin/master` `ab86fdc`

## Quyết định

ZenithTasks dùng mô hình **control plane + tenant workspace** trong cùng ứng dụng. `ZProject` là tenant/company; `User` là identity cấp hệ thống; `ZProjectMember` là quan hệ cấp quyền vào company; `ZProjectAssignment` là phân công vị trí/nghiệp vụ trong company. Mọi domain record project-local phải liên kết trực tiếp hoặc gián tiếp không thể mơ hồ về `projectId`.

Mỗi company có đúng một **AI con logic** trong control plane. AI con không phải tài khoản admin và không có quyền vượt user/membership. Nó có profile, trạng thái, model policy, system prompt version, knowledge sources, tool allowlist, usage limit và audit riêng theo `projectId`. Mọi request của AI con đều mang `workspaceKind=PROJECT`, `projectId`, `agentId`, `actorUserId`, purpose và capability snapshot.

Hệ thống có một **AI Tổng logic** ở `workspaceKind=GLOBAL`. AI Tổng được xem aggregate cross-company và trạng thái AI con theo allowlist; có thể gửi một control message hoặc proposal tới AI con khi target company được nêu rõ. AI Tổng không được tự lấy raw data tenant nếu chưa có target/capability/purpose, không được tự đổi role/permission, xóa cứng, deploy, quyết định y khoa hoặc ghi tiền/lương.

## Luồng tài khoản và nhân viên

Một user có thể thuộc nhiều company. Khi đăng nhập, hệ thống không tự trộn dữ liệu; người dùng chọn một active company context. Company Admin/Global Admin mời hoặc tạo membership; employee profile/position/assignment được giữ theo company. Revoke membership có hiệu lực ngay ở server, giữ lịch sử và không xóa User identity.

## Luồng AI

| Luồng | Context | Dữ liệu được phép | Ghi dữ liệu |
|---|---|---|---|
| AI con công ty A | PROJECT + A | Domain records của A, knowledge của A, audit của A | Draft/preview trước; approval theo capability của người gọi |
| AI con công ty B | PROJECT + B | Domain records của B, knowledge của B, audit của B | Không đọc A hoặc Internal |
| AI Tổng | GLOBAL | Aggregate bounded, health/policy/usage/audit summary của các AI con | Tạo proposal/control job có target; không bypass policy |
| AI Tổng → AI con A | GLOBAL parent + explicit target A | Chỉ payload tối thiểu và kết quả có trace | AI con vẫn kiểm tra lại policy; failure/timeout không partial apply |

## Decision matrix

| Rủi ro | Chính sách |
|---|---|
| Read tenant thường | Cho phép nếu membership/capability/context đúng |
| Read medical/payroll/PII | Purpose + field mask + confirmation/audit |
| Ghi nghiệp vụ | Preview → approval → transaction → audit |
| Đổi quyền/đuổi người/xóa | L5, hai người duyệt, backup/rollback; hard-delete mặc định tắt |
| Migration/deploy | Owner gate, backup, additive migration, health check |

## Không chọn

Không tạo user table riêng cho từng company; không coi `User.role` toàn cục là đủ cho company authorization; không dùng prompt hoặc system message như security boundary; không cho AI Tổng trở thành superuser; không hard-delete company khi chưa có restore drill.

## Tiêu chí chấp thuận

ADR này chỉ được chuyển `accepted` sau khi owner xác nhận các câu hỏi Q-01→Q-08 trong `05_open_questions.md`, hoặc chấp nhận các mặc định an toàn nêu trên. Code task chỉ mở khi có schema/access test tương ứng.
