# Kế hoạch Workspace V4 — 60 task có kiểm chứng

> **Mục tiêu:** biến Dự án thành một phiên bản vận hành độc lập của ZenithTasks, có trường/dữ liệu/doanh số riêng; chuyển workspace làm ẩn/hiện đúng toàn bộ menu; Global Admin và AI có quyền nhìn/điều phối mọi Dự án nhưng không bỏ qua governance; sau đó tự tạo dữ liệu giả, kiểm thử role đăng nhập và triển khai qua `Sua-Loi.bat`.

## Quy ước

Mỗi task có mã ổn định, phụ thuộc, đầu ra và cổng nghiệm thu riêng. `done` chỉ dùng khi có bằng chứng trong `checks/` hoặc log/runtime tương ứng. `review` nghĩa là đã có nền nhưng chưa đạt yêu cầu V4. Các migration đều phải additive; không `db push`, `migrate reset`, `down -v` hoặc xóa volume/uploads clinic.

## Phase 01 — Đặc tả và baseline sản phẩm

| Mã | Task | Phụ thuộc | Đầu ra và tiêu chí nghiệm thu | Trạng thái |
|---|---|---|---|---|
| P01-T01 | Khôi phục trạng thái dự án và kiểm tra AGENTS, Git, Docker, port 3000/3300 | — | Có checkpoint source-of-truth, không lẫn QA với clinic, artifact local được ghi rõ | done |
| P01-T02 | Ghi baseline dữ liệu Nội Bộ và dữ liệu V2 hiện có | P01-T01 | Đếm/kiểm tra read-only, xác nhận legacy clinic không bị di chuyển; không xuất dữ liệu thật vào log | done |
| P01-T03 | Chốt user journey chuyển Nội Bộ → Dự án → Nội Bộ | P01-T01 | Có đặc tả click, URL, mobile, back/refresh và hành vi khi membership hết hiệu lực | done |
| P01-T04 | Chốt bản đồ module Nội Bộ so với module project-local | P01-T02 | Bảng mapping chỉ rõ model legacy nào giữ nguyên và model local nào phải tạo; không route giả | done |
| P01-T05 | Chốt định nghĩa Dự án vận hành thật, không demo/trial | P01-T03 | Dự án có lifecycle, dữ liệu thật do người dùng tạo, không seed giả mặc định; có tiêu chí ACTIVE | done |
| P01-T06 | Chốt quality gate 60 task và nguyên tắc không tuyên bố vượt bằng chứng | P01-T01 | Checklist build, migration, role, isolation, updater và browser walkthrough được lưu trong kế hoạch | done |

## Phase 02 — Quyền, workspace context và boundary

| Mã | Task | Phụ thuộc | Đầu ra và tiêu chí nghiệm thu | Trạng thái |
|---|---|---|---|---|
| P02-T01 | Chuẩn hóa `WorkspaceContext` với INTERNAL, PROJECT và GLOBAL | P01-T05 | Type/schema/action dùng cùng context; lịch sử cũ mặc định INTERNAL; migration additive | review |
| P02-T02 | Khóa Global Admin ở server-side | P02-T01 | ADMIN có global capability; role khác không thể giả mạo context bằng form/URL | review |
| P02-T03 | Khóa Project Manager theo membership active | P02-T01 | Manager chỉ truy cập project được gán; revoke membership chặn ngay cả khi biết URL | review |
| P02-T04 | Tạo policy ngăn đọc/ghi chéo project | P02-T01,P02-T02 | Mọi action local nhận projectId đã xác minh; cross-project trả deny và không query dữ liệu | review |
| P02-T05 | Định nghĩa AI mode INTERNAL/PROJECT/GLOBAL | P02-T01,P02-T02 | Admin chọn GLOBAL; Manager không thấy/không gọi được GLOBAL; project target phải explicit | review |
| P02-T06 | Viết regression test quyền và boundary | P02-T02,P02-T03,P02-T04 | Test Admin all-project, Manager scoped, fake projectId và missing projectId đều đạt | review |

## Phase 03 — Mô hình dữ liệu project-local

| Mã | Task | Phụ thuộc | Đầu ra và tiêu chí nghiệm thu | Trạng thái |
|---|---|---|---|---|
| P03-T01 | Hoàn thiện lifecycle và cấu hình vận hành của `ZProject` | P01-T05,P02-T01 | ACTIVE/DRAFT/ARCHIVED có hành vi rõ; project mới không bị gọi là demo; audit lifecycle | review |
| P03-T02 | Tạo model version cho module/layout/config theo project | P03-T01 | Cấu hình có version, effective time, audit và rollback an toàn; không cấp quyền ngầm | not_started |
| P03-T03 | Tạo `ZWorkspaceCustomer` và policy dữ liệu khách | P03-T01,P02-T04 | projectId bắt buộc, unique/index theo project, consent và CRUD scoped | review |
| P03-T04 | Tạo `ZWorkspaceAppointment` | P03-T03 | Khách chỉ là customer cùng project, timezone/status/conflict scoped, không đọc Appointment legacy | review |
| P03-T05 | Tạo `ZWorkspaceSale`/`ZWorkspaceLedgerEntry` | P03-T03,P03-T04 | Doanh số/thu chi theo project, immutable history phù hợp và tổng hợp được | review |
| P03-T06 | Tạo payroll snapshot và liên kết mechanism theo project | P03-T05 | Kỳ lương/rule/snapshot/approval có projectId; không dùng bảng lương Nội Bộ trong Dự án | not_started |

## Phase 04 — Module Customer, Appointment và Sales

| Mã | Task | Phụ thuộc | Đầu ra và tiêu chí nghiệm thu | Trạng thái |
|---|---|---|---|---|
| P04-T01 | Xây danh sách/tạo/sửa Customer project-local | P03-T03 | Form clinic-first, empty/loading/error state, create/list/edit chỉ trong active project | review |
| P04-T02 | Xây hồ sơ Customer và lịch sử local | P04-T01 | Detail chỉ hiển thị dữ liệu cùng project; không có link/lookup sang customer Nội Bộ | not_started |
| P04-T03 | Xây lịch hẹn project-local | P03-T04,P04-T01 | Tạo/đổi trạng thái/hủy mềm; conflict và assignee đều scoped | review |
| P04-T04 | Xây sale/service order tối thiểu | P03-T05,P04-T02 | Tạo giao dịch và snapshot giá/dịch vụ local; không ghi CaseRecord/Payment legacy | review |
| P04-T05 | Xây dashboard doanh số Dự án | P04-T04 | Doanh thu, số khách, lịch hẹn và tỷ lệ trạng thái chỉ lấy projectId; có period filter | review |
| P04-T06 | Viết isolation test cho Customer/Appointment/Sales | P04-T01,P04-T03,P04-T04 | Hai project có dữ liệu giống nhau nhưng list/detail/aggregate không đọc chéo | review |

## Phase 05 — Finance, Payroll và Mechanism theo project

| Mã | Task | Phụ thuộc | Đầu ra và tiêu chí nghiệm thu | Trạng thái |
|---|---|---|---|---|
| P05-T01 | Xây ledger ghi thu/chi local | P03-T05,P04-T04 | Entry có source, category, amount, createdBy, projectId; không sửa/xóa lịch sử tùy tiện | not_started |
| P05-T02 | Xây payment reconciliation local | P05-T01 | Payment reference và trạng thái đối soát trong project; không chạm Payment legacy | not_started |
| P05-T03 | Xây mechanism editor và version activation | P02-T04,P03-T06 | Draft → preview → approval → active; rule test có trace và chỉ áp dụng project | not_started |
| P05-T04 | Xây payroll run local | P03-T06,P05-T03 | Chốt snapshot kỳ lương và tổng hợp commission theo project; sensitive fields có policy | not_started |
| P05-T05 | Xây finance/payroll role actions | P02-T02,P05-T01,P05-T04 | ADMIN/Project Manager/capability được phân tách; audit thay đổi nhạy cảm | not_started |
| P05-T06 | Viết test finance/payroll/mechanism không rò Nội Bộ | P05-T02,P05-T03,P05-T04 | Cross-project, wrong role, wrong mechanism và wrong period đều bị chặn hoặc trả đúng scope | not_started |

## Phase 06 — AppShell project mode và module layout

| Mã | Task | Phụ thuộc | Đầu ra và tiêu chí nghiệm thu | Trạng thái |
|---|---|---|---|---|
| P06-T01 | Sửa workspace picker active state và chuyển route | P01-T03,P02-T03 | Bấm Nội Bộ → `/dashboard`; bấm Dự án → `/du-an/[projectId]`; refresh giữ đúng context | review |
| P06-T02 | Ẩn toàn bộ menu vị trí/nghiệp vụ Nội Bộ trong Project | P06-T01 | Project sidebar/search/mobile không hiện `/khach-hang`, `/lich-hen`, `/thu-chi`, `/luong`, `/nhan-su` legacy | review |
| P06-T03 | Chỉ render module link available/enabled của project | P03-T02 | Planned/blocked module không thành link; disable không xóa và không truy cập được | review |
| P06-T04 | Hoàn thiện project dashboard app-inside-app | P04-T05 | Header/context/breadcrumb/stats mang project; không hiển thị claim demo/trial | review |
| P06-T05 | Đồng bộ mobile drawer, bottom nav và collapsible groups | P06-T02 | Desktop/mobile đều ẩn/hiện đúng; group collapse vẫn hoạt động và có aria state | not_started |
| P06-T06 | Route/runtime smoke workspace shell | P06-T01,P06-T02 | Auth redirect không 500; active project route, invalid project và Internal route có kết quả đúng | not_started |

## Phase 07 — Kéo-thả cấu hình và Global Admin console

| Mã | Task | Phụ thuộc | Đầu ra và tiêu chí nghiệm thu | Trạng thái |
|---|---|---|---|---|
| P07-T01 | Tạo schema module layout/config version | P03-T02,P06-T03 | Order/group/default route lưu theo project; version và audit đầy đủ | not_started |
| P07-T02 | Xây UI kéo-thả module accessible | P07-T01,P06-T05 | Keyboard fallback, drag handle, preview trước khi lưu; không drag module planned | not_started |
| P07-T03 | Xây action save/preview/rollback layout | P07-T01,P02-T02 | Chỉ Admin hoặc capability hợp lệ; invalid key/duplicate/order bị reject | not_started |
| P07-T04 | Xây Global Admin console tổng hợp | P02-T02,P04-T05 | Admin thấy toàn bộ project với aggregate rõ nguồn; Manager không thấy trang global | not_started |
| P07-T05 | Tối ưu list/aggregate cho quy mô 1000 project | P07-T04 | Pagination/cursor/groupBy/index; không tải toàn bộ domain records vào memory một lần | not_started |
| P07-T06 | Test layout, global console và rollback | P07-T02,P07-T03,P07-T05 | Test Admin, Manager, stale version, disabled module và synthetic scale đều đạt | not_started |

## Phase 08 — AI global/project proposal và audit

| Mã | Task | Phụ thuộc | Đầu ra và tiêu chí nghiệm thu | Trạng thái |
|---|---|---|---|---|
| P08-T01 | Thêm AI GLOBAL context và global overview tool | P02-T05,P07-T04 | Admin hỏi tổng quan mọi project; tool dùng aggregate scoped, không nhầm snapshot Nội Bộ | not_started |
| P08-T02 | Cho AI Admin chọn một hoặc nhiều project mục tiêu | P08-T01,P02-T04 | Target project explicit, kiểm tra tồn tại/quyền; query batch theo project IDs | not_started |
| P08-T03 | Tạo configuration proposal schema | P07-T03,P08-T02 | Proposal có workspace, target, module, fields, before/after, risk, capability, rollback | not_started |
| P08-T04 | Nối preview → approval → apply có audit | P08-T03 | Không apply khi chưa approve; audit actor/target/version/result; lỗi không partial unsafe | not_started |
| P08-T05 | Khóa AI khỏi hành động nguy hiểm không đủ workflow | P08-T04 | Xóa/đuổi người/đổi quyền/deploy vẫn L5, two-person blocker hiển thị rõ | review |
| P08-T06 | Test AI INTERNAL/PROJECT/GLOBAL và prompt isolation | P08-T01,P08-T02,P08-T04 | AI không đọc chéo; GLOBAL chỉ Admin; preview/audit chứa đúng target; test không secret | not_started |

## Phase 09 — Dữ liệu giả, role testing và quality gates

| Mã | Task | Phụ thuộc | Đầu ra và tiêu chí nghiệm thu | Trạng thái |
|---|---|---|---|---|
| P09-T01 | Tạo seed QA nhiều project và nhiều role | P04-T06,P05-T06 | QA isolated có Admin, Manager A/B, dữ liệu giả P1/P2/P3; không dùng production credential | not_started |
| P09-T02 | Chạy walkthrough Admin Internal/Project/Global | P09-T01,P08-T06 | Admin chuyển workspace, xem dashboard/sales/task, cấu hình layout và AI overview | not_started |
| P09-T03 | Chạy walkthrough Manager assigned/unassigned | P09-T01,P02-T06 | Manager thấy đúng project, không thấy Internal menu khi ở Project và bị chặn foreign URL | not_started |
| P09-T04 | Kiểm thử module create/update/aggregate bằng dữ liệu giả | P09-T01,P04-T06,P05-T06 | Luồng sử dụng thật chạy end-to-end, totals khớp dữ liệu seed, không leak | not_started |
| P09-T05 | Chạy regression build/type/test/migration checks | P06-T06,P08-T06 | Prisma validate/generate, TypeScript, targeted/full Vitest, Next production build, migration status | not_started |
| P09-T06 | Ghi evidence và phân loại lỗi theo quality gate | P09-T02,P09-T03,P09-T04,P09-T05 | Mỗi task done có log/check; lỗi được ghi nguyên nhân và không che bằng claim hoàn tất | not_started |

## Phase 10 — Deploy, authenticated walkthrough và bàn giao

| Mã | Task | Phụ thuộc | Đầu ra và tiêu chí nghiệm thu | Trạng thái |
|---|---|---|---|---|
| P10-T01 | Chuẩn bị migration/release checklist và backup proof | P09-T05 | Có backup check, migration additive, không reset/down volume; release note chỉ nói điều đã test | not_started |
| P10-T02 | Chạy đúng `windows\\Sua-Loi.bat` trên checkout clinic | P10-T01 | Fetch master, giữ untracked/worktrees, build/recreate/migrate/health check; đạt `DA XONG` và exit 0 | not_started |
| P10-T03 | Hậu kiểm container, DB, HTTP và runtime logs | P10-T02 | App Ready, migration up to date, `/login` 200, route smoke không 500, DB/volume còn nguyên | not_started |
| P10-T04 | Authenticated walkthrough do owner đăng nhập, agent thao tác | P10-T03 | Owner chỉ nhập credential trong phiên; agent tự kiểm Admin/Manager flows, không đọc/copy password | not_started |
| P10-T05 | Cập nhật docs, checkpoint, changelog và source-of-truth SHA | P10-T04 | Handoff/architecture/README/VERSION/CHANGELOG phản ánh đúng; không secret/raw clinic data | not_started |
| P10-T06 | Push master cuối và lập biên bản bàn giao | P10-T05 | Local/origin SHA khớp, tree sạch ngoài artifact được phép giữ, 60 task có trạng thái và open blockers | not_started |

## Tiêu chí không được bỏ qua

Dự án chỉ được gọi là **vận hành thật** khi Customer, Appointment, Sales/Finance, Payroll/Mechanism và Task có project-local schema/action/UI/isolation evidence tương ứng. Có selector hoặc dashboard không đủ để chứng minh độc lập dữ liệu. Global Admin có quyền toàn cục không đồng nghĩa AI được bỏ qua scope, preview, approval hoặc audit. L5 two-person approval vẫn là blocker cho đến khi có workflow hai người thực sự.
