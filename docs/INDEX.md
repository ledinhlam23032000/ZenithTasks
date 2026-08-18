# Bộ tài liệu tiếp quản ZenithTasks

> **Sản phẩm:** Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc
> **Mục đích:** giúp người hoặc AI mới tiếp quản hiểu đúng sản phẩm, mã nguồn, nghiệp vụ, production và các giới hạn an toàn trước khi thay đổi bất kỳ điều gì.

## Quy tắc nguồn sự thật

Mã nguồn, Prisma schema và migration trên nhánh `master` là nguồn thực thi. Tài liệu mô tả trạng thái và quy trình nhưng không được dùng để thay thế việc kiểm tra mã nguồn khi hai bên mâu thuẫn. Nếu phát hiện mâu thuẫn, dừng thay đổi, xác minh bằng mã nguồn/database rồi cập nhật tài liệu trong cùng release.

| Loại thông tin | File chuẩn | Cách sử dụng |
|---|---|---|
| Phiên bản, commit, migration, kiểm tra gần nhất | [`../VERSION.md`](../VERSION.md) | Đọc đầu tiên để biết bản nào là chuẩn. |
| Lịch sử thay đổi | [`../CHANGELOG.md`](../CHANGELOG.md) | Đọc các release mới nhất trước khi sửa. |
| Kiến trúc và nghiệp vụ chi tiết | [`../web/BAN-GIAO.md`](../web/BAN-GIAO.md) | Tài liệu nền tảng của thư mục `web/`. |
| Lịch sử nâng cấp và bàn giao | [`../UPGRADE-HANDOFF-2026-08.md`](../UPGRADE-HANDOFF-2026-08.md) | Đọc để hiểu quyết định của chủ dự án và bằng chứng production. |
| Trạng thái nhiệm vụ dài | [`../.task-memory/zenithtasks-l-ng-s-t-v-n-ch-ng-t-v-ai/02_state.md`](../.task-memory/zenithtasks-l-ng-s-t-v-n-ch-ng-t-v-ai/02_state.md) | Đọc để khôi phục công việc chưa hoàn tất. |
| Kiểm chứng production | [`../checks/2026-08-18-r7-ai-colleague-production.md`](../checks/2026-08-18-r7-ai-colleague-production.md) | Đối chiếu code/compose, model Agent, database, UI và smoke test mới nhất. |
| Hướng dẫn triển khai Windows | [`../windows/README.md`](../windows/README.md) và [`../web/DEPLOY.md`](../web/DEPLOY.md) | Chỉ dùng sau khi đọc quy tắc backup và migration. |
| Hướng dẫn AI Admin Gateway | [`AI-ADMIN-GATEWAY.md`](AI-ADMIN-GATEWAY.md) | Hiểu registry tool, approval, audit và workflow thay đổi code. |
| Quy trình vận hành production | [`OPERATIONS-RUNBOOK.md`](OPERATIONS-RUNBOOK.md) | Checklist backup, cập nhật, smoke test và xử lý sự cố. |

## Thứ tự đọc bắt buộc

Đối với một AI hoặc lập trình viên mới, hãy đọc `VERSION.md`, `CHANGELOG.md`, file `web/AGENTS.md`, `web/BAN-GIAO.md`, `AI-ADMIN-GATEWAY.md`, `OPERATIONS-RUNBOOK.md`, rồi mới mở các file nghiệp vụ cụ thể. Khi cần khôi phục một nhiệm vụ dài, đọc thêm `02_state.md`, `01_plan.md` và `03_decisions.md` theo đúng thứ tự của bộ nhớ dự án.

## Bản đồ mã nguồn nhanh

| Khu vực | Vị trí | Vai trò |
|---|---|---|
| Schema và migration | `web/prisma/schema.prisma`, `web/prisma/migrations/` | Nguồn duy nhất của mô hình dữ liệu; migration additive, không reset. |
| AI Admin Gateway | `web/src/app/(app)/tro-ly/agent.ts` | Planner, registry tool, preview, approval, confirm, reject và audit. |
| Knowledge map AI | `web/src/lib/assistant.ts`, `web/src/lib/assistant-data.ts` | Quy tắc nghiệp vụ và snapshot dữ liệu được cấp cho AI. |
| Phiên AI | `web/src/app/(app)/tro-ly/conversations.ts` và `conversation-actions.ts` | Lưu phiên, turn, archive, xóa phiên, khôi phục lịch sử và lọc approval stale. |
| Chấm công AI | `web/src/app/(app)/tro-ly/attendance-intent.ts`, `web/src/app/(app)/cham-cong/actions.ts` | Parser nhiều lượt và bulk upsert Attendance. |
| Hồ sơ khách | `web/src/app/(app)/khach-hang/actions.ts` | Cập nhật, mã hóa số điện thoại, xóa có hoàn kho. |
| Sổ tư vấn | `web/src/app/(app)/ho-so/actions.ts` | `saveConsultationRecord`, khóa 24 giờ và audit sửa muộn. |
| Chứng từ | `web/src/app/(app)/ke-toan/de-nghi-thanh-toan/actions.ts` | PENDING → APPROVED/REJECTED → PAID và liên kết CashTransaction. |
| Lương | `web/src/app/(app)/luong/actions.ts`, `web/src/lib/payroll.ts` | Lưu điều chỉnh lương; công thức thực thu và commission. |
| Kế toán/Thu–chi | `web/src/app/(app)/ke-toan/actions.ts`, `web/src/app/(app)/thu-chi/actions.ts` | Ghi sổ, P&L, liên kết chứng từ và chống ghi trùng. |

## Trạng thái hiện tại cần nhớ

Release code production gần nhất là `c7ffa76`, Docker Compose là `ee9c7b0`; commit tài liệu mới nhất phải được kiểm tra ở `VERSION.md`. Production dùng Docker trên máy Windows của phòng khám, PostgreSQL có 49 migration đã áp dụng và r7 không có migration mới. Không tự ý chạy thao tác ghi dữ liệu thật trong lúc kiểm tra AI; luôn dùng preview và chờ ADMIN xác nhận.

## Quy tắc khi cập nhật tài liệu

Mỗi thay đổi nghiệp vụ phải cập nhật tối thiểu `CHANGELOG.md`, `VERSION.md` nếu tạo release, tài liệu nền tảng liên quan và checkpoint `02_state.md` nếu thuộc nhiệm vụ dài. Mỗi release production phải có một file trong `checks/` ghi commit, image, migration, model AI, kiểm tra HTTP, test và các thao tác chưa thực hiện. Không đưa mật khẩu, API key, `.env`, dữ liệu khách thật hoặc file backup vào GitHub.
