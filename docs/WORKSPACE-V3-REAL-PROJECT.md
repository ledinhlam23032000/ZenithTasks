# Workspace V3 — Dự án vận hành thật trong ZenithTasks

> **Mục tiêu:** biến mỗi Dự án thành một phiên bản vận hành độc lập của ZenithTasks, có doanh số, khách hàng, lịch hẹn, tài chính, nhân sự, task và thống kê riêng; giữ nguyên dữ liệu clinic hiện tại trong workspace **Nội Bộ**.

## 1. Quyết định sản phẩm

ZenithTasks có một ứng dụng lõi và nhiều workspace. **Nội Bộ** là workspace built-in đại diện cho toàn bộ dữ liệu clinic hiện tại. Workspace này không bị đổi khóa, không bị copy sang Dự án và không bị di chuyển qua migration. `/dashboard` tiếp tục là cửa vào của Nội Bộ.

Mỗi **Dự án** là một workspace vận hành thật, không phải demo, preview hay bản dùng thử. Khi Admin tạo Dự án mới, Dự án được tạo để vận hành độc lập với mã, tên, trạng thái, chủ sở hữu, thành viên, module, layout và dữ liệu riêng. Dự án không tự sinh khách hàng, doanh số, hồ sơ y tế hoặc dữ liệu mẫu; dữ liệu chỉ xuất hiện khi người dùng tạo nghiệp vụ trong chính workspace đó.

| Phạm vi | Nội Bộ | Dự án |
|---|---|---|
| Dữ liệu | Dùng nguyên các model clinic legacy hiện tại | Dùng các model project-local có `projectId` bắt buộc |
| Menu | Menu clinic hiện hành, gồm các vị trí/nghiệp vụ Nội Bộ | Chỉ menu module được bật trong Dự án; không hiện menu Nội Bộ |
| Dashboard | Tổng quan clinic hiện tại | Doanh số, khách, lịch, tài chính, task và chỉ số của Dự án |
| Quyền | Global Admin và role clinic theo policy hiện có | Admin toàn cục; Manager/member chỉ trong project được gán |
| AI | Context `INTERNAL` | Context `PROJECT` + đúng `projectId`, không đọc chéo |
| Tùy chỉnh | Giữ workflow clinic ổn định | Admin bật/tắt/sắp xếp module; AI chỉ đề xuất thay đổi có preview/audit |

**Global Admin AI:** Admin có thêm context `GLOBAL` riêng, conversation riêng và action aggregate `get_workspace_overview`. Context này được phép đọc tổng hợp trạng thái/số Task của mọi Dự án trong danh sách phân quyền; thao tác nghiệp vụ chi tiết vẫn phải nêu `projectId` cụ thể. Manager không được cấp context GLOBAL hoặc capability aggregate.

## 2. Quy tắc chuyển workspace

Bộ chọn workspace đặt ngay dưới tên bệnh viện và có thể thu gọn/mở rộng. Khi bấm **Nội Bộ**, shell phải đặt active workspace là `INTERNAL`, chuyển về `/dashboard` và render lại toàn bộ menu vị trí/nghiệp vụ Nội Bộ. Khi bấm một Dự án, shell phải đặt active workspace là `PROJECT`, chuyển đến `/du-an/[projectId]` và thay toàn bộ menu bằng menu của Dự án đó.

Không được chỉ đổi tiêu đề trong khi query vẫn đọc dữ liệu Nội Bộ. Mọi route con, loader, server action và AI request trong Dự án phải nhận context từ route/session, xác minh membership trên server và dùng `projectId` đã kiểm chứng. Nếu Dự án không có module tương ứng hoặc membership không còn active, hệ thống phải chặn route và không trả dữ liệu.

Trong active Project, các mục như khách hàng, lịch hẹn, hồ sơ, thu–chi, kế toán, lương, nhân sự và các vị trí của Nội Bộ **không được xuất hiện** dưới dạng menu dùng được. Chúng chỉ xuất hiện sau khi người dùng bấm lại Nội Bộ. Dự án luôn có đường thoát rõ ràng qua bộ chọn workspace và nút về Tổng quan Dự án.

## 3. Mô hình dữ liệu độc lập

Không thêm `projectId` nullable một cách đại trà vào các model clinic legacy. Cách đó tạo query nửa di trú và nguy cơ trộn dữ liệu. Nội Bộ giữ nguyên schema nghiệp vụ hiện tại. Dự án dùng họ model local mới với `projectId` bắt buộc, index theo project và foreign key đến `ZProject`.

| Module vận hành | Model local dự kiến | Biên dữ liệu tối thiểu |
|---|---|---|
| Khách hàng | `ZWorkspaceCustomer` | Hồ sơ khách, consent, nguồn, tag, trạng thái và tìm kiếm trong một project |
| Lịch hẹn | `ZWorkspaceAppointment` | Khách local, lịch, loại, trạng thái, timezone và conflict trong một project |
| Doanh số | `ZWorkspaceSale` hoặc read model từ ledger | Doanh thu, dịch vụ, giảm giá, nguồn và kỳ báo cáo của một project |
| Tài chính | `ZWorkspaceLedgerEntry` | Thu/chi, payment reference, category, immutable history và approval |
| Nhân sự/vị trí | `ZProjectMember`, assignment và profile project-local khi cần | User identity có thể dùng chung, nhưng quyền/vị trí/chỉ số là theo project |
| Lương/hoa hồng | `ZWorkspacePayrollRun` và rule link tới mechanism | Kỳ lương, rule, snapshot, approval và audit trong một project |
| Task | `ZWorkspaceTask` | Task, assignee, status, priority và event trong một project |

Mỗi module phải có đủ schema, migration additive, server query/action, authorization, UI, empty state và isolation test trước khi chuyển từ `planned` sang `available`. Không route legacy `/khach-hang`, `/lich-hen`, `/thu-chi` hoặc `/luong` vào Dự án khi chưa có adapter local hoàn chỉnh.

## 4. Vòng đời Dự án

Dự án mới được tạo ở trạng thái `ACTIVE` và là workspace vận hành thật, không gắn chữ “demo” hay “thử nghiệm”. Dự án không tự tạo dữ liệu giả; doanh số, khách, lịch và task chỉ phát sinh từ nghiệp vụ được thực hiện trong chính project. Nếu về sau cần lifecycle cấu hình, `DRAFT` chỉ được dùng khi có nút kích hoạt rõ ràng; `ARCHIVED` chỉ khóa ghi mới và giữ nguyên lịch sử.

Admin toàn cục được xem danh sách Dự án, tình trạng module và các aggregate đã được cấp quyền. Manager chỉ thấy Dự án có membership active, không được đọc tên, số liệu, audit hay module configuration của Dự án khác. Tắt module chỉ chặn route/action mới; không xóa dữ liệu và không làm mất lịch sử.

## 5. Tùy chỉnh module bằng kéo-thả

Admin trong Dự án có màn hình **Tùy chỉnh workspace**. Màn hình này cho phép kéo-thả thứ tự module, nhóm module vào các khu vực sidebar, bật/tắt module đã triển khai và đặt module mặc định. Cấu hình được lưu theo project, có version và audit; người dùng có thể xem trước layout trước khi áp dụng. Module planned/blocked không được kéo vào vị trí active hoặc biến thành link dùng được.

Cấu hình layout không được thay đổi schema nghiệp vụ hoặc tự cấp quyền. Quyền module vẫn do server-side capability và membership quyết định. Nếu thao tác ảnh hưởng dữ liệu, permission, tài chính, lương, hồ sơ y tế hoặc cơ chế hoa hồng, hệ thống phải chuyển sang preview/approval riêng thay vì coi đó là thay đổi giao diện thông thường.

## 6. AI nội bộ tạo cấu hình

AI được phép hỗ trợ thiết kế workspace bằng cách phân tích yêu cầu, hỏi lại A/B/C/D khi còn nhiều cách hiểu, đề xuất module/field/link/rule và sinh một **configuration proposal**. Proposal phải nêu workspace, projectId, module bị ảnh hưởng, field mapping, before/after, rủi ro, capability, migration cần có và khả năng rollback.

AI không được tự tạo bảng tùy ý, đọc dữ liệu Nội Bộ khi đang ở Dự án, nối field của hai workspace, bật module chưa triển khai, xóa dữ liệu hoặc thay đổi quyền mà không qua preview và approval. Khi người dùng xác nhận, server vẫn kiểm tra lại scope, schema, policy và membership; audit phải lưu actor, workspace, projectId, proposal version, decision và kết quả.

## 7. Thứ tự triển khai bắt buộc

| Giai đoạn | Đầu ra | Cổng chất lượng |
|---|---|---|
| A | Workspace switch làm biến mất/hiện lại đúng menu Nội Bộ; bỏ ngôn ngữ demo | Runtime Admin/Manager, direct URL guard, build |
| B | Dự án active thật với dashboard/project settings và module layout theo project | Migration additive, no legacy mutation, module config audit |
| C | Customer, Appointment và Sales/Finance local | Hai project có dữ liệu riêng, aggregate đúng project, rollback/read tests |
| D | Payroll/commission local gắn mechanism theo project | Sensitive policy, approval, immutable snapshot, audit |
| E | Kéo-thả layout và AI configuration proposal | Preview diff, approval, deny cross-scope, audit |
| F | Global Admin aggregate read model | Chỉ Admin, nguồn dữ liệu minh bạch, không lộ dữ liệu cho Manager |

Không đánh dấu một giai đoạn hoàn tất chỉ vì route/build thành công. Mỗi giai đoạn cần test query isolation, test quyền, runtime smoke và deploy qua `Sua-Loi.bat` nếu có migration hoặc code chạy thật.

## 8. Trạng thái hiện tại và giới hạn

Đã có nền workspace selector, project dashboard, membership, module registry, Task local, AI INTERNAL/PROJECT scope và patch GLOBAL aggregate cho Admin. Đợt hiện tại đã thêm migration `20260826110000_workspace_core_modules`, model `ZWorkspaceCustomer`/`ZWorkspaceAppointment`/`ZWorkspaceSale`, action và UI tạo/list Customer, cùng action/UI tạo-cập nhật trạng thái Lịch hẹn project-local. Tiếp theo đã thêm `ZWorkspaceConfigVersion` với migration `20260826120000_workspace_config_versions`, lưu version/audit module, preview rollback có xác nhận Admin, và `ZWorkspaceLedgerEntry` với migration `20260826130000_workspace_ledger_entries` cùng isolation SQL foundation. Route `/du-an/[projectId]/tai-chinh` hiện có aggregate thu/chi, ghi ledger, link sale cùng project và Admin void không xóa lịch sử. Customer/Lịch hẹn/Sales/Ledger vẫn ở mức `review`: còn thiếu edit/soft-delete/consent/detail/history, period filter, payment reconciliation và bộ test runtime authenticated. Finance đầy đủ, Payroll/Commission project-local, layout kéo-thả và AI proposal vẫn chưa hoàn thành; vì vậy chưa tuyên bố toàn bộ Dự án đã độc lập hoàn toàn. Mỗi module chỉ được mở khi có schema, action, UI, quyền và isolation evidence tương ứng.
