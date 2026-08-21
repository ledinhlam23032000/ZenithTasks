# Project State

- Updated: 2026-08-21 GMT+7
- Goal: Chuyển kết quả audit UX/nghiệp vụ thành file nhiệm vụ đánh số duy nhất để người dùng duyệt và gọi triển khai theo nhóm qua nhiều phiên.
- Current phase: Phase 4 — triển khai tuần tự theo `NHIEM_VU_UX_MASTER_2026.md`.
- Overall status: active

## Completed

Đã biên soạn `NHIEM_VU_UX_MASTER_2026.md` với 36 nhiệm vụ đánh số tuần tự. Mỗi nhiệm vụ có vấn đề, việc cần làm, tác dụng, phạm vi, tiêu chí nghiệm thu, test bắt buộc, phụ thuộc và rủi ro. File cũng có quy tắc gọi task, trạng thái, quality gate, quy tắc không tự mở rộng và quy trình cập nhật sau mỗi phiên.

## Source of truth

- File chính: `/home/ubuntu/ZenithTasks-feature/NHIEM_VU_UX_MASTER_2026.md`
- Audit gốc: `AUDIT_UX_VAN_HANH_2026-08.md`
- Backlog phân tích: `.task-memory/ux-operational-audit/03_prioritized_backlog.md`

## Approval state

Người dùng đã duyệt triển khai toàn bộ danh mục, loại trừ Task 11 vì vật tư phải tự chọn/tự trừ theo thực tế. Nhóm task 1–9, 13–15, 18–19, 21 và 31 đã code trên `feat/ux-execution-1-10`, quality gate xanh và đang chờ PR/merge. Các task còn lại giữ `Đã duyệt` trong master nhưng chưa triển khai cho đến khi đủ dependency.

## Protocol for future sessions

Khi người dùng nói “làm nhiệm vụ X–Y”, đọc file chính, checkpoint dự án và branch/master; kiểm tra phụ thuộc; triển khai trên branch riêng; chạy test/build/role-security checks; cập nhật task status/evidence; tạo PR; chỉ merge khi có câu lệnh/phê duyệt merge rõ ràng.

## Open questions

Các quyết định nghiệp vụ trong `05_open_questions.md` của audit vẫn cần xác minh khi task tương ứng được duyệt, đặc biệt Customer 360 của CTV, trường bắt buộc trước khóa hồ sơ, quy tắc auto-assign CSKH, BOM ngoại lệ và preset quyền chức danh.

## Next actions

1. Push commit phase đầu và tạo PR để CI/owner review.
2. Cập nhật `NHIEM_VU_UX_MASTER_2026.md` từ `Chờ kiểm thử` sang `Chờ merge` khi PR đã có.
3. Triển khai tiếp Task 10, Task 22 và Task 29 theo dependency.
