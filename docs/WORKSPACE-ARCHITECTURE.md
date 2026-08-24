# Kiến trúc Workspace ZenithTasks

> **Mục tiêu:** biến ZenithTasks thành nền tảng clinic-first đa workspace. Dữ liệu clinic hiện tại giữ nguyên trong workspace built-in **Nội Bộ**; mỗi Dự án mới là một app-inside-app có module, dữ liệu, thống kê và quyền riêng.

## 1. Nguyên tắc sản phẩm

ZenithTasks có một lớp quản trị chung và nhiều không gian vận hành. Khi người dùng chưa chọn Dự án, ứng dụng mở workspace **Nội Bộ**, là tên gọi sản phẩm của dữ liệu clinic hiện hữu. Nội Bộ không được tạo lại bằng cách copy dữ liệu sang bảng mới, không được đổi khóa hàng loạt và không được dùng làm lý do reset volume hoặc migration.

Mỗi Dự án là một workspace độc lập được quản lý bằng bản ghi `ZProject`. Dự án có mã duy nhất, trạng thái vòng đời, loại dự án, currency, cài đặt và danh sách module được phép dùng. Số lượng Dự án không bị khóa bởi giao diện; việc giới hạn thực tế chỉ đến từ hạ tầng, quyền và chính sách dữ liệu, không đến từ một danh sách hard-code.

Sidebar đặt bộ chọn workspace ngay dưới tên bệnh viện. Bộ chọn có thể thu gọn/mở rộng, luôn hiển thị Nội Bộ và những Dự án mà người dùng được phép truy cập. Admin có nút **Thêm Dự án** trong vùng quản trị. Manager không thấy nút tạo Dự án và không thể truy cập Dự án ngoài membership active bằng cách gõ URL trực tiếp.

## 2. Mô hình quyền

| Chủ thể | Phạm vi | Quyền chính | Ràng buộc bắt buộc |
|---|---|---|---|
| Admin toàn cục | Toàn hệ thống và mọi workspace | Xem tổng quan, tạo/quản trị Dự án, quản lý module, membership và chính sách chung | Không bỏ qua preview, audit hoặc approval đối với thay đổi nhạy cảm |
| Project Manager | Một hoặc nhiều Dự án được gán | Vận hành module trong Dự án được gán, xem số liệu thuộc phạm vi đó | Không thấy dữ liệu, menu hoặc API của Dự án khác |
| Thành viên module | Workspace và capability được cấp | Thực hiện nghiệp vụ hẹp trong module | Server phải kiểm tra capability và workspace ở từng action |
| AI nội bộ | Workspace hiện hành và capability được cấp | Phân tích, đề xuất, tạo preview và thực hiện sau approval phù hợp | Không tự suy diễn workspace, không đọc chéo, không tự nâng quyền |

`ZProjectMember.active=true` là điều kiện truy cập của Manager. Kiểm tra phải thực hiện trong server action, loader và route guard; ẩn link ở sidebar chỉ là UX, không phải biện pháp bảo mật. Admin có thể nhìn dữ liệu tổng hợp cần thiết ở lớp global nhưng read model tổng hợp phải chỉ rõ nguồn, workspace và quyền xem.

## 3. Module registry và vòng đời

Module là capability có khóa ổn định, nhãn giao diện, route, trạng thái triển khai và chính sách quyền. `enabledFeatures` trên `ZProject` chỉ là cấu hình bật/tắt capability đã triển khai; nó không biến một placeholder thành module thật. Admin có thể bật/tắt module đã available. Tắt module không xóa dữ liệu; hệ thống chỉ ngừng cho phép route/action mới và giữ audit.

| Module | Hiện trạng | Workspace data riêng | Điều kiện để mở |
|---|---|---|---|
| Tổ chức & vị trí | Đã có trong V2 | `ZOrganizationUnit`, `ZProjectPosition`, `ZProjectAssignment` | Đã có guard và route theo `projectId` |
| Cơ chế | Đã có trong V2 | `ZMechanismDefinition`, `ZMechanismVersion` | Đã có guard; L5 hai người duyệt vẫn là blocker |
| Mô phỏng | Khung V2 | Dữ liệu mô phỏng theo project khi dùng | Cần hoàn thiện route/action và test scope |
| Task | Kế hoạch ưu tiên tiếp theo | `ZWorkspaceTask` | Migration additive, CRUD, filter, membership và isolation test |
| Khách hàng | Chưa bật | `ZWorkspaceCustomer` | Schema, consent/data policy, CRUD, search, aggregate và test |
| Lịch hẹn | Chưa bật | `ZWorkspaceAppointment` | Schema, timezone/status, conflict policy và test |
| Tài chính | Chưa bật | `ZWorkspaceLedgerEntry` hoặc read model tương đương | Thiết kế immutable ledger, approval và export |
| Lương/hoa hồng | Chưa bật | `ZWorkspacePayrollRun`, rule links tới mechanism | Chính sách dữ liệu nhạy cảm, approval và audit đầy đủ |

Navigation trong một Dự án phải chuyển sang nhóm module của Dự án, không tiếp tục hiển thị toàn bộ menu clinic-global như thể hai phạm vi là một. Module chưa available không được render thành link có thể sử dụng. Nội Bộ tiếp tục dùng menu clinic hiện hữu cho đến khi từng module legacy có boundary và migration plan riêng.

## 4. Biên dữ liệu và chiến lược migration

Không thêm `projectId` nullable bừa bãi vào toàn bộ model clinic legacy. Cách làm đó dễ làm trộn dữ liệu, tạo đường đọc không có scope và biến dữ liệu cũ thành trạng thái nửa di trú. Thay vào đó, tạo họ model workspace-local mới cho từng module theo thứ tự rủi ro thấp đến cao. Mỗi bảng local phải có `projectId` bắt buộc, index theo `projectId`, và relation đến `ZProject` với hành vi xóa phù hợp chính sách.

Task là module chứng minh đầu tiên vì ít nhạy cảm hơn CRM, lịch hẹn, tài chính và lương. Các bảng local dự kiến gồm `ZWorkspaceTask`, `ZWorkspaceTaskComment` và `ZWorkspaceTaskEvent`; mọi query/read model đều bắt đầu từ workspace scope. Sau khi Task có isolation test ổn định, mới triển khai Customer và Appointment. Tài chính và Payroll phải có boundary riêng, approval, audit và quy tắc không sửa lịch sử tùy tiện.

Legacy clinic models tiếp tục thuộc Nội Bộ theo nghĩa sản phẩm, nhưng không được tự động gắn foreign key mới khi chưa có mapping/read/write hoàn chỉnh. Route `/khach-hang`, `/lich-hen`, `/thu-chi`, `/luong` hiện không được giả vờ trở thành route của Dự án. Chỉ khi module local tương ứng có schema, action, authorization, UI, migration và regression test thì mới thêm chuyển đổi giao diện có giải thích rõ.

Mọi migration production phải additive và reversible ở mức vận hành: tạo bảng/index/constraint mới, backfill có kiểm đếm nếu cần, không `db push`, không reset, không xóa volume và không xóa uploads. Trước khi bật cờ module, phải kiểm tra schema up to date, count trước/sau, smoke route và boundary test.

## 5. Active workspace context

Active workspace là context giao diện và server-side, không phải chỉ một chuỗi trong URL. Context tối thiểu gồm `workspaceKind` (`INTERNAL` hoặc `PROJECT`), `projectId` khi là Dự án, `userId`, role, membership/capability và mục đích hành động. Loader phải tạo context từ session và route; action không nhận `projectId` từ client rồi tin thẳng mà phải xác minh lại quyền trên server.

Khi chuyển workspace, shell đổi heading, selector state, menu module, breadcrumb và link quay lại. Trang Nội Bộ vẫn là `/dashboard`. Trang Dự án dùng `/du-an/[projectId]` và các route con có guard. Không được để một workspace đã chọn chỉ thay đổi tiêu đề trong khi query vẫn đọc dữ liệu global.

## 6. AI governance theo workspace

AI phải được truyền active workspace context vào planner, tool adapter, approval preview và audit record. Mọi đề xuất phải ghi rõ workspace, projectId nếu có, capability cần dùng, các bản ghi dự kiến ảnh hưởng, before/after và mức độ nhạy cảm. Nếu prompt yêu cầu dữ liệu ngoài phạm vi, AI phải từ chối hoặc hỏi lại; không tự mở rộng từ Manager sang Admin.

Thao tác read cũng phải scope theo workspace; thao tác write phải qua policy và preview. Những thay đổi nhân sự, dữ liệu y tế, tài chính, quyền truy cập, cơ chế chia hoa hồng hoặc thay đổi hệ thống phải có cảnh báo rõ. L5 hai người duyệt chưa triển khai và vẫn là blocker, không được ghi nhận là đã hoàn thành chỉ vì có nút approval.

Audit phải lưu actor, workspace/project, action, input summary không chứa secret, preview/result, policy decision và thời điểm. Không ghi mật khẩu, API key, JWT, cookie hoặc dữ liệu clinic không cần thiết vào log, test fixture hay tài liệu bàn giao.

## 7. Tiêu chí nghiệm thu theo mốc

| Mốc | Bằng chứng bắt buộc |
|---|---|
| Workspace shell | Admin thấy Nội Bộ và mọi Dự án; Manager chỉ thấy membership active; selector thu gọn/mở rộng; mobile và desktop nhất quán |
| Module registry | Admin bật/tắt module available; module planned không thể bật; disable không xóa; audit tạo thành công |
| Task isolation | Hai Dự án có task riêng; list/detail/create/update không đọc chéo; Manager bị chặn URL dự án khác |
| Global oversight | Admin có read model tổng hợp rõ nguồn và không làm lộ dữ liệu không cần thiết cho Manager |
| AI scope | Planner, action, preview và audit đều có workspace context; cross-scope bị chặn; L5 vẫn hiển thị blocker |
| Release | Prisma validate/generate, build, Vitest, updater one-click, migration status, HTTP smoke và authenticated role checks đạt |

## 8. Trạng thái hiện tại

Commit workspace MVP đã cung cấp selector, dashboard Dự án, registry và guard membership cho các route V2. Đây là **khung vận hành**, chưa phải hoàn thành toàn bộ “app trong app”: module Customer, Appointment, Finance, Payroll và Task chưa có họ schema local và chưa được bật; global aggregate dashboard và AI active-workspace enforcement vẫn là phần tiếp theo. Tài liệu này là nguồn sự thật để tránh tuyên bố vượt quá bằng chứng kiểm thử.
