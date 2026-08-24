# Bộ tài liệu tiếp quản ZenithTasks

> **Sản phẩm:** Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc
> **Mục đích:** giúp người hoặc AI mới tiếp quản hiểu đúng sản phẩm, mã nguồn, nghiệp vụ, production và các giới hạn an toàn trước khi thay đổi bất kỳ điều gì.

## Quy tắc nguồn sự thật

Mã nguồn, Prisma schema và migration trên nhánh `master` là nguồn thực thi. Tài liệu mô tả trạng thái và quy trình nhưng không được dùng để thay thế việc kiểm tra mã nguồn khi hai bên mâu thuẫn. Nếu phát hiện mâu thuẫn, dừng thay đổi, xác minh bằng mã nguồn/database rồi cập nhật tài liệu trong cùng release.

| Loại thông tin | File chuẩn | Cách sử dụng |
|---|---|---|
| Phiên bản, commit, migration, kiểm tra gần nhất | [`../VERSION.md`](../VERSION.md) | Đọc đầu tiên; SHA thực tế phải đối chiếu với `git rev-parse` và `git ls-remote`. |
| Năng lực sản phẩm và luồng tự động | [`PRODUCT-CAPABILITIES.md`](PRODUCT-CAPABILITIES.md) | Đọc ngay sau VERSION/CHANGELOG để hiểu các thành quả, ưu điểm vận hành và vị trí mã nguồn. |
| Lịch sử thay đổi | [`../CHANGELOG.md`](../CHANGELOG.md) | Đọc các release mới nhất trước khi sửa. |
| Kiến trúc và nghiệp vụ chi tiết | [`../web/BAN-GIAO.md`](../web/BAN-GIAO.md) | Tài liệu nền tảng của thư mục `web/`. |
| Hồ sơ bàn giao hiện hành | [`PROJECT-HANDOFF-2026-08-24.md`](PROJECT-HANDOFF-2026-08-24.md) | Đọc sau VERSION/CHANGELOG; gồm V2, AI, QA demo, role convention, link local và giới hạn. |
| Lịch sử nâng cấp và bàn giao | [`../UPGRADE-HANDOFF-2026-08.md`](../UPGRADE-HANDOFF-2026-08.md) | Tài liệu lịch sử; không thay thế trạng thái hiện hành. |
| Trạng thái nhiệm vụ dài | `.task-memory/` và checkpoint trong project memory nếu tồn tại | Chỉ đọc khi cần khôi phục task; không coi memory cũ là nguồn sự thật của source. |
| Kiểm chứng production | [`../checks/2026-08-18-r7-ai-colleague-production.md`](../checks/2026-08-18-r7-ai-colleague-production.md) | Đối chiếu code/compose, model Agent, database, UI và smoke test mới nhất. |
| Hướng dẫn triển khai Windows | [`../windows/README.md`](../windows/README.md) và [`../web/DEPLOY.md`](../web/DEPLOY.md) | Chỉ dùng sau khi đọc quy tắc backup và migration. |
| Hướng dẫn AI Admin Gateway | [`AI-ADMIN-GATEWAY.md`](AI-ADMIN-GATEWAY.md) | Hiểu registry tool, approval, audit và workflow thay đổi code. |
| AI governance hiện hành | [`AI-EXECUTIVE-GOVERNANCE-V3.md`](AI-EXECUTIVE-GOVERNANCE-V3.md) | Phân biệt deployed policy/MVP với target; L5 hiện bị chặn. |
| AI Training Studio | [`AI-TRAINING-STUDIO-SETUP.md`](AI-TRAINING-STUDIO-SETUP.md) | Chỉ có MVP dashboard/demo seed; CRUD/evaluation/release còn backlog. |
| QA DeepSeek và role demo | [`PROJECT-HANDOFF-2026-08-24.md`](PROJECT-HANDOFF-2026-08-24.md#5-qa-deepseek-cô-lập) | Launcher port 3300, DB QA, role usernames và secret-safe credential handling. |
| Quy trình vận hành production | [`OPERATIONS-RUNBOOK.md`](OPERATIONS-RUNBOOK.md) | Checklist backup, cập nhật, smoke test và xử lý sự cố. |

## Thứ tự đọc bắt buộc

Đối với một AI hoặc lập trình viên mới, hãy đọc `VERSION.md`, `CHANGELOG.md`, `PROJECT-HANDOFF-2026-08-24.md`, `PRODUCT-CAPABILITIES.md`, file `web/AGENTS.md`, `web/BAN-GIAO.md`, `AI-ADMIN-GATEWAY.md`, `AI-EXECUTIVE-GOVERNANCE-V3.md`, `AI-TRAINING-STUDIO-SETUP.md`, `OPERATIONS-RUNBOOK.md` và `windows/README.md`, rồi mới mở các file nghiệp vụ cụ thể. Khi cần khôi phục một nhiệm vụ dài, chỉ đọc các file memory có thật trong checkout hiện tại; không tạo claim từ đường dẫn memory lịch sử đã bị xóa.

## Bản đồ mã nguồn nhanh

| Khu vực | Vị trí | Vai trò |
|---|---|---|
| Schema và migration | `web/prisma/schema.prisma`, `web/prisma/migrations/` | Nguồn duy nhất của mô hình dữ liệu; migration additive, không reset. |
| AI Admin Gateway | `web/src/app/(app)/tro-ly/agent.ts` | Planner, clarification A/B/C/D, registry tool, preview, approval, confirm, reject và audit. |
| Knowledge map AI | `web/src/lib/assistant.ts`, `web/src/lib/assistant-data.ts` | Quy tắc nghiệp vụ và snapshot dữ liệu được cấp cho AI. |
| Phiên AI | `web/src/app/(app)/tro-ly/conversations.ts` và `conversation-actions.ts` | Lưu phiên, turn, archive, xóa phiên, khôi phục lịch sử và lọc approval stale. |
| Chấm công AI | `web/src/app/(app)/tro-ly/attendance-intent.ts`, `web/src/app/(app)/cham-cong/actions.ts` | Parser nhiều lượt và bulk upsert Attendance. |
| Hồ sơ khách | `web/src/app/(app)/khach-hang/actions.ts` | Cập nhật, mã hóa số điện thoại, xóa có hoàn kho. |
| Hồ sơ dịch vụ thẩm mỹ | `web/src/lib/consultation-sheet.ts`, `web/src/app/(app)/ho-so/[id]/consultation/`, `web/src/app/(app)/ho-so/[id]/page.tsx` | Tự điền, checklist Bình thường/Bất thường, editor nội dung in, HTML A4/Word và kho Giấy tờ thống nhất. |
| Bản ghi tư vấn | `web/src/app/(app)/ho-so/actions.ts` | `saveConsultationRecord`, khóa 24 giờ và audit sửa muộn; đây là dữ liệu nguồn của Hồ sơ dịch vụ thẩm mỹ. |
| Chứng từ | `web/src/app/(app)/ke-toan/de-nghi-thanh-toan/actions.ts` | PENDING → APPROVED/REJECTED → PAID và liên kết CashTransaction. |
| Lương | `web/src/app/(app)/luong/actions.ts`, `web/src/lib/payroll.ts` | Lưu điều chỉnh lương; công thức thực thu và commission. |
| Kế toán/Thu–chi | `web/src/app/(app)/ke-toan/actions.ts`, `web/src/app/(app)/thu-chi/actions.ts` | Ghi sổ, P&L, liên kết chứng từ và chống ghi trùng. |
| Operating Framework V2 | `web/prisma/schema.prisma`, `web/src/lib/v2-rule-engine.ts`, `web/src/app/(app)/du-an/` | Project/org/position/member/mechanism và rule simulation; migration additive `20260824000000_operating_framework_v2`. |
| Training Studio MVP | `web/src/app/(app)/he-thong/ai-dao-tao/`, `web/src/lib/ai-training-actions.ts` | Dashboard/counts và demo seed; không nhầm với full training lab. |
| Governance policy | `web/src/lib/ai-governance.ts`, `web/src/lib/ai-governance-adapter.ts` | L0–L5, capability/scope, sensitive-read purpose/confirmation và chặn L5 nguy hiểm. |
| QA launcher | `windows/Cau-Hinh-AI-QA.ps1`, `windows/Tat-AI-QA.ps1` | Tạo/dọn app QA port 3300; không chạm clinic port 3000. |

## Trạng thái hiện tại cần nhớ

Release code và commit chuẩn được ghi trong `VERSION.md` nhưng phải kiểm chứng lại bằng Git tại thời điểm thao tác. `PRODUCT-CAPABILITIES.md` là bản đồ thành quả hiện hành, còn `CHANGELOG.md` là lịch sử theo release. V2 và Training Studio có migration additive; QA đã được migrate và kiểm thử cô lập. Trạng thái migration production phải được xác nhận trên chính máy clinic trước khi kết luận. Không tự ý chạy thao tác ghi dữ liệu thật trong lúc kiểm tra AI; luôn dùng preview và chờ capability/approval phù hợp.

## Quy tắc khi cập nhật tài liệu

Mỗi thay đổi nghiệp vụ phải cập nhật tối thiểu `CHANGELOG.md`, `VERSION.md` nếu tạo release, tài liệu nền tảng liên quan và checkpoint `02_state.md` nếu thuộc nhiệm vụ dài. Mỗi release production phải có một file trong `checks/` ghi commit, image, migration, model AI, kiểm tra HTTP, test và các thao tác chưa thực hiện. Không đưa mật khẩu, API key, `.env`, dữ liệu khách thật hoặc file backup vào GitHub.
