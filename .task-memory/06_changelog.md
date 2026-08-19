# Changelog — ZenithTasks AI Deep Upgrade

## 2026-08-19 — Khởi tạo đợt đánh giá sâu

Người dùng phản hồi rằng trợ lý chỉ xử lý câu hỏi ngắn, kém tự nhiên khi yêu cầu dài, chưa giống đồng nghiệp số; người dùng yêu cầu test khắt khe và cho phép thử nghiệm mạnh trên dữ liệu ít, đồng thời muốn xóa các phiên trợ lý không dùng nhưng UI hiện không làm được.

Đã đọc lại checkpoint cũ, skill quản lý nhiệm vụ dài, skill tạo skill và hướng dẫn Manus API. Đã xác định cần làm evaluation harness, memory/context nhiều tầng, bounded multi-step planner, final writer, conversation lifecycle và production verification. Chưa xóa conversation nào vì ảnh đánh dấu bao trùm danh sách và chưa có ID phiên cụ thể; đây là điểm cần xử lý bằng UI lựa chọn rõ ràng.

Mã nguồn hiện ở sandbox branch cũ so với production hotfix; trước khi sửa phải fetch `origin/master` và tạo branch mới từ commit production mới nhất. Các file bộ nhớ nhiệm vụ này không được đưa vào commit application trừ khi người dùng yêu cầu.
