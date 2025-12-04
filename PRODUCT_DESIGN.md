# Thiết kế ứng dụng ghi chú/nhiệm vụ phân cấp (Windows 10)

## 1. Tầm nhìn sản phẩm
Ứng dụng dành cho người Việt, kết hợp ghi chú linh hoạt như Notion với quản lý nhiệm vụ đa cấp không giới hạn. Người dùng có thể tạo trang ghi chú, gắn các nhiệm vụ lớn/nhỏ theo cây phân cấp, theo dõi % hoàn thành tự động, và thao tác thuận tiện trên Windows 10 (ứng dụng WPF trong repo hiện tại).

## 2. Nhân vật & kịch bản chính
- **Sinh viên/nhân viên văn phòng**: ghi chú bài học/cuộc họp, chia nhiệm vụ thành nhiều lớp việc con, đánh dấu nhanh hoàn thành.
- **Quản lý dự án cá nhân**: thiết kế dự án lớn (OKR, project), gắn checklist nhiều cấp, xem tiến độ tổng quan.
- **Freelancer**: lập kế hoạch theo khách hàng, tạo template lặp lại, xem lịch/nhắc việc.

## 3. Yêu cầu chức năng cốt lõi
1. **Cấu trúc trang và khối (block)**
   - Trang (page) có tiêu đề, mô tả, tag, bộ lọc.
   - Bên trong trang, người dùng chèn khối: văn bản, danh sách bullet, checklist, bảng nhiệm vụ, hình ảnh.
2. **Nhiệm vụ phân cấp vô hạn**
   - Mỗi nhiệm vụ có: tiêu đề, mô tả ngắn, trạng thái (Todo/In Progress/Done), priority, due date, tag, người phụ trách (tùy chọn), tệp đính kèm.
   - Nhiệm vụ có danh sách `Subtasks` không giới hạn; mỗi subtask lặp lại cấu trúc nhiệm vụ và có thể chứa thêm cấp con.
   - Hỗ trợ kéo-thả thay đổi thứ tự/cấp độ trong cây.
3. **Tính toán tiến độ %**
   - Với nhiệm vụ cha, % hoàn thành = trung bình trọng số của subtasks (mặc định 1/n; cho phép chỉnh trọng số). Nếu không có con, % dựa trên trạng thái (0/50/100 hoặc 0/100 khi chọn checkbox).
   - Tính toán đệ quy, cập nhật ngay khi tick/đổi trạng thái. Cho phép cache kết quả và chỉ tính lại nhánh bị ảnh hưởng.
4. **Chế độ xem & lọc**
   - **Tree view**: hiển thị cây nhiệm vụ bên trái; chọn nút mở bảng chi tiết bên phải.
   - **Board (Kanban)**: nhóm theo trạng thái; kéo-thả giữa cột cập nhật %.
   - **Calendar**: xem nhiệm vụ theo due date; drag để đổi ngày.
   - Lọc theo trạng thái, tag, priority, người phụ trách; tìm kiếm toàn văn.
5. **Trải nghiệm ghi chú**
   - Soạn thảo rich text cơ bản (in đậm/nghiêng/gạch đầu dòng, checklist inline).
   - Chèn khối bảng nhiệm vụ trong trang: mỗi dòng là nhiệm vụ, hỗ trợ thêm cấp con trực tiếp.
6. **Template & lặp lại**
   - Template trang/nhiệm vụ (OKR, project plan); clone nhanh.
   - Nhiệm vụ lặp (daily/weekly); tự tạo instance con, liên kết tiến độ chuỗi.
7. **Thông báo & nhắc việc**
   - Nhắc tới hạn, push notification Windows 10; snooze.
   - Báo cáo email tùy chọn (để trống khi offline).

## 4. Kiến trúc & kỹ thuật (WPF, MVVM)
- **Pattern**: MVVM; `ViewModels` xử lý state, binding 2 chiều; `Commands` cho thao tác.
- **Dữ liệu**: SQLite + EF Core (hoặc LiteDB) lưu offline; repository trong `ZenithTasks.DataAccess`; domain `TaskItem` (self-referencing `ParentId`).
- **Đồng bộ**: mở rộng sau qua API; thiết kế lớp `SyncService` (chưa cần backend).
- **Tính toán tiến độ**: dịch vụ `ProgressCalculator` nhận `TaskItem` với danh sách con, trả %; tối ưu bằng memoization khi cây lớn.
- **Hiệu năng cây vô hạn**: dùng `HierarchicalDataTemplate` + virtualization (`VirtualizingStackPanel`), lazy-load con theo nhu cầu.
- **Tìm kiếm**: chỉ mục SQLite FTS5 cho văn bản ghi chú và tiêu đề nhiệm vụ.

## 5. Thiết kế giao diện (thân thiện người Việt)
- **Bố cục chính**
  - Thanh bên trái: danh sách trang (folder), nút tạo mới, ô tìm kiếm.
  - Khung giữa: nội dung trang với khối ghi chú; bảng nhiệm vụ trong trang.
  - Pane phải: chi tiết nhiệm vụ đang chọn (mô tả, checklist, tệp, tag, % hoàn thành lớn).
  - Header: thanh breadcrumb + bộ lọc nhanh (Trạng thái, Tag, Ưu tiên, Người phụ trách).
- **Theme**: sáng/tối, font dễ đọc (Inter/Noto Sans), màu chủ đạo xanh biển + accent cam; icon rõ ràng; spacing 8/12 px.
- **Tương tác**
  - Tick checkbox trong mọi chế độ (tree/board/table) để cập nhật % ngay.
  - Kéo-thả đổi cấp độ, reorder; shortcut: Enter thêm nhiệm vụ cùng cấp, Tab/Shift+Tab thụt/giảm cấp.
  - Context menu tiếng Việt (Đổi trạng thái, Thêm nhiệm vụ con, Sao chép liên kết).
  - Hỗ trợ nhập liệu tiếng Việt tốt (TextBox với Input Method Editor).
- **Khả năng truy cập**: phím tắt, focus visible, cao tương phản, thông báo trạng thái bằng text.

## 6. Luồng người dùng chính
1. Tạo trang > nhập ghi chú, thêm khối bảng nhiệm vụ.
2. Thêm nhiệm vụ cha, nhấn `Tab` để tạo nhiệm vụ con; nhập các cấp con tùy ý.
3. Tick con > hệ thống tự tính % và hiển thị huy hiệu tiến độ ở nhiệm vụ cha và breadcrumb.
4. Chuyển sang Board để kéo nhiệm vụ theo cột; tiến độ cập nhật lại.
5. Thiết lập nhắc hạn; thông báo xuất hiện trên Windows 10.

## 7. Mô hình dữ liệu đề xuất (rút gọn)
```mermaid
erDiagram
    Page ||--o{ Block : contains
    Page {
        Guid Id
        string Title
        string? Description
        datetime CreatedAt
        datetime UpdatedAt
    }
    Block {
        Guid Id
        Guid PageId
        string BlockType // text, checklist, table
        string? ContentJson
        int Order
    }
    TaskItem ||--o{ TaskItem : Subtasks
    TaskItem {
        Guid Id
        Guid? ParentId
        Guid? PageId // liên kết block bảng
        string Title
        string? Description
        string Status // todo, in_progress, done
        int? Weight // trọng số tùy chọn
        int Priority // 1-5
        datetime? DueDate
        string[] Tags
        string? Assignee
        double Progress
    }
```

## 8. Kế hoạch triển khai MVP
- **Sprint 1**: Khởi tạo schema SQLite/EF; domain TaskItem self-reference; ViewModel cây nhiệm vụ; CRUD cơ bản; tính % với recursion; Tree view + checkbox.
- **Sprint 2**: Khối ghi chú rich text đơn giản; bảng nhiệm vụ trong trang; drag-drop thay đổi cấp; bộ lọc trạng thái/tag.
- **Sprint 3**: Board view, Calendar view; thông báo Windows; theme dark/light; template trang.

## 9. Đo lường thành công
- Thời gian tạo nhiệm vụ mới < 2s; thao tác tick phản hồi < 100ms.
- Người dùng có thể thiết lập cây >= 5 cấp mà không lag trên máy Windows 10 cấu hình trung bình.
- NPS > 30 sau 4 tuần thử nghiệm nội bộ.

## 10. Rủi ro & giảm thiểu
- **Cây quá sâu gây chậm**: dùng virtualization, cache progress theo nhánh.
- **Xung đột dữ liệu khi đồng bộ**: hiện tại offline-first, đồng bộ bổ sung sau với cơ chế merge.
- **Quá tải tính năng**: tập trung MVP tree + tính % + board; tính năng nâng cao phát hành dần.
