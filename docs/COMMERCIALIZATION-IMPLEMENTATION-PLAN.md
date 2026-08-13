# ZenithTasks Commercialization Implementation Plan

## Mục tiêu

Đưa ZenithTasks từ hệ thống nội bộ của Trung tâm Phẫu thuật Tạo hình Thẩm mỹ BVĐK Hồng Phúc thành nền tảng quản lý phòng khám có thể cấu hình cho cơ sở khác mà không phải sửa code, đồng thời bảo vệ dữ liệu y tế, tiền và tồn kho.

## Quyết định sản phẩm

- Giai đoạn đầu: cloud riêng và database riêng cho từng phòng khám.
- Ngôn ngữ phát hành đầu tiên: tiếng Việt, locale `vi-VN`.
- Thiết bị: desktop, tablet và mobile.
- Hình ảnh: y tế cao cấp, tối giản, sáng, sạch, tin cậy.
- Dữ liệu y tế: áp dụng quyền tối thiểu; MANAGER được xem toàn bộ theo chính sách chủ sản phẩm, nhưng quyền sửa vẫn tách riêng.
- Hồ sơ: lưu trữ thay vì xóa cứng; xóa vật lý chỉ qua quy trình được phê duyệt.
- Quyền cao: bắt buộc 2FA.
- Kiểm thử: staging và dữ liệu giả, không chạy test phá hoại trên dữ liệu bệnh nhân thật.

## Thứ tự triển khai

1. Audit/baseline, tài liệu và release gates.
2. Quyền đối tượng, media, dữ liệu y tế và 2FA.
3. Kho, payment, debt, archive và invariants.
4. Cấu hình phòng khám, branding và onboarding.
5. Design system, dashboard theo vai trò, patient timeline, public booking và responsive UI.
6. Playwright E2E, accessibility, lint/build/CI.
7. Backup, restore, support, upgrade và commercial runbook.

## Quy tắc triển khai

- Mỗi nhóm thay đổi có test hồi quy trước khi chuyển nhóm tiếp theo.
- Không đưa secret/key file vào commit.
- Không migration trực tiếp production; mọi schema change phải có migration và backup/restore drill.
- Không coi menu ẩn là biên bảo mật; server action và file route phải tự authorize.
- Không tuyên bố READY nếu còn P1 về dữ liệu, tiền, quyền hoặc rò rỉ riêng tư.

## Phạm vi nhánh

Nhánh `codex/zenithtasks-commercialization` bắt đầu từ commit `6a6dc88` và sẽ được push thành Draft PR vào `master`. Các commit được chia theo nhóm: docs, security, data integrity, commercialization, UX, tests/operations.

