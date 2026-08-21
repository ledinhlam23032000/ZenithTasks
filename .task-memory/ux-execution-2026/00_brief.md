# Brief — Triển khai nhiệm vụ UX 2026

## Mục tiêu

Triển khai tuần tự 36 nhiệm vụ trong `NHIEM_VU_UX_MASTER_2026.md`, trong đó làm 35 nhiệm vụ được duyệt và loại trừ hoàn toàn nhiệm vụ 11 về tự động áp BOM vật tư.

## Quyết định nghiệp vụ bắt buộc

Trung tâm có nhiều thủ thuật/phẫu thuật với mức độ nặng nhẹ và vật tư khác nhau. Nhân sự phải tự chọn và tự trừ vật tư theo ca thực tế. Không tự động áp BOM, không tự động trừ kho và không sửa quy trình vật tư thủ công hiện tại.

## Phạm vi triển khai

Các nhóm gồm nền tảng/task protocol, search/Customer 360, Reception Flow/lịch/work queue, checklist và workspace hồ sơ, tài chính, CSKH, Nhân sự/CTV, điều hướng/mobile/tự động hóa/telemetry, QA và rollout.

## Đầu ra

Mã nguồn cập nhật trên các nhánh feature theo phase, PR/commit và CI evidence; file task master cập nhật trạng thái; checkpoint trong thư mục này; production chỉ cập nhật sau khi có test và quality gate.

## Không làm

Không triển khai Task 11; không tự ý đổi chính sách xem dữ liệu CTV/y tế; không chạy migration production nếu chưa có backup gate; không merge phần chưa test.
