# Gap Register — Workspace V4

**Ngày kiểm tra:** 2026-08-27 GMT+7  
**Đối tượng:** `origin/master` tại `3bc85d1`  
**Chuẩn đối chiếu:** `docs/WORKSPACE-V3-REAL-PROJECT.md`, kế hoạch V4 60 task trong nhiệm vụ tham chiếu và mã nguồn thực tế.

## 1. Kết luận kiểm tra nhanh

Quality gate tĩnh của `origin/master` đã đạt: `prisma validate`, `prisma generate`, `tsc --noEmit`, toàn bộ Vitest và `next build` đều exit 0. Vitest ghi nhận **83 test files / 422 tests passed**. Kết quả này chỉ chứng minh code compile, unit/policy tests và production build; nó **chưa chứng minh** isolation trên database, quyền qua runtime đã đăng nhập, migration trên máy clinic hoặc AI không rơi nhầm sang dữ liệu Nội Bộ.

Dự án chưa đạt tiêu chí “Dự án vận hành độc lập hoàn toàn”. Nguyên nhân chính không phải thiếu route, mà là nhiều route đã tồn tại nhưng acceptance còn thiếu: layout chưa áp dụng thật, AI project chưa có business adapters, payroll chưa có payout/accounting local, isolation chủ yếu mới được suy ra từ where-clause/unit policy và chưa có authenticated runtime evidence.

## 2. Các gap ưu tiên cao

| ID | Task liên quan | Mức | Gap chưa đạt | Bằng chứng hiện tại | Điều kiện đóng |
|---|---|---|---|---|---|
| G-01 | P07-T01/T02/T03/T06 | Critical | Layout editor chỉ thao tác local rồi tạo proposal `LAYOUT` ở DRAFT. `applyWorkspaceConfigProposalAction` có tạo `ZWorkspaceConfigVersion` nhưng không cập nhật live navigation/layout cho nhánh `LAYOUT`; không có active-layout loader, apply/rollback UI và test end-to-end. | `web/src/components/v2-workspace-layout-editor.tsx:9-54`; `web/src/lib/v2-config-proposal-actions.ts:73-90` | Active layout được đọc ở shell/page; apply làm thay đổi menu theo version; rollback có UI; test stale/duplicate/disabled module và runtime pass. |
| G-02 | P08-T01/T02/T06; P02-T05 | Critical | GLOBAL context và `get_workspace_overview` đã nối cho Admin, nhưng AI project/global chưa có bộ business tools project-local. `actionHelp` vẫn liệt kê nhiều tool legacy; planner tự ghi tool clinic-global chưa có adapter project-local. | `web/src/app/(app)/tro-ly/agent.ts:242-277`, `:388-402` | PROJECT chỉ gọi adapter `ZWorkspace*` có projectId đã xác minh; GLOBAL aggregate và target project explicit; test prompt isolation + runtime Admin/Manager pass. |
| G-03 | P05-T04/T05/T06; P03-T06 | Critical | Payroll đã có create/calculate/preview/approve/second-approve/finalize/void và audit nhưng không tạo payout/accounting project-local, không liên kết settlement với reconciliation/ledger và chưa có authenticated evidence. | `web/src/lib/v2-payroll-actions.ts:20-54`; `web/src/lib/v2-payroll-governance-actions.ts:32-98` | Có quyết định owner về payout; nếu triển khai thì tạo model/action/UI local, immutable settlement, audit, rollback và test hai project; nếu chưa triển khai phải giữ module unavailable và ghi blocker rõ. |
| G-04 | P04-T06; P05-T06; P06-T06; P09-T02/T03/T04/T05 | Critical | Chưa có bằng chứng runtime đã đăng nhập cho Admin/Manager, foreign URL, revoke membership, module visibility, cross-project list/detail/aggregate hoặc AI GLOBAL/PROJECT. Unit tests pass không thay thế walkthrough authenticated. | Có các test policy/navigation; chưa có report authenticated runtime trong checkout audit | Tạo synthetic QA fixture không PII; chạy walkthrough Admin/Manager và lưu prompt/output/HTTP/side-effect evidence; không dùng credential production trong log. |
| G-05 | P10-T01/T02/T03/T04/T05/T06 | Critical | Chưa chứng minh migration V2 hiện tại đã chạy trên database clinic, backup/rollback và `windows\Sua-Loi.bat` sau `origin/master` mới. Checkout Windows đang `5d38fc0`, chậm origin 63 commit và có untracked artifacts. | Git status Windows; đặc tả yêu cầu deploy qua updater | Chỉ owner chạy updater sau backup và review release; hậu kiểm container, migration status, `/login`, routes, volume và SHA. Không tự reset/clean/pull trên checkout có untracked. |
| G-06 | Quản trị trạng thái | High | Workbook canonical được quy định trong skill không tồn tại ở `/home/ubuntu/task-memory/zenith-upgrade-execution`; kế hoạch 60 task chỉ có ở `.task-memory/zenithtasks-ai-governance-2026/` của checkout Windows và state đang untracked. Có nguy cơ lặp việc, lệch backlog và đánh dấu done không có evidence. | `canonical_paths.md`; Windows `.task-memory/...`; checkout origin thiếu thư mục này | Chọn một source-of-truth được owner chấp thuận, version-control hoặc lưu project file an toàn; cập nhật state/changelog/evidence sau mỗi task. |

## 3. Các gap chức năng và acceptance còn thiếu

| Task liên quan | Trạng thái audit | Nội dung chưa ổn |
|---|---|---|
| P02-T01/T05 | Một phần | Có `INTERNAL`, `PROJECT`, `GLOBAL` trong AI policy và sentinel `__GLOBAL__`, nhưng chưa phải một context contract xuyên suốt AppShell, route, action và AI. AppShell không có mục GLOBAL; GLOBAL được chọn qua query AI và console riêng. |
| P02-T02/T03/T04/T06 | Một phần | `requireProjectAccess` bảo vệ Admin/member active ở server, nhưng chưa có integration test chứng minh mọi action reject foreign `projectId`, missing `projectId`, revoked membership và không query dữ liệu trước khi deny. |
| P03-T01 | Một phần | Create project đặt `ACTIVE`, create sale/appointment chặn ARCHIVED, nhưng cần kiểm tra nhất quán mọi write action và lifecycle transition; chưa có audit/runtime proof cho DRAFT/ARCHIVED. |
| P03-T02; P07-T01 | Một phần | Config version/audit/rollback foundation có thật, nhưng LAYOUT version chưa điều khiển nav live; disabled module và version concurrency chưa được chứng minh end-to-end. |
| P03-T03; P04-T01/T02 | Gần đạt nhưng chưa đủ evidence | Customer có create/update/consent/archive, detail, appointment/sale history và audit local. Cần isolation DB test và authenticated walkthrough; plan cũ ghi `not_started` đã lỗi thời so với code. |
| P03-T04; P04-T03 | Một phần | Appointment có create, customer/member scope, conflict ±30 phút và status update. Chưa thấy workflow sửa đầy đủ thông tin lịch, transition policy chi tiết hoặc test runtime; status update cần rà lại hành vi trên project ARCHIVED. |
| P03-T05; P04-T04/T05 | Một phần | Sales có create, amount/paidAmount/status validation, period filter và aggregate. Chưa có update/void/audit lifecycle tương đương ledger, service/order snapshot đầy đủ và isolation evidence runtime. |
| P04-T06 | Chưa đạt acceptance | Có policy/unit tests nhưng chưa có test database synthetic với hai project dùng dữ liệu giống nhau để chứng minh list/detail/aggregate không đọc chéo. |
| P05-T01 | Một phần | Ledger local có create, aggregate và Admin void giữ lịch sử. Cần kiểm chứng link sale/project, immutable rule, role/capability và test concurrent/duplicate posting. |
| P05-T02 | Một phần | Reconciliation có UNMATCHED → MATCHED/EXCEPTION và UI. Cần kiểm chứng liên kết payment/sale/ledger cùng project, duplicate/mismatch/period và evidence runtime; không được hiểu là đã tích hợp Payment legacy. |
| P05-T03 | Gần đạt nhưng chưa đủ | Mechanism có DRAFT/version/test/activate theo project và rule trace unit tests. Cần gắn acceptance với payroll rule thực tế, active-version concurrency và runtime permission. |
| P05-T05 | Chưa đạt | Payroll/finance actions chưa có capability matrix riêng ngoài nhiều chỗ Admin-only; chưa có test wrong role, sensitive field và audit review đầy đủ. |
| P06-T01/T02/T03/T04 | Một phần | AppShell thay nav bằng project nav, project-only menu và Admin console có thật. Tuy nhiên nav không lấy layout version active; `available` registry và `enabledFeatures` chưa chứng minh disable/rollback live. |
| P06-T05 | Chưa đủ evidence | Có mobile drawer/collapse plumbing chung và `aria-expanded`; chưa có test/browser evidence cho mobile project mode, bottom navigation và group collapse. `preferredMobileHrefs` vẫn chứa legacy href, dù filter hiện loại các mục không có trong project nav. |
| P06-T06 | Chưa đạt acceptance | Chưa có authenticated smoke cho `/du-an/[id]`, invalid project, Internal route, direct legacy URL khi project active và auth redirect 500. |
| P07-T04/T05 | Một phần | `/du-an` đã là console có Admin/Manager scoping, search, cursor pagination, count aggregates page size 50. Chưa phải global analytics/read model giàu dữ liệu; cần test synthetic scale và xác nhận Manager không thấy global aggregate/audit ngoài membership. |
| P08-T03/T04 | Một phần | Project config proposal có DRAFT → APPROVED → APPLIED/REJECTED, audit và version. Schema chưa thể hiện đầy đủ proposal contract yêu cầu before/after field mapping, rollback capability/risk semantics cho mọi loại module; APPLY LAYOUT chưa có live effect. |
| P08-T05 | Một phần | L5/two-person block được policy chặn và message nêu workflow chưa nối trong AI dispatcher. Payroll có two-person approval riêng; chưa chứng minh mọi action nguy hiểm dùng cùng một policy và không có đường bypass. |
| P09-T01 | Chưa đạt | Chưa có QA seed multi-project/multi-role được kiểm chứng và tách khỏi clinic trong checkout origin. Không được dùng nút `V2DemoSeedButton` như bằng chứng vận hành thật; seed này tạo project tên demo và `demoOnly: true`. |
| P09-T02/T03/T04 | Chưa đạt | Chưa chạy walkthrough end-to-end Admin/Manager và create/update/aggregate bằng dữ liệu giả. |
| P09-T05 | Đạt local tĩnh, chưa đủ release gate | Đã pass Prisma/TS/Vitest/Next build trên origin; chưa có migration status/backup/deploy/HTTP/runtime evidence. |
| P09-T06 | Chưa đạt | Chưa có evidence matrix gắn từng task với check path, owner decision, next action và trạng thái canonical cập nhật. |
| P10-T01/T02/T03/T04/T05/T06 | Chưa đạt | Chưa có release/backup proof và owner-executed Windows updater trên commit `3bc85d1`; chưa được phép tự thực hiện thao tác có thể ảnh hưởng database clinic. |

## 4. Các vấn đề chất lượng cụ thể cần sửa hoặc quyết định

**Layout không có hiệu lực thật.** Đây là gap kỹ thuật rõ nhất có thể sửa trong branch audit: cần có active layout resolver dùng config version, validate order chỉ gồm module available/enabled, và để AppShell dùng order đó; proposal apply phải cập nhật hoặc tạo nguồn mà resolver đọc được. Nếu chưa muốn cho phép apply, UI phải nói rõ đây chỉ là draft và không được mô tả là layout đã cấu hình.

**AI vẫn mang nguy cơ nhầm scope.** Prompt đã cấm tool thiếu `projectId`, nhưng nhiều action help và execution path vẫn là tool legacy. Đây là rủi ro cấp Critical vì prompt không thay thế server-side adapter. Không được “sửa” bằng cách chỉ đổi câu chữ; phải tách registry tool theo workspace hoặc chặn tuyệt đối tool legacy khi `PROJECT/GLOBAL`, rồi thêm test dispatcher.

**Payroll đang đúng hướng an toàn nhưng chưa phải settlement vận hành.** Việc không tự tạo payout là an toàn, không phải bug. Tuy nhiên mục tiêu V4 yêu cầu payroll/commission local vận hành được; do đó cần owner decision: triển khai settlement local có approval/audit, hoặc giữ `payroll.available=false` và ghi blocker rõ. Không được bật payroll chỉ vì calculate/approve/finalize đã compile.

**Dữ liệu demo còn lẫn với định nghĩa production.** `v2-demo-actions.ts` và `V2DemoSeedButton` dùng project `CELLARISCA-DEMO`, `settings.demoOnly=true`. Công cụ này chỉ được phép ở QA/dev; cần kiểm tra feature flag, role, environment guard và UI copy để không xuất hiện trong workspace vận hành thật.

**Local checkout không ở cùng phiên bản.** Windows `master` là ancestor của origin nhưng chậm 63 commit và có `.task-memory/.../02_state.md`, `_qa-latest-candidate/`, `checks/test-task-isolation.sql`, `worktrees/` chưa track. Đây là blocker release, không phải lý do để xóa hoặc reset các tệp đó.

## 5. Hạng mục có thể bắt đầu sửa ngay trong branch audit

1. Tạo test và resolver cho active layout, sau đó nối navigation với layout đã APPLY nhưng vẫn giữ module capability/server guard.
2. Tách/khóa tool registry AI theo `INTERNAL`, `PROJECT`, `GLOBAL`; ít nhất phải có test rằng PROJECT không gọi legacy tool và GLOBAL chỉ gọi aggregate hoặc target project explicit.
3. Bổ sung integration-style tests với mocks Prisma cho foreign project, revoked member, archived writes, duplicate config version và reconciliation links.
4. Sửa copy/UI demo để chỉ xuất hiện trong QA/dev rõ ràng; không mở payroll available cho đến khi settlement decision/evidence đạt.

## 6. Những việc không được tự động làm trong đợt này

Không chạy migration trên database clinic, không reset database/volume, không chạy updater Windows, không nhập credential, không tạo transaction/lương thật, không xóa dữ liệu demo hoặc untracked artifact. Các bước deploy/authenticated walkthrough cần owner chủ động thực hiện sau khi branch đã có release candidate và backup proof.
